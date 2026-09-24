/**
 * Frontend Type Definitions for CAF Assessments, Outcomes, and Scoring
 */

export type OutcomeStatus = 'NOT_STARTED' | 'ACHIEVED' | 'PARTIALLY_ACHIEVED' | 'NOT_ACHIEVED';
export type IGPLevel = 'ACHIEVED' | 'PARTIALLY_ACHIEVED';
export type AssessmentFilter = 'all' | 'unassessed' | 'needs_evidence' | 'deficits_only';

export interface IGPCheck {
  igp_id: string;
  level: IGPLevel;
  description: string;
  sort_order: number;
  is_satisfied: boolean;
}

export interface AssessmentOutcome {
  id: string;
  assessment_id: string;
  outcome_id: string;
  outcome_title?: string;
  outcome_description?: string;
  principle_id?: string;
  objective_id?: string;
  status: OutcomeStatus;
  assessor_rationale?: string;
  reviewer_notes?: string;
  assessed_at?: string;
  igp_checks: IGPCheck[];
  evidence_count?: number;
  evidence_files?: Array<{ id: string; filename: string; category?: string }>;
}

export interface PrincipleScore {
  principle_id: string;
  principle_title: string;
  total_outcomes: number;
  achieved: number;
  partially_achieved: number;
  not_achieved: number;
  not_started: number;
  completion_rate: number;
}

export interface ObjectiveScore {
  objective_id: string;
  objective_title: string;
  total_outcomes: number;
  achieved: number;
  partially_achieved: number;
  not_achieved: number;
  not_started: number;
  completion_rate: number;
  principles: Record<string, PrincipleScore>;
}

export interface ScoreSummary {
  total_outcomes: number;
  evaluated_outcomes: number;
  remaining_outcomes: number;
  completion_rate: number;
  overall_achieved_count: number;
  overall_achieved_pct: number;
  overall_partially_achieved_count: number;
  overall_partially_achieved_pct: number;
  overall_not_achieved_count: number;
  overall_not_achieved_pct: number;
  overall_not_started_count: number;
  overall_maturity_score?: number;
  objectives: Record<string, ObjectiveScore>;
}

export interface AssessmentResponse {
  id: string;
  tenant_id: string;
  title: string;
  scope_description: string;
  status: 'DRAFT' | 'IN_PROGRESS' | 'UNDER_REVIEW' | 'COMPLETED' | 'ARCHIVED';
  council_service_name?: string;
  created_at: string;
  updated_at: string;
  score_summary?: ScoreSummary;
}

export interface AssessmentDetail extends AssessmentResponse {
  outcomes: AssessmentOutcome[];
}
