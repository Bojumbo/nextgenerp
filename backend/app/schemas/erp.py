import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict

# Renamed Field Schemas
class DocfieldBase(BaseModel):
    fieldname: str
    label: Optional[str] = None
    fieldtype: str  # Data, Select, Link, Float, Int, Check
    options: Optional[str] = None
    reqd: bool = False
    read_only: bool = False
    hidden: bool = False

class DocfieldCreate(DocfieldBase):
    pass

class DocfieldResponse(DocfieldBase):
    id: uuid.UUID
    doctype_name: str

    model_config = ConfigDict(from_attributes=True)

# Renamed Doctype Schemas
class DoctypeBase(BaseModel):
    name: str
    label: Optional[str] = None
    description: Optional[str] = None
    module: Optional[str] = None

class DoctypeCreate(DoctypeBase):
    fields: List[DocfieldCreate] = []

class DoctypeResponse(DoctypeBase):
    id: uuid.UUID
    fields: List[DocfieldResponse] = []

    model_config = ConfigDict(from_attributes=True)

# Document Instance Schemas
class DocInstanceBase(BaseModel):
    doctype_name: str
    name: str
    data: Dict[str, Any] = Field(default_factory=dict)
    owner: Optional[str] = None

class DocInstanceCreate(DocInstanceBase):
    pass

class DocumentCreatePayload(BaseModel):
    name: str
    data: Dict[str, Any] = Field(default_factory=dict)
    owner: Optional[str] = None

class DocInstanceUpdate(BaseModel):
    data: Dict[str, Any]

class DocInstanceResponse(DocInstanceBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Updated Polymorphic Relation Schemas
class DocRelationBase(BaseModel):
    source_type: str
    source_id: str
    target_type: str
    target_id: str
    relation_type: str

class DocRelationCreate(DocRelationBase):
    pass

class DocRelationResponse(DocRelationBase):
    id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)

# Roles
class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None

class RoleCreate(RoleBase):
    pass

class RoleResponse(RoleBase):
    id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)

# DocPermissions
class DocPermissionBase(BaseModel):
    role_id: uuid.UUID
    doctype_name: str
    create: bool = False
    read: bool = False
    write: bool = False
    delete: bool = False

class DocPermissionCreate(DocPermissionBase):
    pass

class DocPermissionResponse(DocPermissionBase):
    id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)

# FieldPermissions
class FieldPermissionBase(BaseModel):
    role_id: uuid.UUID
    doctype_name: str
    fieldname: str
    read: bool = False
    write: bool = False
    hidden: bool = False

class FieldPermissionCreate(FieldPermissionBase):
    pass

class FieldPermissionResponse(FieldPermissionBase):
    id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)

# Custom Translations
class CustomTranslationBase(BaseModel):
    language: str
    source_text: str
    translated_text: str

class CustomTranslationCreate(CustomTranslationBase):
    pass

class CustomTranslationResponse(CustomTranslationBase):
    id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)

# Email Accounts
class EmailAccountBase(BaseModel):
    email_address: str
    imap_server: str
    imap_port: int = 993
    smtp_server: str
    smtp_port: int = 465
    use_ssl: bool = True

class EmailAccountCreate(EmailAccountBase):
    password_hash: str

class EmailAccountResponse(EmailAccountBase):
    id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)

# Email Messages
class EmailMessageBase(BaseModel):
    email_account_id: uuid.UUID
    sender: str
    recipient: str
    subject: str
    body: str
    status: str = "Received"

class EmailMessageCreate(EmailMessageBase):
    pass

class EmailMessageResponse(EmailMessageBase):
    id: uuid.UUID
    received_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Automation Rules
class AutomationRuleBase(BaseModel):
    name: str
    doctype_name: str
    event: str
    condition_code: Optional[str] = None
    action_code: str
    is_active: bool = True

class AutomationRuleCreate(AutomationRuleBase):
    pass

class AutomationRuleResponse(AutomationRuleBase):
    id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)

# API Keys
class ApiKeyCreate(BaseModel):
    role_id: uuid.UUID
    doctype_scopes: list[str] = ["*"]

class ApiKeyResponse(BaseModel):
    id: uuid.UUID
    api_key: str
    api_secret: Optional[str] = None
    role_id: uuid.UUID
    doctype_scopes: list[str]
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
