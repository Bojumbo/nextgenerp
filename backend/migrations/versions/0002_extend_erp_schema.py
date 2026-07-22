"""extend erp schema

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-22 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Drop existing FKs from dependent tables targeting doc_types
    op.drop_constraint('doc_fields_doctype_name_fkey', 'doc_fields', type_='foreignkey')
    op.drop_constraint('doc_instances_doctype_name_fkey', 'doc_instances', type_='foreignkey')

    # 2. Rename tables
    op.rename_table('doc_types', 'doctypes')
    op.rename_table('doc_fields', 'docfields')

    # 3. Recreate foreign keys targeting doctypes
    op.create_foreign_key('docfields_doctype_name_fkey', 'docfields', 'doctypes', ['doctype_name'], ['name'], ondelete='CASCADE')
    op.create_foreign_key('doc_instances_doctype_name_fkey', 'doc_instances', 'doctypes', ['doctype_name'], ['name'], ondelete='RESTRICT')

    # 4. Alter doc_relations table
    # Drop old indexes
    op.drop_index('ix_doc_relations_parent', table_name='doc_relations')
    op.drop_index('ix_doc_relations_child', table_name='doc_relations')
    
    # Drop old columns
    op.drop_column('doc_relations', 'parent_doctype')
    op.drop_column('doc_relations', 'parent_name')
    op.drop_column('doc_relations', 'child_doctype')
    op.drop_column('doc_relations', 'child_name')

    # Add new polymorphic relation columns
    op.add_column('doc_relations', sa.Column('source_type', sa.String(length=255), nullable=False))
    op.add_column('doc_relations', sa.Column('source_id', sa.String(length=255), nullable=False))
    op.add_column('doc_relations', sa.Column('target_type', sa.String(length=255), nullable=False))
    op.add_column('doc_relations', sa.Column('target_id', sa.String(length=255), nullable=False))

    # Add new indexes
    op.create_index('ix_doc_relations_source', 'doc_relations', ['source_type', 'source_id'], unique=False)
    op.create_index('ix_doc_relations_target', 'doc_relations', ['target_type', 'target_id'], unique=False)

    # 5. Create roles table
    op.create_table(
        'roles',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    # 6. Create doc_permissions table
    op.create_table(
        'doc_permissions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('role_id', sa.UUID(), nullable=False),
        sa.Column('doctype_name', sa.String(length=255), nullable=False),
        sa.Column('create', sa.Boolean(), nullable=False),
        sa.Column('read', sa.Boolean(), nullable=False),
        sa.Column('write', sa.Boolean(), nullable=False),
        sa.Column('delete', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['doctype_name'], ['doctypes.name'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 7. Create field_permissions table
    op.create_table(
        'field_permissions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('role_id', sa.UUID(), nullable=False),
        sa.Column('doctype_name', sa.String(length=255), nullable=False),
        sa.Column('fieldname', sa.String(length=255), nullable=False),
        sa.Column('read', sa.Boolean(), nullable=False),
        sa.Column('write', sa.Boolean(), nullable=False),
        sa.Column('hidden', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['doctype_name'], ['doctypes.name'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 8. Create custom_translations table
    op.create_table(
        'custom_translations',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('language', sa.String(length=10), nullable=False),
        sa.Column('source_text', sa.String(length=1000), nullable=False),
        sa.Column('translated_text', sa.String(length=1000), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # 9. Create email_accounts table
    op.create_table(
        'email_accounts',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('email_address', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('imap_server', sa.String(length=255), nullable=False),
        sa.Column('imap_port', sa.Integer(), nullable=False),
        sa.Column('smtp_server', sa.String(length=255), nullable=False),
        sa.Column('smtp_port', sa.Integer(), nullable=False),
        sa.Column('use_ssl', sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email_address')
    )

    # 10. Create email_messages table
    op.create_table(
        'email_messages',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('email_account_id', sa.UUID(), nullable=False),
        sa.Column('sender', sa.String(length=255), nullable=False),
        sa.Column('recipient', sa.String(length=255), nullable=False),
        sa.Column('subject', sa.String(length=500), nullable=False),
        sa.Column('body', sa.String(length=10000), nullable=False),
        sa.Column('received_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.ForeignKeyConstraint(['email_account_id'], ['email_accounts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 11. Create automation_rules table
    op.create_table(
        'automation_rules',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('doctype_name', sa.String(length=255), nullable=False),
        sa.Column('event', sa.String(length=50), nullable=False),
        sa.Column('condition_code', sa.String(length=1000), nullable=True),
        sa.Column('action_code', sa.String(length=4000), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['doctype_name'], ['doctypes.name'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    # Drop tables
    op.drop_table('automation_rules')
    op.drop_table('email_messages')
    op.drop_table('email_accounts')
    op.drop_table('custom_translations')
    op.drop_table('field_permissions')
    op.drop_table('doc_permissions')
    op.drop_table('roles')

    # Revert doc_relations changes
    op.drop_index('ix_doc_relations_target', table_name='doc_relations')
    op.drop_index('ix_doc_relations_source', table_name='doc_relations')
    
    op.drop_column('doc_relations', 'target_id')
    op.drop_column('doc_relations', 'target_type')
    op.drop_column('doc_relations', 'source_id')
    op.drop_column('doc_relations', 'source_type')

    op.add_column('doc_relations', sa.Column('child_name', sa.VARCHAR(length=255), autoincrement=False, nullable=False))
    op.add_column('doc_relations', sa.Column('child_doctype', sa.VARCHAR(length=255), autoincrement=False, nullable=False))
    op.add_column('doc_relations', sa.Column('parent_name', sa.VARCHAR(length=255), autoincrement=False, nullable=False))
    op.add_column('doc_relations', sa.Column('parent_doctype', sa.VARCHAR(length=255), autoincrement=False, nullable=False))
    
    op.create_index('ix_doc_relations_child', 'doc_relations', ['child_doctype', 'child_name'], unique=False)
    op.create_index('ix_doc_relations_parent', 'doc_relations', ['parent_doctype', 'parent_name'], unique=False)

    # Revert rename tables
    op.drop_constraint('doc_instances_doctype_name_fkey', 'doc_instances', type_='foreignkey')
    op.drop_constraint('docfields_doctype_name_fkey', 'docfields', type_='foreignkey')
    
    op.rename_table('docfields', 'doc_fields')
    op.rename_table('doctypes', 'doc_types')

    # Recreate original keys targeting doc_types
    op.create_foreign_key('doc_instances_doctype_name_fkey', 'doc_instances', 'doc_types', ['doctype_name'], ['name'], ondelete='RESTRICT')
    op.create_foreign_key('doc_fields_doctype_name_fkey', 'doc_fields', 'doc_types', ['doctype_name'], ['name'], ondelete='CASCADE')
