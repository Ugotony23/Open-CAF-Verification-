'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  PrioritizedRiskItem,
  PrioritizedRiskSummary,
  RiskFilterState,
  ServiceTier,
  GapType,
  RiskLevel,
} from '@/types/risk';
import { api } from '@/lib/api';

const MOCK_DEMO_RISKS: PrioritizedRiskItem[] = [
  {
    id: 'risk-demo-b2a-social-care',
    rank: 1,
    assessment_id: 'ass-demo-001',
    outcome_id: 'B2.a',
    outcome_title: 'Identity and Access Management',
    principle_id: 'B2',
    objective_id: 'B',
    gap_id: 'gap-b2a-001',
    gap_type: 'CONTROL_DEFICIT',
    gap_title: 'Unenforced MFA on Legacy Administrative & RDP Gateways',
    deficit_description:
      'Domain administrative accounts and remote desktop portals lack mandatory hardware/authenticator app MFA. Single password compromise allows lateral movement.',
    recommendation:
      'Enforce FIDO2 / Microsoft Authenticator conditional access policies across all council administrator endpoints and decommission legacy NTLM endpoints.',
    gap_severity_score: 5,
    gap_severity_level: 'CRITICAL',
    gap_severity_rationale: 'Material technical deficit in core security perimeter (B2) - Not Achieved',
    threat_likelihood_score: 3,
    threat_likelihood_vector: 'Phishing & Credential Theft (High prevalence against council accounts; MFA absence)',
    impacted_service_id: 'svc-demo-social-care',
    impacted_service_name: "Adult & Children's Social Care Case Management",
    impacted_service_tier: 'TIER_1',
    service_criticality_weight: 3.0,
    priority_score: 100.0,
    risk_level: 'CRITICAL',
    suggested_sla_days: 14,
    suggested_sla_label: '14 days',
    evaluated_status: 'NOT_ACHIEVED',
    unmet_igps: [
      {
        igp_id: 'B2.a-A1',
        level: 'ACHIEVED',
        description: 'Multi-factor authentication is enforced for all administrative and privileged access.',
      },
      {
        igp_id: 'B2.a-A2',
        level: 'ACHIEVED',
        description: 'Privileged user sessions time out and require re-authentication with hardware tokens.',
      },
    ],
    is_stale_evidence: false,
    evidence_count: 0,
  },
  {
    id: 'risk-demo-b4a-revenues',
    rank: 2,
    assessment_id: 'ass-demo-001',
    outcome_id: 'B4.a',
    outcome_title: 'Secure Configuration & Vulnerability Management',
    principle_id: 'B4',
    objective_id: 'B',
    gap_id: 'gap-b4a-001',
    gap_type: 'CONTROL_DEFICIT',
    gap_title: 'Unpatched Internet-Facing Edge Firewall Gateway',
    deficit_description:
      'Perimeter firewall firmware is 3 versions behind vendor patch cycle with two known critical CVEs (CVSS 9.8) capable of pre-auth remote code execution.',
    recommendation:
      'Execute out-of-band firmware patching window, restrict management web interface to isolated OOB management VLAN, and rotate SSL-VPN secrets.',
    gap_severity_score: 5,
    gap_severity_level: 'CRITICAL',
    gap_severity_rationale: 'Material technical deficit in core security perimeter (B4) - Not Achieved',
    threat_likelihood_score: 3,
    threat_likelihood_vector: 'Edge Gateway & Firewall Exploitation (Active targeting of internet-facing council systems)',
    impacted_service_id: 'svc-demo-revenues',
    impacted_service_name: 'Revenues, Council Tax & Housing Benefits Processing',
    impacted_service_tier: 'TIER_1',
    service_criticality_weight: 3.0,
    priority_score: 100.0,
    risk_level: 'CRITICAL',
    suggested_sla_days: 14,
    suggested_sla_label: '14 days',
    evaluated_status: 'NOT_ACHIEVED',
    unmet_igps: [
      {
        igp_id: 'B4.a-A1',
        level: 'ACHIEVED',
        description: 'Critical security patches on internet-facing systems are deployed within 14 days of release.',
      },
    ],
    is_stale_evidence: false,
    evidence_count: 0,
  },
  {
    id: 'risk-demo-b5a-social-care',
    rank: 3,
    assessment_id: 'ass-demo-001',
    outcome_id: 'B5.a',
    outcome_title: 'Resilience & Backups',
    principle_id: 'B5',
    objective_id: 'B',
    gap_id: 'gap-b5a-001',
    gap_type: 'CONTROL_DEFICIT',
    gap_title: 'Online Backup Repositories Lack WORM / Air-Gapped Immutability',
    deficit_description:
      'Primary backup targets are joined to the active domain without immutable object storage lock, leaving them vulnerable to ransomware encryption.',
    recommendation:
      'Implement S3 Object Lock (WORM compliance) for cloud backup vaults and isolate off-site immutable Veeam hardened Linux repositories.',
    gap_severity_score: 4,
    gap_severity_level: 'HIGH',
    gap_severity_rationale: 'Significant operational deficit in defense, data protection, or monitoring',
    threat_likelihood_score: 3,
    threat_likelihood_vector: 'Ransomware Lateral Movement & Backup Encryption (High threat to council IT recovery)',
    impacted_service_id: 'svc-demo-social-care',
    impacted_service_name: "Adult & Children's Social Care Case Management",
    impacted_service_tier: 'TIER_1',
    service_criticality_weight: 3.0,
    priority_score: 80.0,
    risk_level: 'CRITICAL',
    suggested_sla_days: 14,
    suggested_sla_label: '14 days',
    evaluated_status: 'PARTIALLY_ACHIEVED',
    unmet_igps: [
      {
        igp_id: 'B5.a-A1',
        level: 'ACHIEVED',
        description: 'Backups are stored offline or in write-once-read-many (WORM) immutable storage.',
      },
    ],
    is_stale_evidence: false,
    evidence_count: 1,
  },
  {
    id: 'risk-demo-b2a-planning',
    rank: 4,
    assessment_id: 'ass-demo-001',
    outcome_id: 'B2.a',
    outcome_title: 'Identity and Access Management',
    principle_id: 'B2',
    objective_id: 'B',
    gap_id: 'gap-b2a-001',
    gap_type: 'CONTROL_DEFICIT',
    gap_title: 'Unenforced MFA on Legacy Administrative & RDP Gateways',
    deficit_description:
      'Domain administrative accounts and remote desktop portals lack mandatory hardware/authenticator app MFA.',
    recommendation:
      'Enforce FIDO2 / Microsoft Authenticator conditional access policies across all council administrator endpoints.',
    gap_severity_score: 5,
    gap_severity_level: 'CRITICAL',
    gap_severity_rationale: 'Material technical deficit in core security perimeter (B2) - Not Achieved',
    threat_likelihood_score: 3,
    threat_likelihood_vector: 'Phishing & Credential Theft (High prevalence against council accounts; MFA absence)',
    impacted_service_id: 'svc-demo-planning',
    impacted_service_name: 'Planning Applications & Building Control',
    impacted_service_tier: 'TIER_2',
    service_criticality_weight: 2.0,
    priority_score: 66.7,
    risk_level: 'HIGH',
    suggested_sla_days: 45,
    suggested_sla_label: '45 days',
    evaluated_status: 'NOT_ACHIEVED',
    unmet_igps: [],
    is_stale_evidence: false,
    evidence_count: 0,
  },
  {
    id: 'risk-demo-c1a-waste',
    rank: 5,
    assessment_id: 'ass-demo-001',
    outcome_id: 'C1.a',
    outcome_title: 'Monitoring Coverage & Alerting',
    principle_id: 'C1',
    objective_id: 'C',
    gap_id: 'gap-c1a-001',
    gap_type: 'CONTROL_DEFICIT',
    gap_title: 'Lack of Centralized 24/7 Security Operations Monitoring (SOC)',
    deficit_description:
      'Security event logs from depot endpoints, vehicle telemetry, and routing servers are siloed without automated correlation.',
    recommendation:
      'Onboard endpoint telemetry to Microsoft Sentinel / centralized SIEM with automated out-of-hours alerting rules.',
    gap_severity_score: 4,
    gap_severity_level: 'HIGH',
    gap_severity_rationale: 'Significant operational deficit in defense, data protection, or monitoring',
    threat_likelihood_score: 2,
    threat_likelihood_vector: 'Undetected Intrusion (Lack of centralized SIEM / 24/7 security log monitoring)',
    impacted_service_id: 'svc-demo-waste',
    impacted_service_name: 'Waste Collection & Street Cleansing Routing',
    impacted_service_tier: 'TIER_2',
    service_criticality_weight: 2.0,
    priority_score: 35.6,
    risk_level: 'MEDIUM',
    suggested_sla_days: 90,
    suggested_sla_label: '90 days',
    evaluated_status: 'PARTIALLY_ACHIEVED',
    unmet_igps: [],
    is_stale_evidence: false,
    evidence_count: 0,
  },
  {
    id: 'risk-demo-b2a-wifi',
    rank: 6,
    assessment_id: 'ass-demo-001',
    outcome_id: 'B2.a',
    outcome_title: 'Identity and Access Management',
    principle_id: 'B2',
    objective_id: 'B',
    gap_id: 'gap-b2a-001',
    gap_type: 'CONTROL_DEFICIT',
    gap_title: 'Unenforced MFA on Administrative Portals',
    deficit_description:
      'Public Guest Wi-Fi captive portal management controllers share common administrative credentials without 2FA.',
    recommendation: 'Isolate guest portal management into dedicated subnet and enforce MFA.',
    gap_severity_score: 5,
    gap_severity_level: 'CRITICAL',
    gap_severity_rationale: 'Material technical deficit in core security perimeter (B2) - Not Achieved',
    threat_likelihood_score: 3,
    threat_likelihood_vector: 'Phishing & Credential Theft (High prevalence against council accounts)',
    impacted_service_id: 'svc-demo-wifi',
    impacted_service_name: 'Public Guest Wi-Fi Networks',
    impacted_service_tier: 'TIER_3',
    service_criticality_weight: 1.0,
    priority_score: 33.3,
    risk_level: 'MEDIUM',
    suggested_sla_days: 90,
    suggested_sla_label: '90 days',
    evaluated_status: 'NOT_ACHIEVED',
    unmet_igps: [],
    is_stale_evidence: false,
    evidence_count: 0,
  },
  {
    id: 'risk-demo-a1a-website',
    rank: 7,
    assessment_id: 'ass-demo-001',
    outcome_id: 'A1.a',
    outcome_title: 'Governance Framework',
    principle_id: 'A1',
    objective_id: 'A',
    gap_id: 'gap-a1a-001',
    gap_type: 'EVIDENTIAL_GAP',
    gap_title: 'Unsigned Annual Information Security Policy Charter',
    deficit_description:
      "Outcome evaluated as 'Achieved', but attached approval document expired >12 months ago without signed Cabinet Member endorsement.",
    recommendation: 'Obtain annual signed charter from Chief Executive / Cabinet Member and upload fresh PDF.',
    gap_severity_score: 1,
    gap_severity_level: 'LOW',
    gap_severity_rationale: 'Minor documentation or evidentiary deficit',
    threat_likelihood_score: 1,
    threat_likelihood_vector: 'Internal Governance & Compliance Process (Low direct threat vector exploitability)',
    impacted_service_id: 'svc-demo-website',
    impacted_service_name: 'Council Public Website & News Portal',
    impacted_service_tier: 'TIER_3',
    service_criticality_weight: 1.0,
    priority_score: 2.2,
    risk_level: 'LOW',
    suggested_sla_days: 180,
    suggested_sla_label: '180 days',
    evaluated_status: 'ACHIEVED',
    unmet_igps: [],
    is_stale_evidence: true,
    evidence_count: 1,
  },
];

const INITIAL_SUMMARY: PrioritizedRiskSummary = {
  assessment_id: 'ass-demo-001',
  total_risks: MOCK_DEMO_RISKS.length,
  critical_risks_count: 3,
  high_risks_count: 1,
  medium_risks_count: 2,
  low_risks_count: 1,
  evidential_gaps_count: 1,
  affected_tier_1_services_count: 2,
  heatmap_distribution: {
    L3_I3: 3,
    L3_I2: 1,
    L3_I1: 1,
    L2_I2: 1,
    L1_I1: 1,
    L2_I3: 0,
    L2_I1: 0,
    L1_I3: 0,
    L1_I2: 0,
  },
  risks: MOCK_DEMO_RISKS,
};

export function useGaps() {
  const [summary, setSummary] = useState<PrioritizedRiskSummary>(INITIAL_SUMMARY);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null);
  const [assessments, setAssessments] = useState<Array<{ id: string; title: string }>>([]);

  const [selectedRisk, setSelectedRisk] = useState<PrioritizedRiskItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  const [filters, setFilters] = useState<RiskFilterState>({
    tier: 'ALL',
    gapType: 'ALL',
    objectiveId: 'ALL',
    riskLevel: 'ALL',
    searchQuery: '',
    selectedQuadrant: null,
  });

  const updateFilter = useCallback((key: keyof RiskFilterState, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      tier: 'ALL',
      gapType: 'ALL',
      objectiveId: 'ALL',
      riskLevel: 'ALL',
      searchQuery: '',
      selectedQuadrant: null,
    });
  }, []);

  const openRiskDetail = useCallback((risk: PrioritizedRiskItem) => {
    setSelectedRisk(risk);
    setIsDrawerOpen(true);
  }, []);

  // Fetch assessments and risks from API
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch assessments
      let assId = activeAssessmentId;
      try {
        const assList = await api.get<Array<{ id: string; title: string }>>('/assessments');
        if (Array.isArray(assList) && assList.length > 0) {
          setAssessments(assList);
          if (!assId) {
            assId = assList[0].id;
            setActiveAssessmentId(assId);
          }
        }
      } catch (err) {
        // Backend offline or running in mock mode
        console.warn('Could not fetch assessments from API, using demo context', err);
      }

      // 2. Fetch prioritized risks if assessment ID exists
      if (assId) {
        try {
          const apiSummary = await api.get<PrioritizedRiskSummary>(
            `/assessments/${assId}/prioritized-risks`
          );
          if (apiSummary && Array.isArray(apiSummary.risks)) {
            setSummary(apiSummary);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn('Could not fetch prioritized risks from backend, falling back to demo catalog', err);
        }
      }

      // Fallback to high-fidelity demo catalog
      setSummary(INITIAL_SUMMARY);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load gap analysis data';
      setError(msg);
      setSummary(INITIAL_SUMMARY);
    } finally {
      setLoading(false);
    }
  }, [activeAssessmentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered risks list based on user selections
  const filteredRisks = useMemo(() => {
    if (!summary || !summary.risks) return [];

    return summary.risks.filter((risk) => {
      // Tier filter
      if (filters.tier && filters.tier !== 'ALL' && risk.impacted_service_tier !== filters.tier) {
        return false;
      }

      // Gap type filter
      if (filters.gapType && filters.gapType !== 'ALL' && risk.gap_type !== filters.gapType) {
        return false;
      }

      // Objective filter
      if (
        filters.objectiveId &&
        filters.objectiveId !== 'ALL' &&
        risk.objective_id !== filters.objectiveId
      ) {
        return false;
      }

      // Risk level filter
      if (filters.riskLevel && filters.riskLevel !== 'ALL' && risk.risk_level !== filters.riskLevel) {
        return false;
      }

      // 3x3 Heatmap Quadrant filter (e.g. "L3_I3")
      if (filters.selectedQuadrant) {
        const impactNum =
          risk.impacted_service_tier === 'TIER_1' ? 3 : risk.impacted_service_tier === 'TIER_2' ? 2 : 1;
        const quadrant = `L${risk.threat_likelihood_score}_I${impactNum}`;
        if (quadrant !== filters.selectedQuadrant) {
          return false;
        }
      }

      // Search keyword filter
      if (filters.searchQuery && filters.searchQuery.trim() !== '') {
        const q = filters.searchQuery.toLowerCase();
        const matchesOutcome =
          risk.outcome_id.toLowerCase().includes(q) || risk.outcome_title.toLowerCase().includes(q);
        const matchesTitle = risk.gap_title.toLowerCase().includes(q);
        const matchesService = risk.impacted_service_name.toLowerCase().includes(q);
        const matchesDesc = risk.deficit_description.toLowerCase().includes(q);

        if (!matchesOutcome && !matchesTitle && !matchesService && !matchesDesc) {
          return false;
        }
      }

      return true;
    });
  }, [summary, filters]);

  // Calculate estimated total remediation cost in GBP
  // Standard UK council benchmark: Critical £12,500, High £6,500, Medium £3,000, Low £1,000, Evidential £1,500
  const estimatedRemediationCostGBP = useMemo(() => {
    if (!summary || !summary.risks) return 0;
    const distinctGaps = new Map<string, PrioritizedRiskItem>();
    summary.risks.forEach((r) => {
      if (!distinctGaps.has(r.gap_id)) {
        distinctGaps.set(r.gap_id, r);
      }
    });

    let total = 0;
    distinctGaps.forEach((g) => {
      if (g.gap_type === 'EVIDENTIAL_GAP') {
        total += 1500;
      } else if (g.gap_severity_score === 5) {
        total += 12500;
      } else if (g.gap_severity_score === 4) {
        total += 6500;
      } else if (g.gap_severity_score === 3) {
        total += 3000;
      } else {
        total += 1200;
      }
    });
    return total;
  }, [summary]);

  return {
    summary,
    risks: summary.risks,
    filteredRisks,
    filters,
    setFilters,
    updateFilter,
    resetFilters,
    selectedRisk,
    setSelectedRisk,
    isDrawerOpen,
    setIsDrawerOpen,
    openRiskDetail,
    loading,
    error,
    refetch: fetchData,
    assessments,
    activeAssessmentId,
    setActiveAssessmentId,
    estimatedRemediationCostGBP,
  };
}
