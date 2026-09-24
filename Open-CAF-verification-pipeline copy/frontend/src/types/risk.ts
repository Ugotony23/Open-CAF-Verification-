/**
 * TypeScript types for Gap Analysis & Risk Prioritization (Council Impact Matrix)
 */

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ServiceTier = 'TIER_1' | 'TIER_2' | 'TIER_3';
export type GapType = 'CONTROL_DEFICIT' | 'EVIDENTIAL_GAP';
export type GapSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface UnmetIGPItem {
  igp_id: string;
  level: string;
  description: string;
}

export interface PrioritizedRiskItem {
  id: string;
  rank: number;
  assessment_id: string;
  outcome_id: string;
  outcome_title: string;
  principle_id: string;
  objective_id: string;
  gap_id: string;
  gap_type: GapType;
  gap_title: string;
  deficit_description: string;
  recommendation: string;

  // Scoring Factors
  gap_severity_score: number; // 1-5
  gap_severity_level: GapSeverity;
  gap_severity_rationale: string;
  threat_likelihood_score: number; // 1-3
  threat_likelihood_vector: string;

  // Impacted Council Service
  impacted_service_id: string;
  impacted_service_name: string;
  impacted_service_tier: ServiceTier;
  service_criticality_weight: number; // 3.0, 2.0, 1.0

  // Priority Score & SLA
  priority_score: number; // 0.0 - 100.0
  risk_level: RiskLevel;
  suggested_sla_days: number;
  suggested_sla_label: string;

  // Evaluation state
  evaluated_status: string;
  unmet_igps?: UnmetIGPItem[];
  is_stale_evidence?: boolean;
  evidence_count?: number;
}

export interface PrioritizedRiskSummary {
  assessment_id: string;
  total_risks: number;
  critical_risks_count: number;
  high_risks_count: number;
  medium_risks_count: number;
  low_risks_count: number;
  evidential_gaps_count: number;
  affected_tier_1_services_count: number;
  heatmap_distribution: Record<string, number>;
  risks: PrioritizedRiskItem[];
}

export interface RiskFilterState {
  tier?: ServiceTier | 'ALL';
  gapType?: GapType | 'ALL';
  objectiveId?: string | 'ALL';
  riskLevel?: RiskLevel | 'ALL';
  searchQuery?: string;
  selectedQuadrant?: string | null; // e.g. "L3_I3"
}
