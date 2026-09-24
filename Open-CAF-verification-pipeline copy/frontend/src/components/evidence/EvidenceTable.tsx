'use client';

import React, { useState } from 'react';
import {
  FileText,
  Download,
  Trash2,
  Link as LinkIcon,
  Eye,
  Copy,
  Check,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Shield,
  MoreVertical,
} from 'lucide-react';
import { EvidenceItem, EvidenceCategory } from '@/types/evidence';

interface EvidenceTableProps {
  items: EvidenceItem[];
  onDownload: (item: EvidenceItem) => void;
  onDelete: (item: EvidenceItem) => void;
  onLinkOutcomes: (item: EvidenceItem) => void;
  onPreview: (item: EvidenceItem) => void;
}

export function EvidenceTable({
  items,
  onDownload,
  onDelete,
  onLinkOutcomes,
  onPreview,
}: EvidenceTableProps) {
  const [copiedHashId, setCopiedHashId] = useState<string | null>(null);

  const copyToClipboard = (hash: string, id: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHashId(id);
    setTimeout(() => setCopiedHashId(null), 2000);
  };

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getCategoryBadge = (category: EvidenceCategory) => {
    switch (category) {
      case 'POLICY':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'VULNERABILITY_SCAN':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'PENTEST_REPORT':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'INCIDENT_DRILL':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'ARCHITECTURE_DIAGRAM':
        return 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800';
      case 'AUDIT_LOG':
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
      case 'THIRD_PARTY_ASSURANCE':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200';
    }
  };

  const getCategoryLabel = (category: string) => {
    return category.replace(/_/g, ' ');
  };

  if (items.length === 0) {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
          No Evidence Documents Found
        </h3>
        <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
          No artifacts match the selected filters. Upload security policies, penetration test results, or architecture diagrams to populate the vault.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <tr>
              <th scope="col" className="px-4 py-3.5">
                Evidence Document
              </th>
              <th scope="col" className="px-4 py-3.5">
                Category
              </th>
              <th scope="col" className="px-4 py-3.5">
                Linked CAF Outcomes
              </th>
              <th scope="col" className="px-4 py-3.5">
                Freshness Status
              </th>
              <th scope="col" className="px-4 py-3.5">
                Tamper Checksum (SHA-256)
              </th>
              <th scope="col" className="px-4 py-3.5 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {items.map((item) => {
              return (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* Title & Description */}
                  <td className="px-4 py-3.5 max-w-sm">
                    <div className="flex items-start space-x-2.5">
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 mt-0.5 flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <button
                          type="button"
                          onClick={() => onPreview(item)}
                          className="font-bold text-slate-900 dark:text-white hover:text-govuk-blue dark:hover:text-sky-400 text-xs text-left truncate block max-w-xs transition-colors"
                          title={item.title}
                        >
                          {item.title}
                        </button>
                        <div className="flex items-center space-x-2 mt-0.5 text-[11px] text-slate-500 truncate">
                          <span className="truncate">{item.file_name}</span>
                          <span>•</span>
                          <span>{formatBytes(item.file_size_bytes)}</span>
                        </div>
                        {item.description && (
                          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Category Badge */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span
                      className={`inline-block px-2 py-0.5 rounded border text-[10px] font-mono font-bold tracking-tight ${getCategoryBadge(
                        item.category
                      )}`}
                    >
                      {getCategoryLabel(item.category)}
                    </span>
                  </td>

                  {/* Linked CAF Outcomes */}
                  <td className="px-4 py-3.5 max-w-xs">
                    {item.linked_outcome_ids && item.linked_outcome_ids.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {item.linked_outcome_ids.map((code) => (
                          <button
                            key={code}
                            type="button"
                            onClick={() => onLinkOutcomes(item)}
                            className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 text-govuk-blue dark:text-sky-300 font-mono text-[10px] font-bold hover:bg-blue-100 transition-colors"
                            title={`Linked to CAF Outcome ${code}. Click to edit links.`}
                          >
                            {code}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onLinkOutcomes(item)}
                        className="inline-flex items-center text-[11px] text-slate-400 hover:text-govuk-blue dark:hover:text-sky-400 transition-colors italic"
                      >
                        <LinkIcon className="w-3 h-3 mr-1" />
                        <span>Link to CAF</span>
                      </button>
                    )}
                  </td>

                  {/* Freshness Badge */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {item.is_stale ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        <span>Expired (&gt;1y / Past Valid)</span>
                      </span>
                    ) : item.is_expiring_soon ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                        <Clock className="w-3 h-3 mr-1" />
                        <span>Expiring Soon (&lt;60d)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        <span>Fresh (&lt;12mo)</span>
                      </span>
                    )}
                  </td>

                  {/* SHA-256 Checksum Snippet */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center space-x-1.5">
                      <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {item.sha256_hash ? `${item.sha256_hash.slice(0, 8)}...${item.sha256_hash.slice(-6)}` : 'N/A'}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(item.sha256_hash, item.id)}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        title="Copy complete SHA-256 hash"
                      >
                        {copiedHashId === item.id ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* Action Menu */}
                  <td className="px-4 py-3.5 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <button
                        type="button"
                        onClick={() => onPreview(item)}
                        className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                        title="Preview Details & Citations"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onLinkOutcomes(item)}
                        className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-govuk-blue dark:hover:text-sky-400 transition-colors"
                        title="Link to CAF Outcomes"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDownload(item)}
                        className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-emerald-600 transition-colors"
                        title="Download Document"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(item)}
                        className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-rose-600 transition-colors"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
