/**
 * TypeScript types for Open CAF Remediation Task Management
 */

export type RemediationStatus = 'BACKLOG' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELLED';
export type RemediationPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface TechnicalStepItem {
  step: string;
  completed: boolean;
}

export interface RemediationTask {
  id: string;
  tenant_id: string;
  assessment_id: string;
  outcome_id: string;
  gap_id?: string | null;
  title: string;
  description?: string | null;
  technical_steps: TechnicalStepItem[] | string[];
  status: RemediationStatus;
  priority: RemediationPriority;
  assigned_owner_name?: string | null;
  assigned_owner_email?: string | null;
  estimated_effort_hours: number;
  estimated_cost_gbp: number;
  target_completion_date?: string | null; // YYYY-MM-DD
  completed_at?: string | null;
  external_ticket_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RemediationTaskCreateInput {
  assessment_id: string;
  outcome_id: string;
  gap_id?: string | null;
  title: string;
  description?: string | null;
  technical_steps?: TechnicalStepItem[] | string[];
  status?: RemediationStatus;
  priority?: RemediationPriority;
  assigned_owner_name?: string | null;
  assigned_owner_email?: string | null;
  estimated_effort_hours?: number;
  estimated_cost_gbp?: number;
  target_completion_date?: string | null;
  external_ticket_id?: string | null;
}

export interface RemediationTaskUpdateInput {
  title?: string;
  description?: string | null;
  technical_steps?: TechnicalStepItem[] | string[];
  status?: RemediationStatus;
  priority?: RemediationPriority;
  assigned_owner_name?: string | null;
  assigned_owner_email?: string | null;
  estimated_effort_hours?: number;
  estimated_cost_gbp?: number;
  target_completion_date?: string | null;
  external_ticket_id?: string | null;
}

export interface RemediationSummary {
  assessment_id?: string | null;
  total_tasks: number;
  open_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  total_budget_required_gbp: number;
  total_estimated_effort_hours: number;
  by_status: Record<RemediationStatus, number>;
  by_priority: Record<RemediationPriority, number>;
  sla_compliance_rate: number; // e.g. 85.0%
  overdue_tasks_count: number;
}
