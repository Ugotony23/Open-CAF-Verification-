'use client';

import React, { useState } from 'react';
import {
  X,
  FileText,
  Download,
  Copy,
  Check,
  ShieldCheck,
  Calendar,
  Layers,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { EvidenceItem } from '@/types/evidence';

interface EvidencePreviewDrawerProps {
  item: EvidenceItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (item: EvidenceItem) => void;
}

export function EvidencePreviewDrawer({
  item,
  isOpen,
  onClose,
  onDownload,
}: EvidencePreviewDrawerProps) {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen || !item) return null;

  const copyChecksum = () => {
    navigator.clipboard.writeText(item.sha256_hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity"
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-start justify-between">
          <div className="flex items-start space-x-3 truncate">
            <div className="p-2 rounded-xl bg-govuk-blue text-white shadow-xs mt-0.5">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {item.category.replace(/_/g, ' ')}
              </span>
              <h3 className="mt-1 text-base font-bold text-slate-900 dark:text-white truncate">
                {item.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Freshness Status Banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between ${
              item.is_stale
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
                : item.is_expiring_soon
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200'
                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              {item.is_stale ? (
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              ) : item.is_expiring_soon ? (
                <Clock className="w-4 h-4 text-amber-600" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
              <span className="text-xs font-bold">
                {item.is_stale
                  ? 'Expired (>365d or Past Valid Date)'
                  : item.is_expiring_soon
                  ? 'Expiring Soon (Within 60 Days)'
                  : 'Statutorily Fresh (<12 Months)'}
              </span>
            </div>
          </div>

          {/* Description */}
          {item.description && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Executive Description
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                {item.description}
              </p>
            </div>
          )}

          {/* SHA-256 Tamper Proof */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-govuk-blue dark:text-sky-400" />
                <span>SHA-256 Cryptographic Checksum</span>
              </h4>
              <button
                type="button"
                onClick={copyChecksum}
                className="text-[11px] font-semibold text-govuk-blue dark:text-sky-400 hover:underline flex items-center space-x-1"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Full Hash</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-slate-800 dark:text-slate-200 break-all border border-slate-200 dark:border-slate-700 select-all">
              {item.sha256_hash}
            </div>
          </div>

          {/* Technical Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px] font-bold uppercase">
                Original Filename
              </span>
              <span className="font-semibold text-slate-900 dark:text-white truncate block mt-0.5">
                {item.file_name}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px] font-bold uppercase">
                File Size & MIME
              </span>
              <span className="font-semibold text-slate-900 dark:text-white truncate block mt-0.5">
                {formatBytes(item.file_size_bytes)} ({item.mime_type.split('/')[1] || 'bin'})
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px] font-bold uppercase">
                Uploaded On
              </span>
              <span className="font-semibold text-slate-900 dark:text-white truncate block mt-0.5">
                {new Date(item.created_at).toLocaleDateString('en-GB')}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px] font-bold uppercase">
                Validity Target
              </span>
              <span className="font-semibold text-slate-900 dark:text-white truncate block mt-0.5">
                {item.valid_to ? new Date(item.valid_to).toLocaleDateString('en-GB') : 'Annual Cycle'}
              </span>
            </div>
          </div>

          {/* Linked CAF Contributing Outcomes */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-govuk-blue dark:text-sky-400" />
              <span>Assigned CAF Outcomes ({item.linked_outcome_ids.length})</span>
            </h4>

            {item.linked_outcome_ids && item.linked_outcome_ids.length > 0 ? (
              <div className="space-y-1.5">
                {item.linked_outcome_ids.map((code) => (
                  <div
                    key={code}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex items-center space-x-2"
                  >
                    <span className="px-2 py-0.5 rounded bg-govuk-blue text-white font-mono text-[10px] font-bold">
                      {code}
                    </span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Contributing Outcome {code}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Not yet linked to any CAF outcomes.
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
          {item.external_url ? (
            <a
              href={item.external_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center text-xs font-semibold text-govuk-blue hover:underline"
            >
              <span>Open External Resource</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </a>
          ) : (
            <span className="text-xs text-slate-400 font-mono">Tamper-Verified</span>
          )}

          <button
            type="button"
            onClick={() => onDownload(item)}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-govuk-blue hover:bg-govuk-blueHover text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span>Download Original File</span>
          </button>
        </div>
      </div>
    </>
  );
}
