'use client';

import React, { use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ShieldCheck,
  Building2,
  Calendar,
  Sparkles,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import { useAssessment } from '@/hooks/useAssessment';
import { AssessmentTree } from '@/components/assessment/AssessmentTree';
import { OutcomeDetail } from '@/components/assessment/OutcomeDetail';
import { MaturityRadar } from '@/components/assessment/MaturityRadar';
import { CopilotDrawer } from '@/components/ai/CopilotDrawer';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AssessmentDetailPage({ params }: PageProps) {
  // Unwrap promise params in Next.js 15 client component
  const { id } = use(params);

  const {
    assessment,
    selectedOutcomeId,
    selectedOutcome,
    filteredOutcomes,
    filter,
    searchQuery,
    saveStatus,
    scoreSummary,
    selectOutcome,
    setFilter,
    setSearchQuery,
    toggleIGP,
    setStatus,
    updateRationale,
  } = useAssessment(id);

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] max-w-[1700px] mx-auto space-y-3">
      {/* Top Bar: Title, Context, and Progress Pills */}
      <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <Link
            href="/assessments"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            title="Back to Assessments list"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {assessment?.title || 'CAF v4.0 Assessment Matrix'}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-govuk-blue dark:bg-blue-900/50 dark:text-sky-300 font-mono">
                {assessment?.status || 'IN_PROGRESS'}
              </span>
            </div>
            <div className="flex items-center space-x-3 text-xs text-slate-500 mt-0.5">
              <span>{assessment?.council_service_name || 'All Council Services'}</span>
              <span>•</span>
              <span className="flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                Updated {assessment ? new Date(assessment.updated_at).toLocaleDateString('en-GB') : 'Today'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions & Export */}
        <div className="flex items-center space-x-2">
          <Link
            href="/reports"
            className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            <span>Export CAF Return</span>
          </Link>
          <Link
            href="/gaps"
            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-govuk-blue hover:bg-govuk-blueHover text-white text-xs font-semibold transition-colors shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            <span>View Gaps</span>
          </Link>
        </div>
      </div>

      {/* 3-Pane Interactive Layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 min-h-0 overflow-hidden">
        {/* Left Pane: Hierarchical Tree Navigation (Col 3 / 12) */}
        <div className="md:col-span-4 lg:col-span-3 h-full overflow-hidden">
          <AssessmentTree
            outcomes={filteredOutcomes}
            selectedOutcomeId={selectedOutcomeId}
            onSelectOutcome={selectOutcome}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>

        {/* Center Pane: Active Outcome Evaluation & IGP Checklist (Col 5 / 12 on large) */}
        <div className="md:col-span-8 lg:col-span-6 h-full overflow-hidden">
          <OutcomeDetail
            outcome={selectedOutcome}
            onStatusChange={setStatus}
            onToggleIGP={toggleIGP}
            onRationaleChange={updateRationale}
            saveStatus={saveStatus}
          />
        </div>

        {/* Right Pane: Visual Maturity Radar & Quick Filters (Col 3 / 12) */}
        <div className="hidden lg:block lg:col-span-3 h-full overflow-hidden">
          <MaturityRadar
            scoreSummary={scoreSummary}
            filter={filter}
            onFilterChange={setFilter}
          />
        </div>
      </div>

      {/* Floating AI Copilot Assistant Drawer */}
      <CopilotDrawer
        assessmentId={id}
        activeOutcomeId={selectedOutcomeId}
      />
    </div>
  );
}
