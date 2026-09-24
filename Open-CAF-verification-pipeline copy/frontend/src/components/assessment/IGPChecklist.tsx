'use client';

import React from 'react';
import { CheckSquare, Square, ShieldCheck, AlertCircle } from 'lucide-react';
import { IGPCheck } from '@/types/assessment';

interface IGPChecklistProps {
  outcomeId: string;
  checks: IGPCheck[];
  onToggle: (outcomeId: string, igpId: string) => void;
}

export function IGPChecklist({ outcomeId, checks, onToggle }: IGPChecklistProps) {
  const achievedChecks = checks.filter((c) => c.level === 'ACHIEVED');
  const partiallyChecks = checks.filter((c) => c.level === 'PARTIALLY_ACHIEVED');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Indicators of Good Practice (IGP Checklist)
        </h4>
        <span className="text-[11px] text-slate-500 font-mono">
          {checks.filter((c) => c.is_satisfied).length} of {checks.length} Satisfied
        </span>
      </div>

      {/* Achieved Level Criteria */}
      <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20 p-3.5">
        <div className="flex items-center space-x-2 mb-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
            Achieved Level Requirements
          </span>
        </div>

        {achievedChecks.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No specific achieved criteria defined.</p>
        ) : (
          <div className="space-y-2">
            {achievedChecks.map((check) => (
              <label
                key={check.igp_id}
                className={`flex items-start space-x-2.5 p-2.5 rounded-md border cursor-pointer transition-all ${
                  check.is_satisfied
                    ? 'bg-emerald-100/70 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={check.is_satisfied}
                  onChange={() => onToggle(outcomeId, check.igp_id)}
                  className="sr-only"
                />
                <div className="mt-0.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400">
                  {check.is_satisfied ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div className="text-xs leading-relaxed select-none">
                  {check.description}
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Partially Achieved Level Criteria */}
      <div className="rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20 p-3.5">
        <div className="flex items-center space-x-2 mb-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
            Partially Achieved Minimum Criteria
          </span>
        </div>

        {partiallyChecks.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No specific partially achieved criteria defined.</p>
        ) : (
          <div className="space-y-2">
            {partiallyChecks.map((check) => (
              <label
                key={check.igp_id}
                className={`flex items-start space-x-2.5 p-2.5 rounded-md border cursor-pointer transition-all ${
                  check.is_satisfied
                    ? 'bg-amber-100/70 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={check.is_satisfied}
                  onChange={() => onToggle(outcomeId, check.igp_id)}
                  className="sr-only"
                />
                <div className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400">
                  {check.is_satisfied ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div className="text-xs leading-relaxed select-none">
                  {check.description}
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
