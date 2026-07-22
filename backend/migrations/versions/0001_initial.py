"""initial migration

Revision ID: 0001
Revises: 
Create Date: 2026-07-22 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. doc_types
    op.create_table(
        'doc_types',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('label', sa.String(length=255), nullable=True),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('module', sa.String(length=100), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    # 2. doc_fields
    op.create_table(
        'doc_fields',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('doctype_name', sa.String(length=255), nullable=False),
        sa.Column('fieldname', sa.String(length=255), nullable=False),
        sa.Column('label', sa.String(length=255), nullable=True),
        sa.Column('fieldtype', sa.String(length=50), nullable=False),
        sa.Column('options', sa.String(length=500), nullable=True),
        sa.Column('reqd', sa.Boolean(), nullable=False),
        sa.Column('read_only', sa.Boolean(), nullable=False),
        sa.Column('hidden', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['doctype_name'], ['doc_types.name'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 3. doc_instances
    op.create_table(
        'doc_instances',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('doctype_name', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('data', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('owner', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['doctype_name'], ['doc_types.name'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    # 4. doc_relations
    op.create_table(
        'doc_relations',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('parent_doctype', sa.String(length=255), nullable=False),
        sa.Column('parent_name', sa.String(length=255), nullable=False),
        sa.Column('child_doctype', sa.String(length=255), nullable=False),
        sa.Column('child_name', sa.String(length=255), nullable=False),
        sa.Column('relation_type', sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_doc_relations_parent', 'doc_relations', ['parent_doctype', 'parent_name'], unique=False)
    op.create_index('ix_doc_relations_child', 'doc_relations', ['child_doctype', 'child_name'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_doc_relations_child', table_name='doc_relations')
    op.drop_index('ix_doc_relations_parent', table_name='doc_relations')
    op.drop_table('doc_relations')
    op.drop_table('doc_instances')
    op.drop_table('doc_fields')
    op.drop_table('doc_types')
