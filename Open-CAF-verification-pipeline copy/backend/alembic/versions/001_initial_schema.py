"""Initial CAF v4.0 Schema & Tenancy

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-07 21:26:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Council Tenants
    op.create_table(
        'council_tenants',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False, unique=True),
        sa.Column('authority_type', sa.Enum('UNITARY', 'COUNTY', 'DISTRICT', 'METROPOLITAN', 'LONDON_BOROUGH', name='authoritytype'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_council_tenants_name', 'council_tenants', ['name'])

    # 2. Users
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('council_tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('role', sa.Enum('CISO_ADMIN', 'SECURITY_ASSESSOR', 'AUDITOR', 'CABINET_VIEWER', name='userrole'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_users_tenant_id', 'users', ['tenant_id'])
    op.create_index('ix_users_email', 'users', ['email'])

    # 3. Objectives
    op.create_table(
        'objectives',
        sa.Column('id', sa.String(10), primary_key=True),
        sa.Column('code', sa.String(10), nullable=False, unique=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
    )
    op.create_index('ix_objectives_code', 'objectives', ['code'])

    # 4. Principles
    op.create_table(
        'principles',
        sa.Column('id', sa.String(10), primary_key=True),
        sa.Column('objective_id', sa.String(10), sa.ForeignKey('objectives.id', ondelete='CASCADE'), nullable=False),
        sa.Column('code', sa.String(10), nullable=False, unique=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
    )
    op.create_index('ix_principles_objective_id', 'principles', ['objective_id'])
    op.create_index('ix_principles_code', 'principles', ['code'])

    # 5. Contributing Outcomes
    op.create_table(
        'contributing_outcomes',
        sa.Column('id', sa.String(20), primary_key=True),
        sa.Column('principle_id', sa.String(10), sa.ForeignKey('principles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('code', sa.String(20), nullable=False, unique=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('guidance_notes', sa.Text(), nullable=True),
    )
    op.create_index('ix_contributing_outcomes_principle_id', 'contributing_outcomes', ['principle_id'])
    op.create_index('ix_contributing_outcomes_code', 'contributing_outcomes', ['code'])

    # 6. Indicators of Good Practice (IGPs)
    op.create_table(
        'igps',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('outcome_id', sa.String(20), sa.ForeignKey('contributing_outcomes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('level', sa.Enum('ACHIEVED', 'PARTIALLY_ACHIEVED', 'NOT_ACHIEVED', name='igplevel'), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False, default=0),
    )
    op.create_index('ix_igps_outcome_id', 'igps', ['outcome_id'])

    # 7. Assessments
    op.create_table(
        'assessments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('council_tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('scope_description', sa.Text(), nullable=False),
        sa.Column('status', sa.Enum('DRAFT', 'IN_REVIEW', 'APPROVED', 'ARCHIVED', name='assessmentstatus'), nullable=False),
        sa.Column('council_service_name', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_assessments_tenant_id', 'assessments', ['tenant_id'])

    # 8. Assessment Outcomes
    op.create_table(
        'assessment_outcomes',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('assessment_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('assessments.id', ondelete='CASCADE'), nullable=False),
        sa.Column('outcome_id', sa.String(20), sa.ForeignKey('contributing_outcomes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.Enum('NOT_STARTED', 'ACHIEVED', 'PARTIALLY_ACHIEVED', 'NOT_ACHIEVED', name='outcomestatus'), nullable=False),
        sa.Column('assessor_rationale', sa.Text(), nullable=True),
        sa.Column('reviewer_notes', sa.Text(), nullable=True),
        sa.Column('assessed_at', sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint('assessment_id', 'outcome_id', name='uq_assessment_outcome'),
    )
    op.create_index('ix_assessment_outcomes_assessment_id', 'assessment_outcomes', ['assessment_id'])
    op.create_index('ix_assessment_outcomes_outcome_id', 'assessment_outcomes', ['outcome_id'])

    # 9. Assessment IGP Checks
    op.create_table(
        'assessment_igp_checks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('assessment_outcome_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('assessment_outcomes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('igp_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('igps.id', ondelete='CASCADE'), nullable=False),
        sa.Column('is_satisfied', sa.Boolean(), nullable=False, default=False),
        sa.UniqueConstraint('assessment_outcome_id', 'igp_id', name='uq_assessment_outcome_igp'),
    )
    op.create_index('ix_assessment_igp_checks_outcome_id', 'assessment_igp_checks', ['assessment_outcome_id'])
    op.create_index('ix_assessment_igp_checks_igp_id', 'assessment_igp_checks', ['igp_id'])

    # 10. Audit Logs
    op.create_table(
        'audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('council_tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('entity_type', sa.String(100), nullable=False),
        sa.Column('entity_id', sa.String(100), nullable=False),
        sa.Column('payload_before', sa.JSON(), nullable=True),
        sa.Column('payload_after', sa.JSON(), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_audit_logs_tenant_id', 'audit_logs', ['tenant_id'])
    op.create_index('ix_audit_logs_action', 'audit_logs', ['action'])
    op.create_index('ix_audit_logs_timestamp', 'audit_logs', ['timestamp'])

def downgrade() -> None:
    op.drop_table('audit_logs')
    op.drop_table('assessment_igp_checks')
    op.drop_table('assessment_outcomes')
    op.drop_table('assessments')
    op.drop_table('igps')
    op.drop_table('contributing_outcomes')
    op.drop_table('principles')
    op.drop_table('objectives')
    op.drop_table('users')
    op.drop_table('council_tenants')
    op.execute("DROP TYPE IF EXISTS outcomestatus;")
    op.execute("DROP TYPE IF EXISTS assessmentstatus;")
    op.execute("DROP TYPE IF EXISTS igplevel;")
    op.execute("DROP TYPE IF EXISTS userrole;")
    op.execute("DROP TYPE IF EXISTS authoritytype;")
