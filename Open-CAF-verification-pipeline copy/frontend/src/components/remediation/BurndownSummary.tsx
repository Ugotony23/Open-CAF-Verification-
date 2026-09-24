'use client';

import React from 'react';
import { RemediationSummary } from '@/types/remediation';
import {
  PoundSterling,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

interface BurndownSummaryProps {
  summary: RemediationSummary;
}

export function BurndownSummary({ summary }: BurndownSummaryProps) {
  const percentComplete =
    summary.total_tasks > 0
      ? Math.round((summary.completed_tasks / summary.total_tasks) * 100)
      : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Budget Required */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Budget
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <PoundSterling className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              £{summary.total_budget_required_gbp.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Across all council deficits
            </p>
          </div>
        </div>

        {/* Total Effort Hours */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Effort
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {summary.total_estimated_effort_hours.toFixed(0)}{' '}
              <span className="text-sm font-semibold text-slate-500">hrs</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {(summary.total_estimated_effort_hours / 7.5).toFixed(1)} council person-days
            </p>
          </div>
        </div>

        {/* Open Tasks */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Open Tasks
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {summary.open_tasks}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {summary.in_progress_tasks} currently in progress
            </p>
          </div>
        </div>

        {/* Completed Tasks */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Completed
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {summary.completed_tasks} / {summary.total_tasks}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Audit-ready sign-offs
            </p>
          </div>
        </div>

        {/* Burndown Velocity */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Burndown Velocity
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {percentComplete}%
              </span>
              <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                complete
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-1.5">
              <div
                className="bg-purple-600 dark:bg-purple-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${percentComplete}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* SLA & Health Bar */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">SLA Target Compliance:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {summary.sla_compliance_rate}%
            </span>
          </div>

          {summary.overdue_tasks_count > 0 ? (
            <div className="flex items-center space-x-1.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-md font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{summary.overdue_tasks_count} overdue task{summary.overdue_tasks_count > 1 ? 's' : ''}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>All tasks on schedule</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3 text-slate-500 dark:text-slate-400">
          <span>Priority Distribution:</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300">
            {summary.by_priority.CRITICAL || 0} Critical
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
            {summary.by_priority.HIGH || 0} High
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
            {summary.by_priority.MEDIUM || 0} Medium
          </span>
        </div>
      </div>
    </div>
  );
}
