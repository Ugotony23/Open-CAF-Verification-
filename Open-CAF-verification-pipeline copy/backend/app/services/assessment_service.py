"""Assessment Business Logic & Score Calculation Service."""
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload, selectinload
from fastapi import HTTPException, status

from app.models.assessment import (
    Assessment,
    AssessmentOutcome,
    AssessmentIGPCheck,
    AssessmentStatus,
    OutcomeStatus,
)
from app.models.caf import (
    Objective,
    Principle,
    ContributingOutcome,
    IGP,
)
from app.schemas.assessment import (
    AssessmentCreate,
    AssessmentUpdate,
    OutcomeEvaluationUpdate,
    ScoreSummary,
    ObjectiveScore,
    PrincipleScore,
)

class AssessmentService:
    @staticmethod
    async def create_assessment(
        db: AsyncSession,
        tenant_id: uuid.UUID,
        payload: AssessmentCreate,
    ) -> Assessment:
        """
        Creates a new assessment for the council tenant and initializes all 39
        Contributing Outcomes and their respective IGP checkboxes.
        """
        # 1. Create Assessment Record
        assessment = Assessment(
            tenant_id=tenant_id,
            title=payload.title.strip(),
            scope_description=payload.scope_description.strip(),
            status=AssessmentStatus.DRAFT,
            council_service_name=payload.council_service_name.strip() if payload.council_service_name else None,
        )
        db.add(assessment)
        await db.flush()

        # 2. Fetch all CAF Contributing Outcomes and their IGPs
        result = await db.execute(
            select(ContributingOutcome).options(selectinload(ContributingOutcome.igps))
        )
        outcomes = result.scalars().all()

        if not outcomes:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="CAF v4.0 framework data has not been seeded. Please run 'make seed' first.",
            )

        # 3. Initialize all 39 AssessmentOutcomes and IGP checks
        for outcome in outcomes:
            ass_outcome = AssessmentOutcome(
                assessment_id=assessment.id,
                outcome_id=outcome.id,
                status=OutcomeStatus.NOT_STARTED,
            )
            db.add(ass_outcome)
            await db.flush()

            for igp in outcome.igps:
                igp_check = AssessmentIGPCheck(
                    assessment_outcome_id=ass_outcome.id,
                    igp_id=igp.id,
                    is_satisfied=False,
                )
                db.add(igp_check)

        await db.commit()
        await db.refresh(assessment)
        return assessment

    @staticmethod
    async def get_assessment(
        db: AsyncSession,
        assessment_id: uuid.UUID,
        tenant_id: uuid.UUID,
    ) -> Assessment:
        """Retrieves an assessment ensuring tenant scoping."""
        result = await db.execute(
            select(Assessment)
            .filter_by(id=assessment_id, tenant_id=tenant_id)
            .options(
                selectinload(Assessment.outcomes)
                .selectinload(AssessmentOutcome.igp_checks)
                .selectinload(AssessmentIGPCheck.igp),
                selectinload(Assessment.outcomes).selectinload(AssessmentOutcome.contributing_outcome),
            )
        )
        assessment = result.scalars().first()
        if not assessment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assessment not found or does not belong to your council",
            )
        return assessment

    @staticmethod
    async def list_assessments(
        db: AsyncSession,
        tenant_id: uuid.UUID,
    ) -> List[Assessment]:
        """Lists all assessments belonging to the council tenant."""
        result = await db.execute(
            select(Assessment)
            .filter_by(tenant_id=tenant_id)
            .order_by(Assessment.created_at.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def update_outcome_evaluation(
        db: AsyncSession,
        assessment_id: uuid.UUID,
        outcome_id: str,
        payload: OutcomeEvaluationUpdate,
        tenant_id: uuid.UUID,
    ) -> AssessmentOutcome:
        """
        Updates an assessment outcome's status, rationale notes, and IGP satisfied checks.
        """
        # 1. Verify assessment ownership
        ass_result = await db.execute(
            select(Assessment).filter_by(id=assessment_id, tenant_id=tenant_id)
        )
        assessment = ass_result.scalars().first()
        if not assessment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assessment not found or does not belong to your council",
            )

        # 2. Fetch specific outcome evaluation
        res = await db.execute(
            select(AssessmentOutcome)
            .filter_by(assessment_id=assessment_id, outcome_id=outcome_id)
            .options(
                selectinload(AssessmentOutcome.igp_checks).selectinload(AssessmentIGPCheck.igp),
                selectinload(AssessmentOutcome.contributing_outcome),
            )
        )
        ass_outcome = res.scalars().first()
        if not ass_outcome:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Outcome '{outcome_id}' not found in assessment",
            )

        # 3. Apply updates
        ass_outcome.status = payload.status
        if payload.assessor_rationale is not None:
            ass_outcome.assessor_rationale = payload.assessor_rationale
        if payload.reviewer_notes is not None:
            ass_outcome.reviewer_notes = payload.reviewer_notes

        if payload.status != OutcomeStatus.NOT_STARTED:
            ass_outcome.assessed_at = datetime.now(timezone.utc)
        else:
            ass_outcome.assessed_at = None

        # 4. Update IGP check checkboxes if provided
        if payload.satisfied_igp_ids is not None:
            satisfied_set = set(payload.satisfied_igp_ids)
            for check in ass_outcome.igp_checks:
                check.is_satisfied = check.igp_id in satisfied_set

        assessment.updated_at = datetime.now(timezone.utc)
        await db.commit()

        # Re-fetch with eager loaded relationships
        refetched = await db.execute(
            select(AssessmentOutcome)
            .filter_by(id=ass_outcome.id)
            .options(
                selectinload(AssessmentOutcome.igp_checks).selectinload(AssessmentIGPCheck.igp),
                selectinload(AssessmentOutcome.contributing_outcome),
            )
        )
        return refetched.scalars().first()

    @staticmethod
    async def calculate_assessment_scores(
        db: AsyncSession,
        assessment_id: uuid.UUID,
        tenant_id: Optional[uuid.UUID] = None,
    ) -> ScoreSummary:
        """
        Calculates full CAF maturity metrics across all 39 Contributing Outcomes,
        Objectives A-D, and Principles A1-D2.
        """
        query = select(Assessment).filter_by(id=assessment_id)
        if tenant_id:
            query = query.filter_by(tenant_id=tenant_id)
        ass_res = await db.execute(query)
        assessment = ass_res.scalars().first()
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")

        # Fetch all objectives and principles to structure the tree
        obj_res = await db.execute(
            select(Objective).options(
                selectinload(Objective.principles).selectinload(Principle.outcomes)
            )
        )
        objectives = obj_res.scalars().all()

        # Fetch all outcome evaluations for this assessment
        eval_res = await db.execute(
            select(AssessmentOutcome).filter_by(assessment_id=assessment_id)
        )
        evaluations: Dict[str, AssessmentOutcome] = {
            ev.outcome_id: ev for ev in eval_res.scalars().all()
        }

        total_outcomes = len(evaluations) if evaluations else 39
        achieved_cnt = sum(1 for ev in evaluations.values() if ev.status == OutcomeStatus.ACHIEVED)
        partially_cnt = sum(1 for ev in evaluations.values() if ev.status == OutcomeStatus.PARTIALLY_ACHIEVED)
        not_achieved_cnt = sum(1 for ev in evaluations.values() if ev.status == OutcomeStatus.NOT_ACHIEVED)
        not_started_cnt = sum(1 for ev in evaluations.values() if ev.status == OutcomeStatus.NOT_STARTED)

        evaluated_outcomes = achieved_cnt + partially_cnt + not_achieved_cnt
        remaining_outcomes = total_outcomes - evaluated_outcomes
        completion_rate = round((evaluated_outcomes / total_outcomes) * 100, 1) if total_outcomes > 0 else 0.0

        achieved_pct = round((achieved_cnt / total_outcomes) * 100, 1) if total_outcomes > 0 else 0.0
        partially_pct = round((partially_cnt / total_outcomes) * 100, 1) if total_outcomes > 0 else 0.0
        not_achieved_pct = round((not_achieved_cnt / total_outcomes) * 100, 1) if total_outcomes > 0 else 0.0

        # Build Objective and Principle breakdowns
        objectives_score: Dict[str, ObjectiveScore] = {}

        for obj in objectives:
            obj_evals = [evaluations.get(o.id) for p in obj.principles for o in p.outcomes if o.id in evaluations]
            obj_total = len(obj_evals)
            obj_ach = sum(1 for ev in obj_evals if ev and ev.status == OutcomeStatus.ACHIEVED)
            obj_part = sum(1 for ev in obj_evals if ev and ev.status == OutcomeStatus.PARTIALLY_ACHIEVED)
            obj_not = sum(1 for ev in obj_evals if ev and ev.status == OutcomeStatus.NOT_ACHIEVED)
            obj_not_started = sum(1 for ev in obj_evals if ev and ev.status == OutcomeStatus.NOT_STARTED)
            obj_comp = round(((obj_ach + obj_part + obj_not) / obj_total) * 100, 1) if obj_total > 0 else 0.0

            principles_score: Dict[str, PrincipleScore] = {}
            for prin in obj.principles:
                p_evals = [evaluations.get(o.id) for o in prin.outcomes if o.id in evaluations]
                p_total = len(p_evals)
                p_ach = sum(1 for ev in p_evals if ev and ev.status == OutcomeStatus.ACHIEVED)
                p_part = sum(1 for ev in p_evals if ev and ev.status == OutcomeStatus.PARTIALLY_ACHIEVED)
                p_not = sum(1 for ev in p_evals if ev and ev.status == OutcomeStatus.NOT_ACHIEVED)
                p_not_started = sum(1 for ev in p_evals if ev and ev.status == OutcomeStatus.NOT_STARTED)
                p_comp = round(((p_ach + p_part + p_not) / p_total) * 100, 1) if p_total > 0 else 0.0

                principles_score[prin.id] = PrincipleScore(
                    principle_id=prin.id,
                    principle_title=prin.title,
                    total_outcomes=p_total,
                    achieved=p_ach,
                    partially_achieved=p_part,
                    not_achieved=p_not,
                    not_started=p_not_started,
                    completion_rate=p_comp,
                )

            objectives_score[obj.id] = ObjectiveScore(
                objective_id=obj.id,
                objective_title=obj.title,
                total_outcomes=obj_total,
                achieved=obj_ach,
                partially_achieved=obj_part,
                not_achieved=obj_not,
                not_started=obj_not_started,
                completion_rate=obj_comp,
                principles=principles_score,
            )

        return ScoreSummary(
            total_outcomes=total_outcomes,
            evaluated_outcomes=evaluated_outcomes,
            remaining_outcomes=remaining_outcomes,
            completion_rate=completion_rate,
            overall_achieved_count=achieved_cnt,
            overall_achieved_pct=achieved_pct,
            overall_partially_achieved_count=partially_cnt,
            overall_partially_achieved_pct=partially_pct,
            overall_not_achieved_count=not_achieved_cnt,
            overall_not_achieved_pct=not_achieved_pct,
            overall_not_started_count=not_started_cnt,
            objectives=objectives_score,
        )
