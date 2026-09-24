'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Database, FileCheck, ArrowRight, Building2, CheckCircle2, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const { tenant } = useAuth();

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4">
      {/* Hero Welcome Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-10 shadow-xs relative overflow-hidden">
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/70 text-govuk-blue dark:text-sky-300 text-xs font-semibold mb-4 border border-blue-200 dark:border-blue-800/60">
            <ShieldCheck className="w-4 h-4" />
            <span>NCSC CAF v4.0 Operational Platform</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Assurance & Remediation Platform for UK Councils
          </h1>

          <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            Welcome to {tenant?.name || 'Borsetshire Council'}. Streamline cyber risk posture, maintain cryptographic audit evidence for statutory citizen services, and track remediation plans aligned with MHCLG standards.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-govuk-blue hover:bg-govuk-blueHover text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <span>Go to Executive Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/assessments"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-govuk-blue dark:text-sky-400" />
              <span>Open CAF Assessment Matrix</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 3 Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-govuk-blue dark:text-sky-400 flex items-center justify-center mb-3">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            CAF v4.0 Assessment Engine
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Covers all 4 Objectives, 14 Principles, and 39 Contributing Outcomes evaluated with granular IGPs.
          </p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
            <Database className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Cryptographic Evidence Vault
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Tamper-evident SHA-256 storage, multi-tagging, and 365-day statutory freshness verification.
          </p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
            <FileCheck className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Council Risk Prioritisation
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Tier 1-3 statutory citizen services weighting (Social Care, Elections, Housing) and Kanban trackers.
          </p>
        </div>
      </div>
    </div>
  );
}
