"""add api keys table

Revision ID: 0003
Revises: 0002
Create Date: 2026-07-22 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'api_keys',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('api_key', sa.String(length=255), nullable=False),
        sa.Column('api_secret_hash', sa.String(length=255), nullable=False),
        sa.Column('role_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('doctype_scopes', postgresql.JSONB(as_uuid=True), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('api_key')
    )
    op.create_index('ix_api_keys_api_key', 'api_keys', ['api_key'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_api_keys_api_key', table_name='api_keys')
    op.drop_table('api_keys')
