from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Dict, Any, List

from app.core.database import get_db
from app.models.erp import DocInstance, DocRelation
from app.core.logging import logger

router = APIRouter(prefix="/test", tags=["Seed Validation"])

@router.get("/validate-seed")
async def validate_database_seed(db: AsyncSession = Depends(get_db)):
    """
    GET /api/v1/test/validate-seed: Validates seed database consistency.
    Crawls and summarizes document counts, traverses polymorphic connections in doc_relations,
    and returns diagnostic status metrics.
    """
    # 1. Fetch all doc instances
    inst_res = await db.execute(select(DocInstance))
    instances = inst_res.scalars().all()
    
    # Track existing documents in a lookup map for validation
    doc_map = {(inst.doctype_name, inst.name): inst for inst in instances}
    
    # Calculate counts by doctype
    doctype_counts = {}
    for inst in instances:
        dt = inst.doctype_name
        doctype_counts[dt] = doctype_counts.get(dt, 0) + 1
        
    # 2. Fetch relations
    rel_res = await db.execute(select(DocRelation))
    relations = rel_res.scalars().all()
    
    # 3. Traversal checks
    validated_relations = []
    errors = []
    overall_valid = True
    
    for rel in relations:
        # Check source end
        source_exists = (rel.source_type, rel.source_id) in doc_map
        # Check target end
        target_exists = (rel.target_type, rel.target_id) in doc_map
        
        is_valid = source_exists and target_exists
        if not is_valid:
            overall_valid = False
            err_msg = (
                f"Broken Link: relation {rel.id} ({rel.relation_type}) links "
                f"Source '{rel.source_id}' ({rel.source_type}, exists={source_exists}) ➡️ "
                f"Target '{rel.target_id}' ({rel.target_type}, exists={target_exists})"
            )
            errors.append(err_msg)
            
        validated_relations.append({
            "id": str(rel.id),
            "relation_type": rel.relation_type,
            "source": {"type": rel.source_type, "id": rel.source_id, "exists": source_exists},
            "target": {"type": rel.target_type, "id": rel.target_id, "exists": target_exists},
            "is_valid": is_valid
        })
        
    summary = {
        "status": "valid" if overall_valid else "broken_links",
        "overall_valid": overall_valid,
        "total_documents": len(instances),
        "total_relations": len(relations),
        "documents_by_type": doctype_counts,
        "relations_checked": validated_relations,
        "broken_link_details": errors
    }
    
    logger.info("Executed seed validation audit", status=summary["status"], doc_count=len(instances))
    return summary
