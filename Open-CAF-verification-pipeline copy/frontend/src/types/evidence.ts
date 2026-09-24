/**
 * Frontend Type Definitions for Evidence Vault
 */

export type EvidenceCategory =
  | 'POLICY'
  | 'VULNERABILITY_SCAN'
  | 'PENTEST_REPORT'
  | 'INCIDENT_DRILL'
  | 'ARCHITECTURE_DIAGRAM'
  | 'AUDIT_LOG'
  | 'THIRD_PARTY_ASSURANCE';

export interface EvidenceItem {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  category: EvidenceCategory;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  sha256_hash: string;
  external_url?: string;
  valid_from?: string;
  valid_to?: string;
  uploaded_by_user_id?: string;
  created_at: string;
  updated_at: string;
  is_stale: boolean;
  is_expiring_soon: boolean;
  linked_outcome_ids: string[];
}

export interface EvidenceStats {
  totalFiles: number;
  freshCount: number;
  expiringSoonCount: number;
  staleCount: number;
  coverageRate: number;
}
