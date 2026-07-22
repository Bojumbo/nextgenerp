import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, ForeignKey, Index, DateTime, Integer, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base

class Doctype(Base):
    __tablename__ = "doctypes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=True)
    description: Mapped[str] = mapped_column(String(500), nullable=True)
    module: Mapped[str] = mapped_column(String(100), nullable=True)

    fields: Mapped[list["Docfield"]] = relationship(
        "Docfield",
        back_populates="doctype",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    instances: Mapped[list["DocInstance"]] = relationship(
        "DocInstance",
        back_populates="doctype",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

class Docfield(Base):
    __tablename__ = "docfields"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    doctype_name: Mapped[str] = mapped_column(
        String(255),
        ForeignKey("doctypes.name", ondelete="CASCADE"),
        nullable=False,
    )
    fieldname: Mapped[str] = mapped_column(String(255), nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=True)
    fieldtype: Mapped[str] = mapped_column(String(50), nullable=False)  # Data, Select, Link, Float, Int, Check
    options: Mapped[str] = mapped_column(String(500), nullable=True)    # Options for dropdowns or target DocType
    reqd: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    read_only: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    hidden: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    doctype: Mapped["Doctype"] = relationship("Doctype", back_populates="fields")

class DocInstance(Base):
    __tablename__ = "doc_instances"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    doctype_name: Mapped[str] = mapped_column(
        String(255),
        ForeignKey("doctypes.name", ondelete="RESTRICT"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)  # e.g., SALES-0001
    data: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    owner: Mapped[str] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    doctype: Mapped["Doctype"] = relationship("Doctype", back_populates="instances")

class DocRelation(Base):
    __tablename__ = "doc_relations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_type: Mapped[str] = mapped_column(String(255), nullable=False)  # e.g. Sales
    source_id: Mapped[str] = mapped_column(String(255), nullable=False)    # e.g. SALES-0001
    target_type: Mapped[str] = mapped_column(String(255), nullable=False)  # e.g. PaymentEntry
    target_id: Mapped[str] = mapped_column(String(255), nullable=False)    # e.g. PAYMENT-0001
    relation_type: Mapped[str] = mapped_column(String(100), nullable=False)

    __table_args__ = (
        Index("ix_doc_relations_source", "source_type", "source_id"),
        Index("ix_doc_relations_target", "target_type", "target_id"),
    )

class Role(Base):
    __tablename__ = "roles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=True)

class DocPermission(Base):
    __tablename__ = "doc_permissions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    doctype_name: Mapped[str] = mapped_column(String(255), ForeignKey("doctypes.name", ondelete="CASCADE"), nullable=False)
    create: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    write: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    delete: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    role: Mapped["Role"] = relationship("Role")

class FieldPermission(Base):
    __tablename__ = "field_permissions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    doctype_name: Mapped[str] = mapped_column(String(255), ForeignKey("doctypes.name", ondelete="CASCADE"), nullable=False)
    fieldname: Mapped[str] = mapped_column(String(255), nullable=False)
    read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    write: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    hidden: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    role: Mapped["Role"] = relationship("Role")

class CustomTranslation(Base):
    __tablename__ = "custom_translations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    language: Mapped[str] = mapped_column(String(10), nullable=False)  # e.g., fr, de, es
    source_text: Mapped[str] = mapped_column(String(1000), nullable=False)
    translated_text: Mapped[str] = mapped_column(String(1000), nullable=False)

class EmailAccount(Base):
    __tablename__ = "email_accounts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email_address: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    imap_server: Mapped[str] = mapped_column(String(255), nullable=False)
    imap_port: Mapped[int] = mapped_column(Integer, default=993, nullable=False)
    smtp_server: Mapped[str] = mapped_column(String(255), nullable=False)
    smtp_port: Mapped[int] = mapped_column(Integer, default=465, nullable=False)
    use_ssl: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

class EmailMessage(Base):
    __tablename__ = "email_messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email_account_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("email_accounts.id", ondelete="CASCADE"), nullable=False)
    sender: Mapped[str] = mapped_column(String(255), nullable=False)
    recipient: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    body: Mapped[str] = mapped_column(String(10000), nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="Received", nullable=False)  # Received, Processed, Unresolved

    email_account: Mapped["EmailAccount"] = relationship("EmailAccount")

class AutomationRule(Base):
    __tablename__ = "automation_rules"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    doctype_name: Mapped[str] = mapped_column(String(255), ForeignKey("doctypes.name", ondelete="CASCADE"), nullable=False)
    event: Mapped[str] = mapped_column(String(50), nullable=False)  # on_create, on_update, on_delete, on_status_change
    condition_code: Mapped[str] = mapped_column(String(1000), nullable=True)
    action_code: Mapped[str] = mapped_column(String(4000), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    api_key: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    api_secret_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    doctype_scopes: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    role: Mapped["Role"] = relationship("Role")
