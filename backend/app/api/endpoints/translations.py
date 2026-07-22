from typing import Dict, Any
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.models.erp import CustomTranslation
from app.schemas.erp import CustomTranslationCreate, CustomTranslationResponse
from app.core.logging import logger

router = APIRouter(prefix="/translations", tags=["Translations"])

@router.post("/import", status_code=status.HTTP_201_CREATED)
async def import_translations(
    payload: Dict[str, Any] = None, 
    db: AsyncSession = Depends(get_db)
):
    """
    POST /api/v1/translations/import
    Payload structure:
    {
        "language": "fr",
        "translations": {
            "Invoice Total": "Total Facture",
            "Status": "Statut",
            "Sales Order": "Commande de Vente"
        }
    }
    """
    # FastAPI doesn't parse Dict[str, Any] automatically with generic parameters unless using Pydantic,
    # let's write a simple parsing payload helper or generic pydantic schema.
    # To keep it extremely robust, let's parse manual dict properties.
    if not payload:
        return {"imported": 0}
        
    language = payload.get("language")
    translations = payload.get("translations", {})
    
    if not language or not translations:
        return {"imported": 0}
        
    count = 0
    for src, trans in translations.items():
        # Check if translation exists
        q = select(CustomTranslation).where(
            (CustomTranslation.language == language) &
            (CustomTranslation.source_text == src)
        )
        res = await db.execute(q)
        existing = res.scalar_one_or_none()
        
        if existing:
            existing.translated_text = trans
        else:
            new_trans = CustomTranslation(
                language=language,
                source_text=src,
                translated_text=trans
            )
            db.add(new_trans)
        count += 1
        
    await db.commit()
    logger.info("Imported translations success", language=language, count=count)
    return {"status": "success", "imported": count}

@router.post("/custom-fields", response_model=CustomTranslationResponse, status_code=status.HTTP_201_CREATED)
async def store_custom_field_translation(
    payload: CustomTranslationCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    POST /api/v1/translations/custom-fields
    """
    # Check if translation exists
    q = select(CustomTranslation).where(
        (CustomTranslation.language == payload.language) &
        (CustomTranslation.source_text == payload.source_text)
    )
    res = await db.execute(q)
    existing = res.scalar_one_or_none()
    
    if existing:
        existing.translated_text = payload.translated_text
        translation = existing
    else:
        translation = CustomTranslation(
            language=payload.language,
            source_text=payload.source_text,
            translated_text=payload.translated_text
        )
        db.add(translation)
        
    await db.commit()
    await db.refresh(translation)
    return translation
