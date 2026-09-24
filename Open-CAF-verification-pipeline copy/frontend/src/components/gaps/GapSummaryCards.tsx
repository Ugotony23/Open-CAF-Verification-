'use client';

import React from 'react';
import {
  ShieldAlert,
  FileQuestion,
  Landmark,
  Coins,
  TrendingUp,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { PrioritizedRiskSummary } from '@/types/risk';

interface GapSummaryCardsProps {
  summary: PrioritizedRiskSummary;
  estimatedCostGBP: number;
}

export function GapSummaryCards({ summary, estimatedCostGBP }: GapSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Critical Risks Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs relative overflow-hidden transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Critical Cyber Risks
          </span>
          <span className="p-2 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50">
            <ShieldAlert className="w-5 h-5" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline space-x-2">
          <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {summary.critical_risks_count}
          </span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300">
            14-day SLA
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center">
          <Clock className="w-3.5 h-3.5 mr-1 text-red-500" />
          Score ≥ 75 on Tier 1 statutory services
        </p>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500" />
      </div>

      {/* 2. Evidential Gaps Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs relative overflow-hidden transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Evidential Blindspots
          </span>
          <span className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
            <FileQuestion className="w-5 h-5" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline space-x-2">
          <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {summary.evidential_gaps_count}
          </span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
            Audit Vulnerability
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center">
          <TrendingUp className="w-3.5 h-3.5 mr-1 text-amber-500" />
          Missing proof or stale documents (&gt;12mo)
        </p>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
      </div>

      {/* 3. Affected Tier 1 Services Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs relative overflow-hidden transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Affected Tier 1 Services
          </span>
          <span className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50">
            <Landmark className="w-5 h-5" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline space-x-2">
          <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {summary.affected_tier_1_services_count}
          </span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300">
            Life &amp; Welfare
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-indigo-500" />
          Social Care, Benefits, Elections &amp; Payments
        </p>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500" />
      </div>

      {/* 4. Total Estimated Remediation Cost Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs relative overflow-hidden transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Est. Remediation Budget
          </span>
          <span className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
            <Coins className="w-5 h-5" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline space-x-2">
          <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
            £{estimatedCostGBP.toLocaleString()}
          </span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300">
            Sec 151 Reserve
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center">
          <Coins className="w-3.5 h-3.5 mr-1 text-emerald-500" />
          Calculated across active technical deficits
        </p>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
      </div>
    </div>
  );
}
