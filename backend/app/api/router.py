from fastapi import APIRouter
from app.api.endpoints import doctypes, documents, translations, print, auth, test

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(doctypes.router)
api_router.include_router(documents.router)
api_router.include_router(translations.router)
api_router.include_router(print.router)
api_router.include_router(auth.router)
api_router.include_router(test.router)
