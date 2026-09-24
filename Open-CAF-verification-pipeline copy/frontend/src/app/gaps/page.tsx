'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  AlertTriangle,
  Flame,
  CheckCircle2,
  RefreshCw,
  Download,
  Plus,
  ArrowLeft,
  Building2,
} from 'lucide-react';
import { useGaps } from '@/hooks/useGaps';
import { GapSummaryCards } from '@/components/gaps/GapSummaryCards';
import { RiskHeatmap } from '@/components/gaps/RiskHeatmap';
import { RiskRegisterTable } from '@/components/gaps/RiskRegisterTable';
import { GapDetailDrawer } from '@/components/gaps/GapDetailDrawer';
import { CopilotDrawer } from '@/components/ai/CopilotDrawer';
import { PrioritizedRiskItem } from '@/types/risk';

export default function GapsPage() {
  const {
    summary,
    filteredRisks,
    filters,
    updateFilter,
    resetFilters,
    selectedRisk,
    isDrawerOpen,
    setIsDrawerOpen,
    openRiskDetail,
    loading,
    error,
    refetch,
    assessments,
    activeAssessmentId,
    setActiveAssessmentId,
    estimatedRemediationCostGBP,
  } = useGaps();

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleCreateTask = (risk: PrioritizedRiskItem) => {
    setToastMessage(`Remediation Task drafted for "${risk.outcome_id}: ${risk.gap_title}"`);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-3 rounded-xl shadow-xl flex items-center space-x-3 text-xs font-semibold animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
          <Link
            href="/remediation"
            className="ml-2 underline text-blue-300 dark:text-blue-700 hover:text-white dark:hover:text-black"
          >
            View in Remediation Tracker →
          </Link>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" />
              <span>Council Impact Matrix &amp; Cyber Risk Prioritisation</span>
            </div>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
              Assurance Gaps &amp; Risk Register
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
              Mathematical risk prioritisation multiplying NCSC CAF Gap Severity (1-5) by Council Service Criticality (1.0-3.0) by Threat Likelihood (1-3).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Assessment Selector if available */}
            {assessments && assessments.length > 1 && (
              <select
                value={activeAssessmentId || ''}
                onChange={(e) => setActiveAssessmentId(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200"
              >
                {assessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => refetch()}
              disabled={loading}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              title="Refresh risks"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <Link
              href="/remediation"
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center transition-colors"
            >
              Remediation Action Plan →
            </Link>
          </div>
        </div>
      </div>

      {/* 1. Top Summary KPI Cards */}
      <GapSummaryCards
        summary={summary}
        estimatedCostGBP={estimatedRemediationCostGBP}
      />

      {/* 2. Interactive 3x3 Heatmap Grid */}
      <RiskHeatmap
        summary={summary}
        selectedQuadrant={filters.selectedQuadrant || null}
        onSelectQuadrant={(quadrantKey) => updateFilter('selectedQuadrant', quadrantKey)}
      />

      {/* 3. Prioritized Risk Register Table */}
      <RiskRegisterTable
        risks={filteredRisks}
        filters={filters}
        onUpdateFilter={updateFilter}
        onResetFilters={resetFilters}
        onSelectRisk={openRiskDetail}
        onCreateTask={handleCreateTask}
      />

      {/* 4. Slide-over Gap Detail Drawer */}
      <GapDetailDrawer
        risk={selectedRisk}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onCreateTask={handleCreateTask}
      />

      {/* 5. Floating AI Copilot Assistant Drawer */}
      <CopilotDrawer
        assessmentId={activeAssessmentId}
        activeOutcomeId={selectedRisk?.outcome_id}
        activeGapId={selectedRisk?.gap_id}
      />
    </div>
  );
}
