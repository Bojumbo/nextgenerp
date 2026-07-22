import os
import httpx
from io import BytesIO
from jinja2 import Environment, FileSystemLoader, Undefined
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.models.erp import DocInstance, DocRelation
from app.core.config import settings
from app.core.logging import logger

router = APIRouter(prefix="/print", tags=["Print"])

class SilentUndefined(Undefined):
    def __getattr__(self, key):
        return self
    def __str__(self):
        return ""
    def __repr__(self):
        return ""
    def __bool__(self):
        return False

# Resolve the templates directory absolute path relative to this file
TEMPLATES_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "templates"
)
jinja_env = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    undefined=SilentUndefined
)

@router.get("/pdf/{doctype_name}/{name}")
async def print_document_pdf(
    doctype_name: str,
    name: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Renders document with context dynamically and posts HTML to Express + Puppeteer PDF service.
    Returns binary PDF stream.
    """
    # 1. Fetch document instance details
    inst_q = select(DocInstance).where(
        (DocInstance.doctype_name == doctype_name) &
        (DocInstance.name == name)
    )
    inst_res = await db.execute(inst_q)
    instance = inst_res.scalar_one_or_none()
    
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{name}' of type '{doctype_name}' not found"
        )
        
    logger.info("Printing document to PDF", doctype=doctype_name, name=name)
    
    # 2. Build default context structure
    # Seed document
    sales_data = instance.data.copy()
    sales_data["name"] = instance.name
    sales_data["created_at"] = (
        instance.created_at.strftime("%Y-%m-%d") if instance.created_at else ""
    )
    sales_data["status"] = sales_data.get("status", "Draft")
    sales_data["amount"] = sales_data.get("amount", 0.0)
    
    # Placeholders for linked entities (with null-safety defaults)
    customer_data = {}
    payment_data = {"amount": 0.0}
    
    # 3. Resolve linked entities via doc_relations
    rel_q = select(DocRelation).where(
        ((DocRelation.source_type == doctype_name) & (DocRelation.source_id == name)) |
        ((DocRelation.target_type == doctype_name) & (DocRelation.target_id == name))
    )
    rel_res = await db.execute(rel_q)
    relations = rel_res.scalars().all()
    
    for rel in relations:
        if rel.source_type == doctype_name and rel.source_id == name:
            ent_type = rel.target_type
            ent_id = rel.target_id
        else:
            ent_type = rel.source_type
            ent_id = rel.source_id
            
        ent_q = select(DocInstance).where(
            (DocInstance.doctype_name == ent_type) &
            (DocInstance.name == ent_id)
        )
        ent_res = await db.execute(ent_q)
        ent = ent_res.scalar_one_or_none()
        
        if ent:
            if ent_type == "Contact":
                customer_data = ent.data.copy()
                customer_data["name"] = ent.name
            elif ent_type == "PaymentEntry":
                payment_data = ent.data.copy()
                payment_data["name"] = ent.name
                
    # Compute balance
    sales_amount = float(sales_data.get("amount") or 0.0)
    paid_amount = float(payment_data.get("amount") or 0.0)
    balance = sales_amount - paid_amount
    
    context = {
        "sales": sales_data,
        "company": {"address": "123 ERP NextGen Way, Suite 100"},
        "customer": customer_data,
        "payment": payment_data,
        "balance": balance
    }
    
    # 4. Render HTML using Jinja2
    template_name = "sales_receipt.html"
    try:
        template = jinja_env.get_template(template_name)
        rendered_html = template.render(context)
    except Exception as e:
        logger.error("Jinja2 rendering failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to render document HTML: {str(e)}"
        )
        
    # 5. Forward rendered HTML to Puppeteer microservice
    pdf_render_url = f"{settings.PDF_SERVICE_URL}/render"
    logger.info("Forwarding HTML to Puppeteer render service", url=pdf_render_url)
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(pdf_render_url, json={"html": rendered_html})
            
        if resp.status_code != 200:
            logger.error("Puppeteer rendering failed", status=resp.status_code, body=resp.text)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Puppeteer service returned error: {resp.text}"
            )
            
        pdf_bytes = resp.content
    except Exception as e:
        logger.error("Failed to connect to Puppeteer service", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not connect to Puppeteer service: {str(e)}"
        )
        
    # 6. Stream binary response
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={doctype_name}_{name}.pdf"}
    )
