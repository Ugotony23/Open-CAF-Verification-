"""Idempotent Loader for Realistic Demo Council Assessment ('Borsetshire District Council')."""
import json
import logging
import hashlib
import uuid
from datetime import datetime, timezone, date, timedelta
from pathlib import Path
from typing import Dict, Any, List

from app.core.database import SyncSessionLocal, sync_engine, Base
from app.core.security import get_password_hash
from app.models.tenant import CouncilTenant, AuthorityType
from app.models.user import User, UserRole
from app.models.assessment import (
    Assessment,
    AssessmentOutcome,
    AssessmentIGPCheck,
    AssessmentStatus,
    OutcomeStatus,
)
from app.models.caf import Objective, Principle, ContributingOutcome, IGP
from app.models.evidence import Evidence, EvidenceCategory
from app.models.associations import EvidenceOutcomeLink
from app.models.remediation import RemediationTask, RemediationStatus, RemediationPriority
from app.cli.seed_caf import seed_caf_data
from app.cli.seed_council_services import seed_council_services_data

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def find_demo_file() -> Path:
    """Locate data/demo_council_data.json searching upwards from current working directory."""
    candidates = [
        Path.cwd() / "data" / "demo_council_data.json",
        Path.cwd().parent / "data" / "demo_council_data.json",
        Path(__file__).resolve().parent.parent.parent.parent / "data" / "demo_council_data.json",
    ]
    for p in candidates:
        if p.is_file():
            return p
    raise FileNotFoundError("Could not find data/demo_council_data.json in standard locations.")


def load_demo_council_data(session=None) -> Dict[str, Any]:
    """
    Parses demo_council_data.json and seeds Borsetshire District Council with
    39 evaluated outcomes, 8 linked evidence artifacts, 12 gaps, and 10 remediation tasks.
    """
    demo_file = find_demo_file()
    logger.info(f"Loading realistic demo council data from {demo_file}")

    with open(demo_file, "r", encoding="utf-8") as f:
        demo_data = json.load(f)

    close_session_at_end = False
    if session is None:
        try:
            Base.metadata.create_all(bind=sync_engine)
            session = SyncSessionLocal()
            close_session_at_end = True
        except Exception:
            logger.warning(
                "PostgreSQL connection not reachable on localhost:5432. "
                "Falling back to local SQLite database 'opencaf_dev.db'..."
            )
            from sqlalchemy import create_engine
            from sqlalchemy.orm import sessionmaker
            fallback_engine = create_engine("sqlite:///./opencaf_dev.db")
            Base.metadata.create_all(bind=fallback_engine)
            session = sessionmaker(bind=fallback_engine)()
            close_session_at_end = True
    else:
        Base.metadata.create_all(bind=session.get_bind())

    # Ensure CAF framework and council services are seeded
    seed_caf_data(session)
    seed_council_services_data(session)

    stats = {
        "council": 0,
        "users": 0,
        "assessment": 0,
        "evaluations_updated": 0,
        "evidence_created": 0,
        "evidence_links": 0,
        "remediation_tasks": 0,
    }

    try:
        # 1. Upsert Borsetshire District Council Tenant
        c_info = demo_data["council"]
        council = session.query(CouncilTenant).filter_by(name=c_info["name"]).first()
        if not council:
            council = CouncilTenant(
                name=c_info["name"],
                authority_type=AuthorityType.DISTRICT,
            )
            session.add(council)
            session.flush()
            stats["council"] += 1
            logger.info(f"Created Council Tenant: {council.name} ({council.id})")
        else:
            council.name = c_info["name"]
            session.flush()

        # Seed council services specifically for this council tenant
        seed_council_services_data(session=session, tenant_id=council.id)

        # 2. Upsert Demo CISO User
        demo_email = c_info.get("contact_email", "ciso@borsetshire.gov.uk")
        user = session.query(User).filter_by(email=demo_email).first()
        if not user:
            user = User(
                email=demo_email,
                full_name=c_info.get("contact_name", "Marcus Vance"),
                hashed_password=get_password_hash("Borsetshire2025!"),
                role=UserRole.CISO_ADMIN,
                tenant_id=council.id,
                is_active=True,
            )
            session.add(user)
            session.flush()
            stats["users"] += 1
            logger.info(f"Created Demo CISO User: {user.email}")

        # 3. Upsert Assessment
        ass_info = demo_data["assessment"]
        assessment = (
            session.query(Assessment)
            .filter_by(tenant_id=council.id, title=ass_info["title"])
            .first()
        )
        if not assessment:
            assessment = Assessment(
                tenant_id=council.id,
                title=ass_info["title"],
                scope_description=ass_info.get("scope_description", ""),
                status=AssessmentStatus.IN_REVIEW,
                council_service_name="Adult & Children's Social Care Case Management",
            )
            session.add(assessment)
            session.flush()
            stats["assessment"] += 1
            logger.info(f"Created Assessment: {assessment.title}")

        # 4. Initialize & Update 39 Outcome Evaluations
        outcomes = session.query(ContributingOutcome).all()
        eval_map: Dict[str, AssessmentOutcome] = {}
        for outcome in outcomes:
            ass_outcome = (
                session.query(AssessmentOutcome)
                .filter_by(assessment_id=assessment.id, outcome_id=outcome.id)
                .first()
            )
            if not ass_outcome:
                ass_outcome = AssessmentOutcome(
                    assessment_id=assessment.id,
                    outcome_id=outcome.id,
                    status=OutcomeStatus.NOT_STARTED,
                )
                session.add(ass_outcome)
                session.flush()

                # Create IGP check rows
                for igp in outcome.igps:
                    chk = AssessmentIGPCheck(
                        assessment_outcome_id=ass_outcome.id,
                        igp_id=igp.id,
                        is_satisfied=False,
                    )
                    session.add(chk)
                session.flush()

            eval_map[outcome.id] = ass_outcome

        # Apply realistic evaluations from demo dataset
        outcome_evals = demo_data.get("outcome_evaluations", {})
        for outcome_id, eval_data in outcome_evals.items():
            ass_outcome = eval_map.get(outcome_id)
            if ass_outcome:
                status_str = eval_data.get("status", "NOT_STARTED")
                ass_outcome.status = OutcomeStatus(status_str)
                ass_outcome.assessor_rationale = eval_data.get("rationale", "")

                # Mark corresponding IGPs checked
                checked_orders = eval_data.get("checked_igps", [])
                igps = session.query(IGP).filter_by(outcome_id=outcome_id).order_by(IGP.sort_order).all()
                for idx, igp in enumerate(igps, 1):
                    is_chk = idx in checked_orders
                    chk_row = (
                        session.query(AssessmentIGPCheck)
                        .filter_by(assessment_outcome_id=ass_outcome.id, igp_id=igp.id)
                        .first()
                    )
                    if chk_row:
                        chk_row.is_satisfied = is_chk
                    else:
                        session.add(
                            AssessmentIGPCheck(
                                assessment_outcome_id=ass_outcome.id,
                                igp_id=igp.id,
                                is_satisfied=is_chk,
                            )
                        )

                stats["evaluations_updated"] += 1

        session.flush()

        # 5. Upsert 8 Evidence Artifacts and Links
        evidence_records = demo_data.get("evidence_artifacts", [])
        for ev_info in evidence_records:
            fname = ev_info["filename"]
            evidence = (
                session.query(Evidence)
                .filter_by(tenant_id=council.id, file_name=fname)
                .first()
            )
            sha_mock = hashlib.sha256(fname.encode("utf-8")).hexdigest()

            if not evidence:
                evidence = Evidence(
                    tenant_id=council.id,
                    uploaded_by_user_id=user.id,
                    title=ev_info["title"],
                    file_name=fname,
                    file_size_bytes=1024 * 350,  # ~350 KB
                    mime_type="application/pdf",
                    sha256_hash=sha_mock,
                    file_path=f"evidence/{council.id}/{fname}",
                    category=EvidenceCategory(ev_info.get("category", "POLICY")),
                    valid_from=date.today() - timedelta(days=60),
                    valid_to=date.today() + timedelta(days=ev_info.get("validity_months", 12) * 30),
                )
                session.add(evidence)
                session.flush()
                stats["evidence_created"] += 1

            # Link evidence to outcomes
            for out_id in ev_info.get("linked_outcome_ids", []):
                existing_link = (
                    session.query(EvidenceOutcomeLink)
                    .filter_by(evidence_id=evidence.id, outcome_id=out_id)
                    .first()
                )
                if not existing_link:
                    link = EvidenceOutcomeLink(
                        evidence_id=evidence.id,
                        outcome_id=out_id,
                        linked_by_user_id=user.id,
                        citation_notes=f"Official assurance artifact supporting NCSC CAF outcome {out_id}.",
                    )
                    session.add(link)
                    stats["evidence_links"] += 1

        session.flush()

        # 6. Upsert 10 Remediation Tasks
        tasks_data = demo_data.get("remediation_tasks", [])
        for t_info in tasks_data:
            existing_task = (
                session.query(RemediationTask)
                .filter_by(
                    tenant_id=council.id,
                    assessment_id=assessment.id,
                    title=t_info["title"],
                )
                .first()
            )
            if not existing_task:
                target_dt = None
                if t_info.get("target_completion_date"):
                    try:
                        target_dt = date.fromisoformat(t_info["target_completion_date"])
                    except Exception:
                        target_dt = date.today() + timedelta(days=45)

                task = RemediationTask(
                    tenant_id=council.id,
                    assessment_id=assessment.id,
                    outcome_id=t_info["outcome_id"],
                    title=t_info["title"],
                    description=t_info.get("description", ""),
                    technical_steps=t_info.get("technical_steps", []),
                    status=RemediationStatus(t_info.get("status", "BACKLOG")),
                    priority=RemediationPriority(t_info.get("priority", "HIGH")),
                    assigned_owner_name=t_info.get("assigned_owner_name", "IT Security Lead"),
                    assigned_owner_email=t_info.get("assigned_owner_email", demo_email),
                    estimated_effort_hours=float(t_info.get("estimated_effort_hours", 40.0)),
                    estimated_cost_gbp=float(t_info.get("estimated_cost_gbp", 5000.0)),
                    target_completion_date=target_dt,
                    external_ticket_id=t_info.get("external_ticket_id"),
                )
                session.add(task)
                stats["remediation_tasks"] += 1

        session.commit()
        logger.info(
            f"Successfully loaded Borsetshire Demo Data: {stats['evaluations_updated']} outcomes evaluated, "
            f"{stats['evidence_created']} evidence files, {stats['evidence_links']} links, "
            f"{stats['remediation_tasks']} remediation tasks."
        )
        return stats

    except Exception as e:
        session.rollback()
        logger.error(f"Error loading demo dataset: {e}")
        raise
    finally:
        if close_session_at_end:
            session.close()


if __name__ == "__main__":
    print("\n========================================================")
    print("  Open CAF: Loading 'Borsetshire District Council' Demo ")
    print("========================================================\n")
    stats = load_demo_council_data()
    print("\n[OK] Demo dataset successfully seeded into database:")
    for k, v in stats.items():
        print(f"  - {k}: {v}")
    print("\nLog in credentials for demonstration:")
    print("  Email:    ciso@borsetshire.gov.uk")
    print("  Password: Borsetshire2025!")
    print("========================================================\n")
