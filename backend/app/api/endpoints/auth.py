import secrets
import hashlib
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.erp import ApiKey, Role
from app.schemas.erp import ApiKeyCreate, ApiKeyResponse
from app.core.security import create_access_token, get_current_auth, AuthContext
from app.core.logging import logger

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/keys", response_model=ApiKeyResponse, status_code=status.HTTP_201_CREATED)
async def generate_api_key(
    payload: ApiKeyCreate,
    auth: AuthContext = Depends(get_current_auth),
    db: AsyncSession = Depends(get_db)
):
    """
    POST /api/v1/auth/keys: Generates a scoped client API Key (Key + Secret pair).
    Only users with Admin role can issue API keys.
    """
    if not auth or auth.role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only Admins can generate API Keys"
        )

    # Verify role exists
    role_res = await db.execute(select(Role).where(Role.id == payload.role_id))
    role = role_res.scalar_one_or_none()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role with ID '{payload.role_id}' does not exist"
        )

    # Generate key and secret
    client_key = "key_" + secrets.token_hex(16)
    client_secret = "sec_" + secrets.token_hex(24)
    secret_hash = hashlib.sha256(client_secret.encode("utf-8")).hexdigest()

    db_key = ApiKey(
        api_key=client_key,
        api_secret_hash=secret_hash,
        role_id=payload.role_id,
        doctype_scopes=payload.doctype_scopes,
        is_active=True
    )
    db.add(db_key)
    await db.commit()
    await db.refresh(db_key)

    response = ApiKeyResponse(
        id=db_key.id,
        api_key=db_key.api_key,
        api_secret=client_secret,  # return raw secret once
        role_id=db_key.role_id,
        doctype_scopes=db_key.doctype_scopes,
        is_active=db_key.is_active
    )
    logger.info("Successfully generated API Key", key_id=str(db_key.id), role=role.name)
    return response

@router.post("/token")
async def issue_oauth2_token(
    grant_type: str = Form(default="client_credentials"),
    client_id: str = Form(...),
    client_secret: str = Form(...),
    db: AsyncSession = Depends(get_db)
):
    """
    POST /api/v1/auth/token: Exchange API Key and Secret for an OAuth2 Bearer Token (JWT).
    Supports client_credentials grant type.
    """
    if grant_type != "client_credentials":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported grant_type. Use 'client_credentials'."
        )

    secret_hash = hashlib.sha256(client_secret.encode("utf-8")).hexdigest()
    
    q = select(ApiKey).where(
        (ApiKey.api_key == client_id) &
        (ApiKey.is_active == True)
    ).options(selectinload(ApiKey.role))
    
    res = await db.execute(q)
    db_key = res.scalar_one_or_none()

    if not db_key or db_key.api_secret_hash != secret_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid client_id (API Key) or client_secret"
        )

    # Generate JWT Bearer Token
    role_name = db_key.role.name
    scopes = db_key.doctype_scopes or ["*"]
    
    access_token = create_access_token(role_name=role_name, scopes=scopes)
    
    logger.info("Issued JWT Bearer token", api_key=client_id, role=role_name)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 3600
    }
