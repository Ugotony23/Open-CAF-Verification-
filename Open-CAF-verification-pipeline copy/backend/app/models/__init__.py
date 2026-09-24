"""Open CAF Models Package."""
from app.core.database import Base
from app.models.tenant import CouncilTenant, AuthorityType
from app.models.user import User, UserRole
from app.models.caf import (
    Objective,
    Principle,
    ContributingOutcome,
    IGP,
    IGPLevel,
)
from app.models.assessment import (
    Assessment,
    AssessmentOutcome,
    AssessmentIGPCheck,
    AssessmentStatus,
    OutcomeStatus,
)
from app.models.evidence import Evidence, EvidenceCategory
from app.models.associations import EvidenceOutcomeLink
from app.models.audit import AuditLog
from app.models.council_service import CouncilService, ServiceTier
from app.models.remediation import RemediationTask, RemediationStatus, RemediationPriority
from app.models.embedding import DocumentEmbedding
from app.models.ai_suggestion import AISuggestion, SuggestionType, SuggestionStatus

__all__ = [
    "Base",
    "CouncilTenant",
    "AuthorityType",
    "User",
    "UserRole",
    "Objective",
    "Principle",
    "ContributingOutcome",
    "IGP",
    "IGPLevel",
    "Assessment",
    "AssessmentOutcome",
    "AssessmentIGPCheck",
    "AssessmentStatus",
    "OutcomeStatus",
    "Evidence",
    "EvidenceCategory",
    "EvidenceOutcomeLink",
    "AuditLog",
    "CouncilService",
    "ServiceTier",
    "RemediationTask",
    "RemediationStatus",
    "RemediationPriority",
    "DocumentEmbedding",
    "AISuggestion",
    "SuggestionType",
    "SuggestionStatus",
]
