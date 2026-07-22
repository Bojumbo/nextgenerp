from typing import List
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.erp import Doctype, Docfield, CustomTranslation
from app.schemas.erp import DoctypeCreate, DoctypeResponse
from app.core.logging import logger

router = APIRouter(prefix="/doctypes", tags=["DocTypes"])

def parse_accept_language(accept_language: str | None) -> str | None:
    if not accept_language:
        return None
    try:
        # Extract primary language code, e.g. "fr-FR" -> "fr"
        first_lang = accept_language.split(",")[0].split(";")[0].strip()
        if "-" in first_lang:
            return first_lang.split("-")[0].lower()
        return first_lang.lower()
    except Exception:
        return None

async def localize_doctypes(
    doctypes: List[Doctype] | Doctype,
    accept_language: str | None,
    db: AsyncSession
):
    lang = parse_accept_language(accept_language)
    if not lang:
        return
        
    # Fetch translations for the requested language
    res = await db.execute(
        select(CustomTranslation).where(CustomTranslation.language == lang)
    )
    translations = res.scalars().all()
    
    trans_map = {t.source_text: t.translated_text for t in translations}
    if not trans_map:
        return
        
    dt_list = doctypes if isinstance(doctypes, list) else [doctypes]
    
    for dt in dt_list:
        if dt.label in trans_map:
            dt.label = trans_map[dt.label]
        if dt.description in trans_map:
            dt.description = trans_map[dt.description]
            
        for field in dt.fields:
            if field.label in trans_map:
                field.label = trans_map[field.label]

@router.post("", response_model=DoctypeResponse, status_code=status.HTTP_201_CREATED)
async def create_doctype(payload: DoctypeCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Doctype).where(Doctype.name == payload.name))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"DocType with name '{payload.name}' already exists"
        )
    
    doctype = Doctype(
        name=payload.name,
        label=payload.label or payload.name,
        description=payload.description,
        module=payload.module,
    )
    db.add(doctype)
    await db.flush()
    
    for f in payload.fields:
        field = Docfield(
            doctype_name=doctype.name,
            fieldname=f.fieldname,
            label=f.label or f.fieldname,
            fieldtype=f.fieldtype,
            options=f.options,
            reqd=f.reqd,
            read_only=f.read_only,
            hidden=f.hidden
        )
        db.add(field)
    
    await db.commit()
    
    result = await db.execute(
        select(Doctype)
        .options(selectinload(Doctype.fields))
        .where(Doctype.name == payload.name)
    )
    return result.scalar_one()

@router.get("", response_model=List[DoctypeResponse])
async def list_doctypes(
    accept_language: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Doctype).options(selectinload(Doctype.fields)))
    doctypes = result.scalars().all()
    await localize_doctypes(doctypes, accept_language, db)
    return doctypes

@router.get("/{name}", response_model=DoctypeResponse)
async def get_doctype(
    name: str,
    accept_language: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Doctype)
        .options(selectinload(Doctype.fields))
        .where(Doctype.name == name)
    )
    doctype = result.scalar_one_or_none()
    if not doctype:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"DocType '{name}' not found"
        )
    await localize_doctypes(doctype, accept_language, db)
    return doctype
