import hashlib
import jwt
import datetime
from typing import Any, Dict, Optional, List
from fastapi import Header, Depends, HTTPException, status
from fastapi.security import HTTPBearer, APIKeyHeader, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.erp import Role, DocPermission, FieldPermission, Docfield, ApiKey
from app.core.logging import logger

# OAuth2/JWT Configurations
JWT_SECRET = "erp-nextgen-jwt-secret-key-123456"
JWT_ALGORITHM = "HS256"

security_bearer = HTTPBearer(auto_error=False)
security_api_key = APIKeyHeader(name="X-API-Key", auto_error=False)
security_api_secret = APIKeyHeader(name="X-API-Secret", auto_error=False)

def get_user_role(role_header: str | None = "Guest") -> str:
    """
    Extracts user role from header (mocked for simplicity, defaults to Guest or Admin).
    """
    return role_header or "Guest"

def create_access_token(role_name: str, scopes: List[str], expires_delta: int = 3600) -> str:
    """
    Generates a JWT OAuth2 Bearer Token.
    """
    payload = {
        "sub": role_name,
        "role": role_name,
        "doctype_scopes": scopes,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(seconds=expires_delta)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

class AuthContext:
    def __init__(self, role: str, scopes: List[str]):
        self.role = role
        self.scopes = scopes  # List of doctypes e.g. ["Sales", "Contact"] or ["*"]

async def get_current_auth(
    bearer: HTTPAuthorizationCredentials | None = Depends(security_bearer),
    api_key: str | None = Depends(security_api_key),
    api_secret: str | None = Depends(security_api_secret),
    x_user_role: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db)
) -> AuthContext:
    """
    Dependency that returns the current authenticated user context (role name and scopes).
    Evaluates Bearer Token first, then API Key, then falls back to X-User-Role.
    """
    # 1. OAuth2 Bearer Token validation
    if bearer:
        try:
            payload = jwt.decode(bearer.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            role = payload.get("role", "Guest")
            scopes = payload.get("doctype_scopes", ["*"])
            return AuthContext(role=role, scopes=scopes)
        except jwt.PyJWTError as e:
            logger.warn("OAuth2 token decode failure", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired OAuth2 Bearer Token"
            )

    # 2. API Key + Secret validation
    if api_key and api_secret:
        # Secure comparison of SHA256 hashed secret
        secret_hash = hashlib.sha256(api_secret.encode("utf-8")).hexdigest()
        q = select(ApiKey).where(
            (ApiKey.api_key == api_key) &
            (ApiKey.is_active == True)
        ).options(selectinload(ApiKey.role))
        res = await db.execute(q)
        db_key = res.scalar_one_or_none()

        if db_key and (db_key.api_secret_hash == secret_hash or db_key.api_secret_hash == api_secret):
            role_name = db_key.role.name
            scopes = db_key.doctype_scopes or ["*"]
            return AuthContext(role=role_name, scopes=scopes)
        else:
            logger.warn("Invalid API Key credentials", api_key=api_key)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API Key or Secret"
            )

    # 3. Fallback Header injection (backward compatibility)
    fallback_role = x_user_role or "Guest"
    return AuthContext(role=fallback_role, scopes=["*"])

class CheckDocPermission:
    def __init__(self, action: str):
        self.action = action  # "create", "read", "write", "delete"

    async def __call__(
        self,
        doctype_name: str,
        auth: AuthContext = Depends(get_current_auth),
        db: AsyncSession = Depends(get_db)
    ) -> str:
        role_name = auth.role
        
        # 1. Enforce API Key / OAuth2 Doctype scoping restrictions
        scopes = auth.scopes
        if scopes and "*" not in scopes and doctype_name not in scopes:
            logger.warn("Access denied: DocType outside credential scopes", doctype=doctype_name, scopes=scopes)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: credential scope restricts access to DocType '{doctype_name}'"
            )
            
        # Admin bypasses all security checks
        if role_name == "Admin":
            return role_name

        # 2. Fetch Role
        role_res = await db.execute(select(Role).where(Role.name == role_name))
        role = role_res.scalar_one_or_none()
        if not role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: role '{role_name}' is not registered in the system"
            )

        # 3. Query DocPermission
        perm_res = await db.execute(
            select(DocPermission).where(
                (DocPermission.role_id == role.id) &
                (DocPermission.doctype_name == doctype_name)
            )
        )
        perm = perm_res.scalar_one_or_none()
        if not perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: no permissions configured for role '{role_name}' on DocType '{doctype_name}'"
            )

        # 4. Check CRUD permission
        allowed = getattr(perm, self.action, False)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: role '{role_name}' does not have '{self.action}' permission on '{doctype_name}'"
            )

        return role_name

async def enforce_field_read_security(
    doctype_name: str,
    data: Dict[str, Any],
    role_name: str,
    db: AsyncSession
) -> Dict[str, Any]:
    """
    Strips hidden fields from output JSON based on role and field permissions.
    """
    if role_name == "Admin":
        return data

    # Fetch role
    role_res = await db.execute(select(Role).where(Role.name == role_name))
    role = role_res.scalar_one_or_none()
    if not role:
        return data

    # Fetch permissions
    perm_res = await db.execute(
        select(FieldPermission).where(
            (FieldPermission.role_id == role.id) &
            (FieldPermission.doctype_name == doctype_name)
        )
    )
    perms = perm_res.scalars().all()
    
    hidden_fields = {p.fieldname for p in perms if p.hidden or not p.read}

    # Hide default fields that are marked hidden in docfields
    df_res = await db.execute(select(Docfield).where(Docfield.doctype_name == doctype_name))
    docfields = df_res.scalars().all()
    for df in docfields:
        if df.hidden:
            override = next((p for p in perms if p.fieldname == df.fieldname), None)
            if not override or override.hidden or not override.read:
                hidden_fields.add(df.fieldname)

    secured_data = {}
    for key, val in data.items():
        if key in hidden_fields:
            continue
        secured_data[key] = val

    return secured_data

async def enforce_field_write_security(
    doctype_name: str,
    incoming_data: Dict[str, Any],
    existing_data: Dict[str, Any] | None,
    role_name: str,
    db: AsyncSession
):
    """
    Blocks modifications to read-only fields per role.
    """
    if role_name == "Admin":
        return

    # Fetch role
    role_res = await db.execute(select(Role).where(Role.name == role_name))
    role = role_res.scalar_one_or_none()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: role '{role_name}' is not registered in the system"
        )

    # Fetch permissions
    perm_res = await db.execute(
        select(FieldPermission).where(
            (FieldPermission.role_id == role.id) &
            (FieldPermission.doctype_name == doctype_name)
        )
    )
    perms = perm_res.scalars().all()

    readonly_fields = {p.fieldname for p in perms if not p.write}

    # Default docfields read_only behavior
    df_res = await db.execute(select(Docfield).where(Docfield.doctype_name == doctype_name))
    docfields = df_res.scalars().all()
    for df in docfields:
        if df.read_only:
            override = next((p for p in perms if p.fieldname == df.fieldname), None)
            if not override or not override.write:
                readonly_fields.add(df.fieldname)

    for key, new_val in incoming_data.items():
        if key in readonly_fields:
            if existing_data is None or existing_data.get(key) != new_val:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied: Field '{key}' is read-only for role '{role_name}'"
                )
