"""Remediation Task Management Service."""
import uuid
from datetime import datetime, timezone, date, timedelta
from typing import List, Dict, Optional, Tuple, Any
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload

from app.models.assessment import Assessment, OutcomeStatus
from app.models.caf import ContributingOutcome
from app.models.remediation import RemediationTask, RemediationStatus, RemediationPriority
from app.models.audit import AuditLog
from app.schemas.remediation import (
    RemediationTaskCreate,
    RemediationTaskCreateFromGap,
    RemediationTaskUpdate,
    RemediationSummaryResponse,
)
from app.schemas.gap import GapItem, GapTypeEnum, GapSeverityEnum
from app.services.gap_analysis_service import GapAnalysisService


# Default SLA and financial baselines for UK local authorities
SLA_DAYS_MAP: Dict[RemediationPriority, int] = {
    RemediationPriority.CRITICAL: 14,
    RemediationPriority.HIGH: 45,
    RemediationPriority.MEDIUM: 90,
    RemediationPriority.LOW: 180,
}

COST_ESTIMATE_MAP: Dict[RemediationPriority, float] = {
    RemediationPriority.CRITICAL: 12500.0,
    RemediationPriority.HIGH: 6500.0,
    RemediationPriority.MEDIUM: 3000.0,
    RemediationPriority.LOW: 1500.0,
}

EFFORT_HOURS_MAP: Dict[RemediationPriority, float] = {
    RemediationPriority.CRITICAL: 80.0,
    RemediationPriority.HIGH: 40.0,
    RemediationPriority.MEDIUM: 20.0,
    RemediationPriority.LOW: 10.0,
}


class RemediationService:
    @classmethod
    async def create_task_from_gap(
        cls,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        payload: RemediationTaskCreateFromGap,
        user_id: Optional[uuid.UUID] = None,
    ) -> RemediationTask:
        """
        Auto-generates a trackable remediation action item from an identified CAF gap.
        Populates title, outcome code, priority, checklist steps, estimated cost, and target SLA date.
        """
        # 1. Validate assessment ownership
        ass_res = await db.execute(
            select(Assessment).filter_by(id=payload.assessment_id, tenant_id=tenant_id)
        )
        if not ass_res.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assessment not found or does not belong to your council",
            )

        # 2. Query detected gaps to extract context
        gaps = await GapAnalysisService.detect_gaps(
            db=db,
            assessment_id=payload.assessment_id,
            tenant_id=tenant_id,
        )

        matched_gap: Optional[GapItem] = None
        if payload.gap_id:
            matched_gap = next((g for g in gaps if g.id == payload.gap_id), None)
        if not matched_gap:
            matched_gap = next((g for g in gaps if g.outcome_id == payload.outcome_id), None)

        # 3. Derive priority, title, description, and steps
        if matched_gap:
            # Map severity to priority
            if matched_gap.severity == GapSeverityEnum.CRITICAL:
                priority = RemediationPriority.CRITICAL
            elif matched_gap.severity == GapSeverityEnum.HIGH:
                priority = RemediationPriority.HIGH
            elif matched_gap.severity == GapSeverityEnum.MEDIUM:
                priority = RemediationPriority.MEDIUM
            else:
                priority = RemediationPriority.LOW

            title = (
                payload.custom_title
                or f"Remediate {matched_gap.outcome_id}: {matched_gap.title}"
            )
            description = (
                f"{matched_gap.description}\n\n"
                f"Assessor Guidance: {matched_gap.recommendation}"
            )

            # Generate technical steps checklist
            if matched_gap.unmet_igps and len(matched_gap.unmet_igps) > 0:
                technical_steps = [
                    {"step": f"Implement criteria: {igp.description}", "completed": False}
                    for igp in matched_gap.unmet_igps
                ]
            elif matched_gap.gap_type == GapTypeEnum.EVIDENTIAL_GAP:
                technical_steps = [
                    {"step": "Collate and review fresh third-party audit / scan evidence", "completed": False},
                    {"step": "Upload document to Evidence Vault", "completed": False},
                    {"step": f"Tag evidence to Contributing Outcome {matched_gap.outcome_id} with audit citation", "completed": False},
                ]
            else:
                technical_steps = [
                    {"step": "Draft operational improvement plan", "completed": False},
                    {"step": "Implement corrective technical controls", "completed": False},
                    {"step": "Perform verification testing", "completed": False},
                ]
        else:
            priority = RemediationPriority.HIGH
            title = payload.custom_title or f"Remediate CAF Outcome {payload.outcome_id}"
            description = "Address identified compliance deficit and align with NCSC CAF v4.0 standard."
            technical_steps = [{"step": "Define implementation scope", "completed": False}]

        sla_days = SLA_DAYS_MAP.get(priority, 45)
        default_target_date = date.today() + timedelta(days=sla_days)
        target_date = payload.target_completion_date or default_target_date

        cost = (
            payload.estimated_cost_gbp
            if payload.estimated_cost_gbp is not None
            else COST_ESTIMATE_MAP.get(priority, 5000.0)
        )
        effort = (
            payload.estimated_effort_hours
            if payload.estimated_effort_hours is not None
            else EFFORT_HOURS_MAP.get(priority, 40.0)
        )

        task_id = uuid.uuid4()
        task = RemediationTask(
            id=task_id,
            tenant_id=tenant_id,
            assessment_id=payload.assessment_id,
            outcome_id=payload.outcome_id,
            gap_id=payload.gap_id,
            title=title.strip(),
            description=description.strip(),
            technical_steps=technical_steps,
            status=RemediationStatus.BACKLOG,
            priority=priority,
            assigned_owner_name=payload.assigned_owner_name,
            assigned_owner_email=payload.assigned_owner_email,
            estimated_effort_hours=effort,
            estimated_cost_gbp=cost,
            target_completion_date=target_date,
            external_ticket_id=payload.external_ticket_id,
        )
        db.add(task)

        # Audit log
        audit = AuditLog(
            tenant_id=tenant_id,
            user_id=user_id,
            action="REMEDIATION_TASK_CREATED_FROM_GAP",
            entity_type="REMEDIATION_TASK",
            entity_id=str(task_id),
            payload_after={"title": task.title, "priority": priority.value, "cost": cost},
        )
        db.add(audit)

        await db.commit()
        await db.refresh(task)
        return task

    @classmethod
    async def create_task(
        cls,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        payload: RemediationTaskCreate,
        user_id: Optional[uuid.UUID] = None,
    ) -> RemediationTask:
        """Manually creates a remediation task for a council assessment."""
        # Validate assessment ownership
        ass_res = await db.execute(
            select(Assessment).filter_by(id=payload.assessment_id, tenant_id=tenant_id)
        )
        if not ass_res.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assessment not found or does not belong to your council",
            )

        task_id = uuid.uuid4()
        task = RemediationTask(
            id=task_id,
            tenant_id=tenant_id,
            assessment_id=payload.assessment_id,
            outcome_id=payload.outcome_id,
            gap_id=payload.gap_id,
            title=payload.title.strip(),
            description=payload.description.strip() if payload.description else None,
            technical_steps=payload.technical_steps or [],
            status=payload.status,
            priority=payload.priority,
            assigned_owner_name=payload.assigned_owner_name,
            assigned_owner_email=payload.assigned_owner_email,
            estimated_effort_hours=payload.estimated_effort_hours,
            estimated_cost_gbp=payload.estimated_cost_gbp,
            target_completion_date=payload.target_completion_date,
            external_ticket_id=payload.external_ticket_id,
        )
        db.add(task)

        audit = AuditLog(
            tenant_id=tenant_id,
            user_id=user_id,
            action="REMEDIATION_TASK_CREATED",
            entity_type="REMEDIATION_TASK",
            entity_id=str(task_id),
            payload_after={"title": task.title, "priority": task.priority.value},
        )
        db.add(audit)

        await db.commit()
        await db.refresh(task)
        return task

    @classmethod
    async def update_task_status(
        cls,
        db: AsyncSession,
        task_id: uuid.UUID,
        tenant_id: uuid.UUID,
        new_status: RemediationStatus,
        user_id: Optional[uuid.UUID] = None,
    ) -> RemediationTask:
        """
        Updates task status. Auto-sets completed_at timestamp when status transitions
        to COMPLETED, and clears it if moved back to open statuses.
        """
        res = await db.execute(
            select(RemediationTask).filter_by(id=task_id, tenant_id=tenant_id)
        )
        task = res.scalars().first()
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Remediation task not found",
            )

        old_status = task.status
        task.status = new_status

        if new_status == RemediationStatus.COMPLETED and old_status != RemediationStatus.COMPLETED:
            task.completed_at = datetime.now(timezone.utc)
        elif new_status != RemediationStatus.COMPLETED:
            task.completed_at = None

        task.updated_at = datetime.now(timezone.utc)

        audit = AuditLog(
            tenant_id=tenant_id,
            user_id=user_id,
            action="REMEDIATION_TASK_STATUS_UPDATED",
            entity_type="REMEDIATION_TASK",
            entity_id=str(task_id),
            payload_before={"status": old_status.value},
            payload_after={"status": new_status.value},
        )
        db.add(audit)

        await db.commit()
        await db.refresh(task)
        return task

    @classmethod
    async def update_task(
        cls,
        db: AsyncSession,
        task_id: uuid.UUID,
        tenant_id: uuid.UUID,
        payload: RemediationTaskUpdate,
        user_id: Optional[uuid.UUID] = None,
    ) -> RemediationTask:
        """Updates arbitrary remediation task fields with status change handling."""
        res = await db.execute(
            select(RemediationTask).filter_by(id=task_id, tenant_id=tenant_id)
        )
        task = res.scalars().first()
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Remediation task not found",
            )

        if payload.title is not None:
            task.title = payload.title.strip()
        if payload.description is not None:
            task.description = payload.description.strip()
        if payload.technical_steps is not None:
            task.technical_steps = payload.technical_steps
        if payload.priority is not None:
            task.priority = payload.priority
        if payload.assigned_owner_name is not None:
            task.assigned_owner_name = payload.assigned_owner_name
        if payload.assigned_owner_email is not None:
            task.assigned_owner_email = payload.assigned_owner_email
        if payload.estimated_effort_hours is not None:
            task.estimated_effort_hours = payload.estimated_effort_hours
        if payload.estimated_cost_gbp is not None:
            task.estimated_cost_gbp = payload.estimated_cost_gbp
        if payload.target_completion_date is not None:
            task.target_completion_date = payload.target_completion_date
        if payload.external_ticket_id is not None:
            task.external_ticket_id = payload.external_ticket_id

        if payload.status is not None:
            if payload.status == RemediationStatus.COMPLETED and task.status != RemediationStatus.COMPLETED:
                task.completed_at = datetime.now(timezone.utc)
            elif payload.status != RemediationStatus.COMPLETED:
                task.completed_at = None
            task.status = payload.status

        task.updated_at = datetime.now(timezone.utc)

        audit = AuditLog(
            tenant_id=tenant_id,
            user_id=user_id,
            action="REMEDIATION_TASK_UPDATED",
            entity_type="REMEDIATION_TASK",
            entity_id=str(task_id),
            payload_after={"title": task.title, "status": task.status.value},
        )
        db.add(audit)

        await db.commit()
        await db.refresh(task)
        return task

    @classmethod
    async def delete_task(
        cls,
        db: AsyncSession,
        task_id: uuid.UUID,
        tenant_id: uuid.UUID,
        user_id: Optional[uuid.UUID] = None,
    ) -> None:
        """Deletes a remediation task record."""
        res = await db.execute(
            select(RemediationTask).filter_by(id=task_id, tenant_id=tenant_id)
        )
        task = res.scalars().first()
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Remediation task not found",
            )

        audit = AuditLog(
            tenant_id=tenant_id,
            user_id=user_id,
            action="REMEDIATION_TASK_DELETED",
            entity_type="REMEDIATION_TASK",
            entity_id=str(task_id),
            payload_before={"title": task.title},
        )
        db.add(audit)

        await db.delete(task)
        await db.commit()

    @classmethod
    async def get_task(
        cls,
        db: AsyncSession,
        task_id: uuid.UUID,
        tenant_id: uuid.UUID,
    ) -> RemediationTask:
        """Retrieves a single remediation task scoped to tenant."""
        res = await db.execute(
            select(RemediationTask).filter_by(id=task_id, tenant_id=tenant_id)
        )
        task = res.scalars().first()
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Remediation task not found",
            )
        return task

    @classmethod
    async def list_tasks(
        cls,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        assessment_id: Optional[uuid.UUID] = None,
        status_filter: Optional[RemediationStatus] = None,
        priority_filter: Optional[RemediationPriority] = None,
        outcome_id: Optional[str] = None,
    ) -> List[RemediationTask]:
        """Lists tasks matching filters, ordered by priority and target date."""
        query = select(RemediationTask).filter_by(tenant_id=tenant_id)

        if assessment_id is not None:
            query = query.filter(RemediationTask.assessment_id == assessment_id)
        if status_filter is not None:
            query = query.filter(RemediationTask.status == status_filter)
        if priority_filter is not None:
            query = query.filter(RemediationTask.priority == priority_filter)
        if outcome_id is not None:
            query = query.filter(RemediationTask.outcome_id == outcome_id)

        query = query.order_by(RemediationTask.created_at.desc())
        res = await db.execute(query)
        return list(res.scalars().all())

    @classmethod
    async def get_remediation_summary(
        cls,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        assessment_id: Optional[uuid.UUID] = None,
    ) -> RemediationSummaryResponse:
        """
        Aggregates financial budget requirements (£ GBP), total engineering effort hours,
        status distribution, and SLA compliance.
        """
        tasks = await cls.list_tasks(
            db=db,
            tenant_id=tenant_id,
            assessment_id=assessment_id,
        )

        total_tasks = len(tasks)
        by_status = {s.value: 0 for s in RemediationStatus}
        by_priority = {p.value: 0 for p in RemediationPriority}

        open_tasks = 0
        completed_tasks = 0
        in_progress_tasks = 0

        total_budget = 0.0
        total_effort = 0.0

        today = date.today()
        overdue_tasks_count = 0
        tasks_with_deadline = 0
        tasks_compliant = 0

        for t in tasks:
            st = t.status.value if hasattr(t.status, "value") else str(t.status)
            pr = t.priority.value if hasattr(t.priority, "value") else str(t.priority)

            by_status[st] = by_status.get(st, 0) + 1
            by_priority[pr] = by_priority.get(pr, 0) + 1

            total_budget += t.estimated_cost_gbp or 0.0
            total_effort += t.estimated_effort_hours or 0.0

            if t.status in (RemediationStatus.BACKLOG, RemediationStatus.IN_PROGRESS, RemediationStatus.IN_REVIEW):
                open_tasks += 1
                if t.status == RemediationStatus.IN_PROGRESS:
                    in_progress_tasks += 1

                if t.target_completion_date:
                    tasks_with_deadline += 1
                    if t.target_completion_date < today:
                        overdue_tasks_count += 1
                    else:
                        tasks_compliant += 1
            elif t.status == RemediationStatus.COMPLETED:
                completed_tasks += 1
                if t.target_completion_date:
                    tasks_with_deadline += 1
                    if t.completed_at and t.completed_at.date() <= t.target_completion_date:
                        tasks_compliant += 1
                    elif not t.completed_at:
                        tasks_compliant += 1
                    else:
                        overdue_tasks_count += 1

        sla_rate = (
            round((tasks_compliant / tasks_with_deadline) * 100.0, 1)
            if tasks_with_deadline > 0
            else 100.0
        )

        return RemediationSummaryResponse(
            assessment_id=assessment_id,
            total_tasks=total_tasks,
            open_tasks=open_tasks,
            completed_tasks=completed_tasks,
            in_progress_tasks=in_progress_tasks,
            total_budget_required_gbp=round(total_budget, 2),
            total_estimated_effort_hours=round(total_effort, 1),
            by_status=by_status,
            by_priority=by_priority,
            sla_compliance_rate=sla_rate,
            overdue_tasks_count=overdue_tasks_count,
        )
