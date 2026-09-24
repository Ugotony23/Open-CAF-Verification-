'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CircleDashed,
  FileText,
  Paperclip,
  Save,
  Check,
  ExternalLink,
  BookOpen,
  Plus,
} from 'lucide-react';
import { AssessmentOutcome, OutcomeStatus } from '@/types/assessment';
import { IGPChecklist } from './IGPChecklist';

interface OutcomeDetailProps {
  outcome: AssessmentOutcome | null;
  onStatusChange: (outcomeId: string, status: OutcomeStatus) => void;
  onToggleIGP: (outcomeId: string, igpId: string) => void;
  onRationaleChange: (outcomeId: string, rationale: string) => void;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
}

export function OutcomeDetail({
  outcome,
  onStatusChange,
  onToggleIGP,
  onRationaleChange,
  saveStatus,
}: OutcomeDetailProps) {
  if (!outcome) {
    return (
      <div className="h-full flex items-center justify-center p-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
        <div className="max-w-sm">
          <BookOpen className="w-10 h-10 mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No Outcome Selected
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Select a Contributing Outcome from the tree on the left to review indicators and record evidence.
          </p>
        </div>
      </div>
    );
  }

  const statusOptions: Array<{
    value: OutcomeStatus;
    label: string;
    description: string;
    color: string;
    activeBg: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      value: 'ACHIEVED',
      label: 'Achieved',
      description: 'Fully satisfies all NCSC indicators and local authority standards',
      color: 'text-emerald-700 dark:text-emerald-400',
      activeBg: 'bg-emerald-600 text-white border-emerald-600 shadow-sm',
      icon: ShieldCheck,
    },
    {
      value: 'PARTIALLY_ACHIEVED',
      label: 'Partially Achieved',
      description: 'Minimum requirements met; residual gaps tracked in action plan',
      color: 'text-amber-700 dark:text-amber-400',
      activeBg: 'bg-amber-500 text-white border-amber-500 shadow-sm',
      icon: AlertTriangle,
    },
    {
      value: 'NOT_ACHIEVED',
      label: 'Not Achieved',
      description: 'Significant vulnerability or control deficit requiring remediation',
      color: 'text-rose-700 dark:text-rose-400',
      activeBg: 'bg-rose-600 text-white border-rose-600 shadow-sm',
      icon: XCircle,
    },
    {
      value: 'NOT_STARTED',
      label: 'Not Assessed',
      description: 'Awaiting evidence gathering and lead assessor review',
      color: 'text-slate-500',
      activeBg: 'bg-slate-700 text-white border-slate-700 shadow-sm',
      icon: CircleDashed,
    },
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Top Banner: Code, Title, and Save Status */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded-md bg-govuk-blue text-white font-mono text-xs font-bold shadow-xs">
              {outcome.outcome_id}
            </span>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Contributing Outcome
            </span>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            {saveStatus === 'saving' && (
              <span className="text-amber-600 dark:text-amber-400 flex items-center">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping mr-1.5" />
                Auto-saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center font-medium">
                <Check className="w-3.5 h-3.5 mr-1" />
                All changes saved
              </span>
            )}
          </div>
        </div>

        <h2 className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {outcome.outcome_title || outcome.outcome_id}
        </h2>

        {outcome.outcome_description && (
          <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {outcome.outcome_description}
          </p>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Section 1: Assessment Status Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Assessment Decision Status
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {statusOptions.map((opt) => {
              const Icon = opt.icon;
              const isCurrent = outcome.status === opt.value;

              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onStatusChange(outcome.outcome_id, opt.value)}
                  className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                    isCurrent
                      ? opt.activeBg
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-slate-400 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className={`w-4 h-4 ${isCurrent ? 'text-white' : opt.color}`} />
                    <span className="text-xs font-bold">{opt.label}</span>
                  </div>
                  <p
                    className={`mt-1.5 text-[11px] leading-tight line-clamp-2 ${
                      isCurrent ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {opt.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: IGP Checklist */}
        <IGPChecklist
          outcomeId={outcome.outcome_id}
          checks={outcome.igp_checks}
          onToggle={onToggleIGP}
        />

        {/* Section 3: Assessor Rationale & Audit Review */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Assessor Rationale & Audit Justification
            </label>
            <span className="text-[11px] text-slate-400">
              Supports Markdown formatting
            </span>
          </div>

          <textarea
            rows={4}
            value={outcome.assessor_rationale || ''}
            onChange={(e) => onRationaleChange(outcome.outcome_id, e.target.value)}
            placeholder="Explain the technical evidence, sampling method, and council context supporting this evaluation..."
            className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-govuk-blue resize-y leading-relaxed"
          />
        </div>

        {/* Section 4: Attached Cryptographic Evidence */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Paperclip className="w-4 h-4 text-govuk-blue dark:text-sky-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Attached Audit Evidence (Evidence Vault)
              </h4>
            </div>

            <Link
              href="/evidence"
              className="inline-flex items-center px-2.5 py-1 rounded-md bg-govuk-blue text-white text-[11px] font-semibold hover:bg-govuk-blueHover transition-colors"
            >
              <Plus className="w-3 h-3 mr-1" />
              <span>Attach Evidence</span>
            </Link>
          </div>

          {outcome.evidence_files && outcome.evidence_files.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {outcome.evidence_files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-xs">
                    {file.filename}
                  </span>
                  {file.category && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {file.category}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
              No direct audit proof attached yet. Click &apos;+ Attach Evidence&apos; or upload in the Evidence Vault to satisfy statutory audit standards.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
