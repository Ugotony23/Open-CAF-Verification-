'use client';

import React from 'react';
import Link from 'next/link';
import { Flame, ArrowLeft } from 'lucide-react';

export default function RiskPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <div className="flex items-center space-x-2 text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
          <Flame className="w-4 h-4" />
          <span>Council Risk Prioritisation</span>
        </div>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
          Tier 1-3 Citizen Service Risk Matrix
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
          Contextual risk algorithm weighting CAF gaps by Local Authority service criticality (Adult Social Care, Electoral Roll, Housing, Council Tax).
        </p>
        <div className="mt-6 p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 flex items-center justify-between">
          <span>Scheduled for Steps 13-14: Council Risk Prioritization Engine & Interactive Heatmap</span>
          <Link
            href="/dashboard"
            className="font-semibold text-rose-700 dark:text-rose-400 hover:underline inline-flex items-center"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
