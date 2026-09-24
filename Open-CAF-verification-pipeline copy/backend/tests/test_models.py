"""Unit Tests for Open CAF SQLAlchemy Models & Relationships."""
import uuid
import pytest
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.tenant import CouncilTenant, AuthorityType
from app.models.user import User, UserRole
from app.models.caf import Objective, Principle, ContributingOutcome, IGP, IGPLevel
from app.models.assessment import Assessment, AssessmentOutcome, AssessmentIGPCheck, AssessmentStatus, OutcomeStatus
from app.models.audit import AuditLog

@pytest.fixture(scope="function")
def db_session():
    """Provides a clean in-memory SQLite database session for model testing."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)

def test_council_tenant_creation(db_session):
    """Verifies council tenant model creation and defaults."""
    tenant = CouncilTenant(
        name="Borsetshire District Council",
        authority_type=AuthorityType.DISTRICT
    )
    db_session.add(tenant)
    db_session.commit()

    saved = db_session.query(CouncilTenant).filter_by(name="Borsetshire District Council").first()
    assert saved is not None
    assert saved.authority_type == AuthorityType.DISTRICT
    assert saved.id is not None
    assert saved.created_at is not None

def test_user_creation_and_tenant_relationship(db_session):
    """Verifies user creation, password hashing field, and tenant foreign key relationship."""
    tenant = CouncilTenant(name="Southshire County Council", authority_type=AuthorityType.COUNTY)
    db_session.add(tenant)
    db_session.commit()

    user = User(
        tenant_id=tenant.id,
        email="ciso@southshire.gov.uk",
        hashed_password="mocked_argon2_hash",
        full_name="Jane Doe",
        role=UserRole.CISO_ADMIN,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()

    saved_user = db_session.query(User).filter_by(email="ciso@southshire.gov.uk").first()
    assert saved_user is not None
    assert saved_user.tenant.name == "Southshire County Council"
    assert saved_user.role == UserRole.CISO_ADMIN
    assert len(tenant.users) == 1

def test_caf_hierarchy_structure(db_session):
    """Verifies Objective -> Principle -> ContributingOutcome -> IGP relationships."""
    # 1. Objective B: Protecting Against Cyber Attack
    obj_b = Objective(
        id="B",
        code="B",
        title="Protecting Against Cyber Attack",
        description="Managing risk of cyber attack affecting essential services."
    )
    db_session.add(obj_b)

    # 2. Principle B2: Identity and Access Control
    prin_b2 = Principle(
        id="B2",
        objective_id="B",
        code="B2",
        title="Identity and Access Control",
        description="Controlling logical access to network and information systems."
    )
    db_session.add(prin_b2)

    # 3. Contributing Outcome B2.a: Authentication
    outcome_b2a = ContributingOutcome(
        id="B2.a",
        principle_id="B2",
        code="B2.a",
        title="ID, Authentication and Access Control",
        description="The organisation understands and verifies user identity.",
        guidance_notes="Review MFA and password policies."
    )
    db_session.add(outcome_b2a)

    # 4. Indicators of Good Practice
    igp_achieved = IGP(
        outcome_id="B2.a",
        level=IGPLevel.ACHIEVED,
        description="Multi-factor authentication is mandatory on all remote access.",
        sort_order=1
    )
    igp_partially = IGP(
        outcome_id="B2.a",
        level=IGPLevel.PARTIALLY_ACHIEVED,
        description="MFA is enforced on privileged accounts only.",
        sort_order=2
    )
    db_session.add_all([igp_achieved, igp_partially])
    db_session.commit()

    # Query and assert traversal
    queried_obj = db_session.query(Objective).filter_by(id="B").first()
    assert len(queried_obj.principles) == 1
    assert queried_obj.principles[0].id == "B2"

    queried_outcome = db_session.query(ContributingOutcome).filter_by(id="B2.a").first()
    assert queried_outcome.principle.title == "Identity and Access Control"
    assert len(queried_outcome.igps) == 2
    assert queried_outcome.igps[0].level == IGPLevel.ACHIEVED

def test_assessment_and_outcomes_evaluation(db_session):
    """Verifies creating an Assessment, checking an outcome, and checking an IGP."""
    tenant = CouncilTenant(name="Midlands Borough Council", authority_type=AuthorityType.METROPOLITAN)
    db_session.add(tenant)

    obj = Objective(id="A", code="A", title="Managing Cyber Risk", description="Risk governance")
    prin = Principle(id="A1", objective_id="A", code="A1", title="Governance", description="Board governance")
    outcome = ContributingOutcome(id="A1.a", principle_id="A1", code="A1.a", title="Governance Framework", description="Cyber framework")
    igp = IGP(outcome_id="A1.a", level=IGPLevel.ACHIEVED, description="Regular board reporting")
    db_session.add_all([obj, prin, outcome, igp])
    db_session.commit()

    # Create Assessment
    assessment = Assessment(
        tenant_id=tenant.id,
        title="2026 Q1 Local Government Assurance",
        scope_description="Council Corporate Network & Social Care Datacenter",
        status=AssessmentStatus.IN_REVIEW,
        council_service_name="Adult Social Care"
    )
    db_session.add(assessment)
    db_session.commit()

    # Evaluate Outcome
    ass_outcome = AssessmentOutcome(
        assessment_id=assessment.id,
        outcome_id="A1.a",
        status=OutcomeStatus.ACHIEVED,
        assessor_rationale="Board receives monthly cyber resilience packs presented by the CISO."
    )
    db_session.add(ass_outcome)
    db_session.commit()

    # Record IGP check
    igp_check = AssessmentIGPCheck(
        assessment_outcome_id=ass_outcome.id,
        igp_id=igp.id,
        is_satisfied=True
    )
    db_session.add(igp_check)
    db_session.commit()

    # Verify relationships
    saved_assessment = db_session.query(Assessment).filter_by(id=assessment.id).first()
    assert len(saved_assessment.outcomes) == 1
    assert saved_assessment.outcomes[0].status == OutcomeStatus.ACHIEVED
    assert saved_assessment.outcomes[0].igp_checks[0].is_satisfied is True
    assert saved_assessment.outcomes[0].igp_checks[0].igp.description == "Regular board reporting"

def test_audit_log_tracking(db_session):
    """Verifies audit trail logging for changes."""
    tenant = CouncilTenant(name="Highland Council", authority_type=AuthorityType.UNITARY)
    db_session.add(tenant)
    db_session.commit()

    audit = AuditLog(
        tenant_id=tenant.id,
        action="ASSESSMENT_SUBMITTED",
        entity_type="Assessment",
        entity_id=str(uuid.uuid4()),
        payload_before={"status": "DRAFT"},
        payload_after={"status": "IN_REVIEW"}
    )
    db_session.add(audit)
    db_session.commit()

    saved_audit = db_session.query(AuditLog).filter_by(tenant_id=tenant.id).first()
    assert saved_audit is not None
    assert saved_audit.action == "ASSESSMENT_SUBMITTED"
    assert saved_audit.payload_after["status"] == "IN_REVIEW"
