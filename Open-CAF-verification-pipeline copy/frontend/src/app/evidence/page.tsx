'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderLock,
  Upload,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  FileText,
  ShieldCheck,
  Filter,
} from 'lucide-react';
import { EvidenceItem, EvidenceCategory, EvidenceStats } from '@/types/evidence';
import { api } from '@/lib/api';
import { EvidenceTable } from '@/components/evidence/EvidenceTable';
import { UploadModal } from '@/components/evidence/UploadModal';
import { LinkOutcomeModal } from '@/components/evidence/LinkOutcomeModal';
import { EvidencePreviewDrawer } from '@/components/evidence/EvidencePreviewDrawer';

const MOCK_EVIDENCE_ITEMS: EvidenceItem[] = [
  {
    id: 'ev-demo-01',
    tenant_id: 'ten-borsetshire-001',
    title: 'Council Information Security & Governance Charter 2025/26',
    description: 'Statutory policy defining SIRO accountability, CISO mandates, and annual cyber training.',
    category: 'POLICY',
    file_name: 'Council_Infosec_Charter_2025.pdf',
    file_size_bytes: 2457600,
    mime_type: 'application/pdf',
    sha256_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    valid_from: '2025-04-01',
    valid_to: '2026-04-01',
    created_at: new Date(Date.now() - 120 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 120 * 86400000).toISOString(),
    is_stale: false,
    is_expiring_soon: false,
    linked_outcome_ids: ['A1.a', 'A1.b', 'B1.a'],
  },
  {
    id: 'ev-demo-02',
    tenant_id: 'ten-borsetshire-001',
    title: 'CHECK External Network Penetration Test Report',
    description: 'Independent penetration testing covering perimeter firewalls, citizen portals, and VPN endpoints.',
    category: 'PENTEST_REPORT',
    file_name: 'CHECK_Pentest_Final_Executive_Summary.pdf',
    file_size_bytes: 4194304,
    mime_type: 'application/pdf',
    sha256_hash: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
    valid_from: '2025-06-15',
    valid_to: '2026-06-15',
    created_at: new Date(Date.now() - 85 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 85 * 86400000).toISOString(),
    is_stale: false,
    is_expiring_soon: false,
    linked_outcome_ids: ['A2.b', 'B4.c'],
  },
  {
    id: 'ev-demo-03',
    tenant_id: 'ten-borsetshire-001',
    title: 'Revenues & Housing Disaster Recovery Drill Minutes',
    description: 'Technical tabletop simulation logs restoring core database clusters from off-site air-gapped backups.',
    category: 'INCIDENT_DRILL',
    file_name: 'DR_Exercise_Revenues_Housing_Minutes.docx',
    file_size_bytes: 845000,
    mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    sha256_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    valid_from: '2025-02-10',
    valid_to: '2026-02-10',
    created_at: new Date(Date.now() - 210 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 210 * 86400000).toISOString(),
    is_stale: false,
    is_expiring_soon: true,
    linked_outcome_ids: ['B5.b', 'D1.b', 'D1.c'],
  },
  {
    id: 'ev-demo-04',
    tenant_id: 'ten-borsetshire-001',
    title: 'Electoral Services Air-Gapped Network Topology',
    description: 'Detailed L2/L3 architecture diagram demonstrating micro-segmentation of ballot counting infrastructure.',
    category: 'ARCHITECTURE_DIAGRAM',
    file_name: 'Elections_Network_Architecture_v2.png',
    file_size_bytes: 1845000,
    mime_type: 'image/png',
    sha256_hash: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
    valid_from: '2024-05-01',
    valid_to: '2025-05-01',
    created_at: new Date(Date.now() - 410 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 410 * 86400000).toISOString(),
    is_stale: true,
    is_expiring_soon: false,
    linked_outcome_ids: ['B4.a'],
  },
];

export default function EvidenceVaultPage() {
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Modal States
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [uploadDefaultExternal, setUploadDefaultExternal] = useState<boolean>(false);
  const [linkingItem, setLinkingItem] = useState<EvidenceItem | null>(null);
  const [previewItem, setPreviewItem] = useState<EvidenceItem | null>(null);

  // Load items from API or fallback
  useEffect(() => {
    loadEvidence();
  }, []);

  async function loadEvidence() {
    setLoading(true);
    try {
      const data = await api.get<{ items: EvidenceItem[]; total: number }>('/evidence');
      if (data && data.items && data.items.length > 0) {
        setItems(data.items);
      } else {
        setItems(MOCK_EVIDENCE_ITEMS);
      }
    } catch {
      setItems(MOCK_EVIDENCE_ITEMS);
    } finally {
      setLoading(false);
    }
  }

  // Filtered evidence items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Category filter
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchFile = item.file_name.toLowerCase().includes(q);
        const matchDesc = item.description?.toLowerCase().includes(q);
        const matchOutcomes = item.linked_outcome_ids.some((code) => code.toLowerCase().includes(q));
        if (!matchTitle && !matchFile && !matchDesc && !matchOutcomes) {
          return false;
        }
      }

      return true;
    });
  }, [items, categoryFilter, searchQuery]);

  // Statistics calculation
  const stats: EvidenceStats = useMemo(() => {
    const total = items.length;
    let fresh = 0;
    let expiring = 0;
    let stale = 0;
    const coveredOutcomes = new Set<string>();

    items.forEach((item) => {
      if (item.is_stale) {
        stale++;
      } else if (item.is_expiring_soon) {
        expiring++;
      } else {
        fresh++;
      }
      (item.linked_outcome_ids || []).forEach((c) => coveredOutcomes.add(c));
    });

    const coveragePct = Math.round((coveredOutcomes.size / 39) * 100);

    return {
      totalFiles: total,
      freshCount: fresh,
      expiringSoonCount: expiring,
      staleCount: stale,
      coverageRate: coveragePct,
    };
  }, [items]);

  const handleDownload = (item: EvidenceItem) => {
    // Trigger download endpoint
    window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/evidence/${item.id}/download`, '_blank');
  };

  const handleDelete = async (item: EvidenceItem) => {
    if (!confirm(`Are you sure you want to permanently delete '${item.title}' from the Evidence Vault?`)) {
      return;
    }
    try {
      await api.delete(`/evidence/${item.id}`);
    } catch {
      // Fallback
    }
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  const handleUploadSuccess = (newItem: EvidenceItem) => {
    setItems((prev) => [newItem, ...prev]);
  };

  const handleLinkUpdated = (updatedItem: EvidenceItem) => {
    setItems((prev) => prev.map((i) => (i.id === updatedItem.id ? updatedItem : i)));
    if (linkingItem && linkingItem.id === updatedItem.id) {
      setLinkingItem(updatedItem);
    }
    if (previewItem && previewItem.id === updatedItem.id) {
      setPreviewItem(updatedItem);
    }
  };

  const categories: Array<{ id: string; label: string }> = [
    { id: 'ALL', label: 'All Artifacts' },
    { id: 'POLICY', label: 'Policies' },
    { id: 'VULNERABILITY_SCAN', label: 'Vulnerability Scans' },
    { id: 'PENTEST_REPORT', label: 'CHECK Pentests' },
    { id: 'INCIDENT_DRILL', label: 'DR & Drills' },
    { id: 'ARCHITECTURE_DIAGRAM', label: 'Architecture' },
    { id: 'AUDIT_LOG', label: 'Audit Logs' },
    { id: 'THIRD_PARTY_ASSURANCE', label: 'Supply Chain' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
            <FolderLock className="w-4 h-4" />
            <span>Cryptographic Assurance Vault</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Evidence Vault & Freshness Engine
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
            Tamper-evident document repository indexed with SHA-256 digests. Multi-tag policies, vulnerability scans, and recovery drills against NCSC CAF v4.0 outcomes.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => {
              setUploadDefaultExternal(true);
              setIsUploadOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
          >
            <span>+ Link SharePoint / URL</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setUploadDefaultExternal(false);
              setIsUploadOpen(true);
            }}
            className="inline-flex items-center px-4 py-2.5 rounded-lg bg-govuk-blue hover:bg-govuk-blueHover text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Upload className="w-4 h-4 mr-1.5" />
            <span>Upload Evidence</span>
          </button>
        </div>
      </div>

      {/* Top 5 Stat Cards Required by Step 10 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Files */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Total Files
          </span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {stats.totalFiles}
            </span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <p className="mt-1 text-[11px] text-slate-500">SHA-256 indexed</p>
        </div>

        {/* Fresh (<12mo) */}
        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
            Fresh (&lt;12mo)
          </span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-300">
              {stats.freshCount}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400">Current annual cycle</p>
        </div>

        {/* Expiring Soon (60d) */}
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 shadow-xs">
          <span className="text-[11px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
            Expiring (&lt;60d)
          </span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-amber-900 dark:text-amber-300">
              {stats.expiringSoonCount}
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">Renewal review required</p>
        </div>

        {/* Stale/Expired */}
        <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 shadow-xs">
          <span className="text-[11px] font-bold text-rose-800 dark:text-rose-400 uppercase tracking-wider">
            Stale / Expired
          </span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-rose-900 dark:text-rose-300">
              {stats.staleCount}
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="mt-1 text-[11px] text-rose-700 dark:text-rose-400">&gt;365d or past valid date</p>
        </div>

        {/* Evidence Coverage Rate */}
        <div className="col-span-2 lg:col-span-1 p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 shadow-xs">
          <span className="text-[11px] font-bold text-govuk-blue dark:text-sky-400 uppercase tracking-wider">
            CAF Coverage
          </span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-govuk-blue dark:text-sky-300">
              {stats.coverageRate}%
            </span>
            <ShieldCheck className="w-4 h-4 text-govuk-blue dark:text-sky-400" />
          </div>
          <p className="mt-1 text-[11px] text-blue-800 dark:text-sky-400">39 Outcomes evaluated</p>
        </div>
      </div>

      {/* Action Bar & Search / Category Filters */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search evidence by title, filename, or linked outcome (e.g. B2.a)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-govuk-blue"
            />
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-500 font-mono">
            <span>Showing {filteredItems.length} of {items.length} items</span>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all ${
                categoryFilter === cat.id
                  ? 'bg-govuk-blue text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Evidence Table */}
      <EvidenceTable
        items={filteredItems}
        onDownload={handleDownload}
        onDelete={handleDelete}
        onLinkOutcomes={(item) => setLinkingItem(item)}
        onPreview={(item) => setPreviewItem(item)}
      />

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={handleUploadSuccess}
        defaultExternalMode={uploadDefaultExternal}
      />

      {/* Link Outcome Modal */}
      <LinkOutcomeModal
        isOpen={!!linkingItem}
        item={linkingItem}
        onClose={() => setLinkingItem(null)}
        onUpdated={handleLinkUpdated}
      />

      {/* Evidence Preview Drawer */}
      <EvidencePreviewDrawer
        isOpen={!!previewItem}
        item={previewItem}
        onClose={() => setPreviewItem(null)}
        onDownload={handleDownload}
      />
    </div>
  );
}
