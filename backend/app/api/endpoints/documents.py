import json
import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Header, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.models.erp import DocInstance, Doctype, Docfield, DocRelation
from app.schemas.erp import (
    DocumentCreatePayload,
    DocInstanceResponse,
    DocInstanceUpdate,
    DocRelationCreate,
    DocRelationResponse
)
from app.core.security import (
    get_user_role,
    enforce_field_read_security,
    enforce_field_write_security,
    CheckDocPermission
)
from app.core.logging import logger
from app.core.automation import trigger_automations

router = APIRouter(prefix="/documents", tags=["Documents"])

async def validate_document_data(doctype_name: str, data: Dict[str, Any], db: AsyncSession) -> List[Docfield]:
    # 1. Fetch dynamic field schemas for this doctype
    res = await db.execute(
        select(Docfield).where(Docfield.doctype_name == doctype_name)
    )
    fields = res.scalars().all()
    
    # Check if doctype exists
    dt_res = await db.execute(select(Doctype).where(Doctype.name == doctype_name))
    if not dt_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"DocType '{doctype_name}' not found"
        )

    # 2. Check for missing required fields
    for field in fields:
        if field.reqd and field.fieldname not in data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Field '{field.fieldname}' is required for DocType '{doctype_name}'"
            )

    # 3. Perform type validations and coercions
    for field in fields:
        fieldname = field.fieldname
        if fieldname not in data:
            continue
            
        val = data[fieldname]
        if val is None:
            continue
            
        ft = field.fieldtype
        
        if ft == "Data":
            if not isinstance(val, (str, int, float, bool)):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Field '{fieldname}' must be a plain string (Data type)"
                )
            data[fieldname] = str(val)
            
        elif ft == "Int":
            try:
                data[fieldname] = int(val)
            except (ValueError, TypeError):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Field '{fieldname}' must be an Integer"
                )
                
        elif ft == "Float":
            try:
                data[fieldname] = float(val)
            except (ValueError, TypeError):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Field '{fieldname}' must be a Float"
                )
                
        elif ft == "Select":
            options = [o.strip() for o in (field.options or "").split(",") if o.strip()]
            if str(val) not in options:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Field '{fieldname}' value '{val}' is not a valid option. Allowed: {options}"
                )
            data[fieldname] = str(val)
            
        elif ft == "Link":
            target_doctype = field.options
            if not target_doctype:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Link field '{fieldname}' is missing target DocType options metadata"
                )
            
            # Verify target document exists
            inst_q = select(DocInstance).where(
                (DocInstance.doctype_name == target_doctype) &
                (DocInstance.name == str(val))
            )
            inst_res = await db.execute(inst_q)
            if not inst_res.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Link validation failed: referenced document '{val}' of type '{target_doctype}' does not exist"
                )
            data[fieldname] = str(val)
            
        elif ft == "Date":
            date_str = str(val)
            try:
                # Validate YYYY-MM-DD
                datetime.date.fromisoformat(date_str)
            except ValueError:
                try:
                    datetime.datetime.fromisoformat(date_str)
                except ValueError:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Field '{fieldname}' value '{val}' is not a valid ISO Date string (e.g. YYYY-MM-DD)"
                    )
            data[fieldname] = date_str
            
        elif ft == "JSON":
            if not isinstance(val, (dict, list)):
                if isinstance(val, str):
                    try:
                        data[fieldname] = json.loads(val)
                    except json.JSONDecodeError:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Field '{fieldname}' must be a valid JSON object/array string"
                        )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Field '{fieldname}' must be a JSON object or array"
                    )
                    
    return fields

async def validate_sales_completion(doc_name: str, new_data: Dict[str, Any], db: AsyncSession):
    status_val = new_data.get("status")
    if status_val == "Completed":
        sales_amount = float(new_data.get("amount", 0))

        # Check doc relations where Sales and PaymentEntry are connected
        q = select(DocRelation).where(
            (
                (DocRelation.source_type == "Sales") &
                (DocRelation.source_id == doc_name) &
                (DocRelation.target_type == "PaymentEntry")
            ) |
            (
                (DocRelation.target_type == "Sales") &
                (DocRelation.target_id == doc_name) &
                (DocRelation.source_type == "PaymentEntry")
            )
        )
        res = await db.execute(q)
        relations = res.scalars().all()

        if not relations:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Sales document '{doc_name}' cannot transition to 'Completed' status. "
                       f"A linked PaymentEntry document must exist in doc_relations."
            )

        total_paid = 0.0
        for rel in relations:
            pay_name = rel.target_id if rel.source_id == doc_name else rel.source_id
            pay_q = select(DocInstance).where(
                (DocInstance.doctype_name == "PaymentEntry") &
                (DocInstance.name == pay_name)
            )
            pay_res = await db.execute(pay_q)
            pay_inst = pay_res.scalar_one_or_none()
            if pay_inst:
                total_paid += float(pay_inst.data.get("amount", 0))

        if total_paid < sales_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Sales document '{doc_name}' cannot transition to 'Completed' status. "
                       f"Required payment: ${sales_amount:.2f}. Total paid via linked PaymentEntry: ${total_paid:.2f}."
            )

@router.post("/relations", response_model=DocRelationResponse, status_code=status.HTTP_201_CREATED)
async def create_relation(payload: DocRelationCreate, db: AsyncSession = Depends(get_db)):
    parent_q = select(DocInstance).where(
        (DocInstance.doctype_name == payload.source_type) & 
        (DocInstance.name == payload.source_id)
    )
    parent_res = await db.execute(parent_q)
    if not parent_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Source document '{payload.source_id}' ({payload.source_type}) not found"
        )

    child_q = select(DocInstance).where(
        (DocInstance.doctype_name == payload.target_type) & 
        (DocInstance.name == payload.target_id)
    )
    child_res = await db.execute(child_q)
    if not child_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Target document '{payload.target_id}' ({payload.target_type}) not found"
        )

    relation = DocRelation(
        source_type=payload.source_type,
        source_id=payload.source_id,
        target_type=payload.target_type,
        target_id=payload.target_id,
        relation_type=payload.relation_type
    )
    db.add(relation)
    await db.commit()
    await db.refresh(relation)
    return relation

@router.get("/relations/{doctype_name}/{name}", response_model=List[DocRelationResponse])
async def list_relations(doctype_name: str, name: str, db: AsyncSession = Depends(get_db)):
    q = select(DocRelation).where(
        ((DocRelation.source_type == doctype_name) & (DocRelation.source_id == name)) |
        ((DocRelation.target_type == doctype_name) & (DocRelation.target_id == name))
    )
    res = await db.execute(q)
    return res.scalars().all()

@router.post("/ingest-email", status_code=status.HTTP_202_ACCEPTED)
async def ingest_email(payload: Dict[str, Any], request: Request):
    arq_pool = request.app.state.arq_pool
    if not arq_pool:
        raise HTTPException(status_code=503, detail="ARQ worker queue not available")
        
    job = await arq_pool.enqueue_job(
        "process_email_pipeline",
        sender_email=payload.get("sender_email"),
        subject=payload.get("subject"),
        body=payload.get("body")
    )
    return {"status": "queued", "job_id": job.job_id}

@router.post("/relation", response_model=DocRelationResponse, status_code=status.HTTP_201_CREATED)
async def create_relation_singular(payload: DocRelationCreate, db: AsyncSession = Depends(get_db)):
    """
    POST /api/v1/documents/relation: Singular endpoint requested to create generic relations.
    """
    return await create_relation(payload, db)

async def resolve_linked_graph_dfs(
    doctype: str,
    name: str,
    db: AsyncSession,
    visited_docs: set,
    visited_rels: set
) -> tuple[list[DocInstance], list[DocRelation]]:
    nodes = []
    edges = []
    
    doc_key = (doctype, name)
    if doc_key in visited_docs:
        return nodes, edges
    visited_docs.add(doc_key)
    
    # 1. Fetch details of current document instance
    inst_q = select(DocInstance).where(
        (DocInstance.doctype_name == doctype) &
        (DocInstance.name == name)
    )
    inst_res = await db.execute(inst_q)
    instance = inst_res.scalar_one_or_none()
    if instance:
        nodes.append(instance)
        
    # 2. Query direct relations (source or target)
    rel_q = select(DocRelation).where(
        ((DocRelation.source_type == doctype) & (DocRelation.source_id == name)) |
        ((DocRelation.target_type == doctype) & (DocRelation.target_id == name))
    )
    rel_res = await db.execute(rel_q)
    relations = rel_res.scalars().all()
    
    for rel in relations:
        if rel.id in visited_rels:
            continue
        visited_rels.add(rel.id)
        edges.append(rel)
        
        # Traverse neighbor
        if rel.source_type == doctype and rel.source_id == name:
            next_type = rel.target_type
            next_id = rel.target_id
        else:
            next_type = rel.source_type
            next_id = rel.source_id
            
        sub_nodes, sub_edges = await resolve_linked_graph_dfs(next_type, next_id, db, visited_docs, visited_rels)
        nodes.extend(sub_nodes)
        edges.extend(sub_edges)
        
    return nodes, edges

@router.get("/graph/{doctype_name}/{name}")
async def get_document_graph(
    doctype_name: str,
    name: str,
    db: AsyncSession = Depends(get_db)
):
    """
    GET /api/v1/documents/graph/{doctype_name}/{name}: Recursive graph resolver endpoint.
    """
    visited_docs = set()
    visited_rels = set()
    nodes, edges = await resolve_linked_graph_dfs(doctype_name, name, db, visited_docs, visited_rels)
    
    return {
        "nodes": [
            {
                "id": node.id,
                "doctype_name": node.doctype_name,
                "name": node.name,
                "data": node.data,
                "owner": node.owner,
                "created_at": node.created_at,
                "updated_at": node.updated_at
            }
            for node in nodes
        ],
        "edges": [
            {
                "id": edge.id,
                "source_type": edge.source_type,
                "source_id": edge.source_id,
                "target_type": edge.target_type,
                "target_id": edge.target_id,
                "relation_type": edge.relation_type
            }
            for edge in edges
        ]
    }

@router.post("/{doctype_name}", response_model=DocInstanceResponse, status_code=status.HTTP_201_CREATED)
async def create_document(
    doctype_name: str,
    payload: DocumentCreatePayload,
    request: Request,
    role: str = Depends(CheckDocPermission("create")),
    db: AsyncSession = Depends(get_db)
):
    logger.info("Creating document", doctype=doctype_name, name=payload.name, role=role)

    # 1. Enforce validation schema
    fields = await validate_document_data(doctype_name, payload.data, db)

    # 2. Check if name is unique
    existing_res = await db.execute(
        select(DocInstance).where(DocInstance.name == payload.name)
    )
    if existing_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Document instance with name '{payload.name}' already exists"
        )

    # 3. Enforce write field security (asynchronous checks)
    await enforce_field_write_security(doctype_name, payload.data, None, role, db)

    # 4. Enforce Sales completion if trying to create as Completed
    if doctype_name == "Sales":
        await validate_sales_completion(payload.name, payload.data, db)

    instance = DocInstance(
        doctype_name=doctype_name,
        name=payload.name,
        data=payload.data,
        owner=payload.owner or "system"
    )
    db.add(instance)
    await db.commit()
    await db.refresh(instance)

    # Trigger OnCreate Automations
    try:
        await trigger_automations(doctype_name, "OnCreate", instance, db)
        await db.refresh(instance)
    except Exception as ae:
        logger.error("Failed to run OnCreate automations", error=str(ae))

    # 5. Filter output read security (asynchronous checks)
    instance.data = await enforce_field_read_security(doctype_name, instance.data, role, db)
    return instance

@router.get("/{doctype_name}", response_model=List[DocInstanceResponse])
async def list_documents(
    doctype_name: str,
    role: str = Depends(CheckDocPermission("read")),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(DocInstance).where(DocInstance.doctype_name == doctype_name)
    )
    instances = result.scalars().all()

    for inst in instances:
        inst.data = await enforce_field_read_security(doctype_name, inst.data, role, db)
        
    return instances

@router.get("/{doctype_name}/{name}", response_model=DocInstanceResponse)
async def get_document(
    doctype_name: str,
    name: str,
    role: str = Depends(CheckDocPermission("read")),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(DocInstance)
        .where((DocInstance.doctype_name == doctype_name) & (DocInstance.name == name))
    )
    instance = result.scalar_one_or_none()
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{name}' of type '{doctype_name}' not found"
        )

    instance.data = await enforce_field_read_security(doctype_name, instance.data, role, db)
    return instance

@router.put("/{doctype_name}/{name}", response_model=DocInstanceResponse)
async def update_document(
    doctype_name: str,
    name: str,
    payload: DocInstanceUpdate,
    role: str = Depends(CheckDocPermission("write")),
    db: AsyncSession = Depends(get_db)
):
    # 1. Fetch current instance
    result = await db.execute(
        select(DocInstance)
        .where((DocInstance.doctype_name == doctype_name) & (DocInstance.name == name))
    )
    instance = result.scalar_one_or_none()
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{name}' not found"
        )

    # 2. Get fields definitions
    await validate_document_data(doctype_name, payload.data, db)

    # 3. Enforce write field security (asynchronous checks)
    await enforce_field_write_security(doctype_name, payload.data, instance.data, role, db)

    # 4. Enforce Sales completion logic if setting to Completed
    if doctype_name == "Sales":
        await validate_sales_completion(name, payload.data, db)

    # Track status transitions for OnStatusChange trigger
    old_status = instance.data.get("status")
    new_status = payload.data.get("status")

    instance.data = payload.data
    await db.commit()
    await db.refresh(instance)

    # Trigger Update Automations
    try:
        if old_status != new_status:
            await trigger_automations(doctype_name, "OnStatusChange", instance, db)
            await db.refresh(instance)
        await trigger_automations(doctype_name, "OnUpdate", instance, db)
        await db.refresh(instance)
    except Exception as ae:
        logger.error("Failed to run OnUpdate/OnStatusChange automations", error=str(ae))

    instance.data = await enforce_field_read_security(doctype_name, instance.data, role, db)
    return instance

