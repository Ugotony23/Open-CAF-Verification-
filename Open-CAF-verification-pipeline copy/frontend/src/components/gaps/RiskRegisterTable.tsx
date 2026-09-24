'use client';

import React from 'react';
import {
  Search,
  Filter,
  ShieldAlert,
  AlertTriangle,
  Clock,
  ExternalLink,
  ChevronRight,
  Landmark,
  FileQuestion,
  Wrench,
  CheckCircle2,
  XCircle,
  X,
} from 'lucide-react';
import { PrioritizedRiskItem, RiskFilterState, ServiceTier, GapType, RiskLevel } from '@/types/risk';

interface RiskRegisterTableProps {
  risks: PrioritizedRiskItem[];
  filters: RiskFilterState;
  onUpdateFilter: (key: keyof RiskFilterState, value: unknown) => void;
  onResetFilters: () => void;
  onSelectRisk: (risk: PrioritizedRiskItem) => void;
  onCreateTask: (risk: PrioritizedRiskItem) => void;
}

export function RiskRegisterTable({
  risks,
  filters,
  onUpdateFilter,
  onResetFilters,
  onSelectRisk,
  onCreateTask,
}: RiskRegisterTableProps) {
  const getRiskBadge = (level: RiskLevel) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-100 dark:bg-red-950/70 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800 font-bold';
      case 'HIGH':
        return 'bg-orange-100 dark:bg-orange-950/70 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-800 font-semibold';
      case 'MEDIUM':
        return 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-medium';
      case 'LOW':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';
    }
  };

  const getTierBadge = (tier: ServiceTier) => {
    switch (tier) {
      case 'TIER_1':
        return 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/60 font-semibold';
      case 'TIER_2':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60';
      case 'TIER_3':
        return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/60';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'bg-red-600 text-red-600';
    if (score >= 50) return 'bg-orange-500 text-orange-500';
    if (score >= 25) return 'bg-amber-500 text-amber-500';
    return 'bg-slate-400 text-slate-500';
  };

  const hasActiveFilters =
    filters.tier !== 'ALL' ||
    filters.gapType !== 'ALL' ||
    filters.objectiveId !== 'ALL' ||
    filters.riskLevel !== 'ALL' ||
    Boolean(filters.searchQuery) ||
    Boolean(filters.selectedQuadrant);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
      {/* Table Action & Filter Bar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        {/* Search Bar */}
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search outcome, service, keyword..."
            value={filters.searchQuery || ''}
            onChange={(e) => onUpdateFilter('searchQuery', e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto text-xs">
          {/* Service Tier Filter */}
          <select
            value={filters.tier || 'ALL'}
            onChange={(e) => onUpdateFilter('tier', e.target.value)}
            className="px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="ALL">All Service Tiers</option>
            <option value="TIER_1">Tier 1: Critical (3.0x)</option>
            <option value="TIER_2">Tier 2: Operational (2.0x)</option>
            <option value="TIER_3">Tier 3: Informational (1.0x)</option>
          </select>

          {/* Gap Type Filter */}
          <select
            value={filters.gapType || 'ALL'}
            onChange={(e) => onUpdateFilter('gapType', e.target.value)}
            className="px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="ALL">All Gap Types</option>
            <option value="CONTROL_DEFICIT">Control Deficits</option>
            <option value="EVIDENTIAL_GAP">Evidential Blindspots</option>
          </select>

          {/* Objective Filter */}
          <select
            value={filters.objectiveId || 'ALL'}
            onChange={(e) => onUpdateFilter('objectiveId', e.target.value)}
            className="px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="ALL">All CAF Objectives</option>
            <option value="A">Objective A: Managing Cyber Risk</option>
            <option value="B">Objective B: Protecting Against Attack</option>
            <option value="C">Objective C: Detecting Events</option>
            <option value="D">Objective D: Minimising Impact</option>
          </select>

          {/* Risk Level Filter */}
          <select
            value={filters.riskLevel || 'ALL'}
            onChange={(e) => onUpdateFilter('riskLevel', e.target.value)}
            className="px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="ALL">All Risk Ratings</option>
            <option value="CRITICAL">Critical (≥75)</option>
            <option value="HIGH">High (50-74)</option>
            <option value="MEDIUM">Medium (25-49)</option>
            <option value="LOW">Low (&lt;25)</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="px-2.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center transition-colors"
              title="Reset all filters"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Results Header Count */}
      <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span>
          Showing <strong>{risks.length}</strong> prioritized risk items
          {filters.tier !== 'ALL' && ` in ${filters.tier}`}
          {filters.selectedQuadrant && ` matching quadrant ${filters.selectedQuadrant}`}
        </span>
        <span className="text-[11px] text-slate-400">
          Ranked by Priority Score descending (Severity × Weight × Likelihood)
        </span>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
              <th className="py-3 px-3 w-12 text-center">Rank</th>
              <th className="py-3 px-3 w-28">Outcome</th>
              <th className="py-3 px-4 min-w-[240px]">Deficit Summary</th>
              <th className="py-3 px-3 min-w-[200px]">Impacted Council Service</th>
              <th className="py-3 px-3 w-28 text-center">Evidential State</th>
              <th className="py-3 px-4 w-40 text-center">Priority Score</th>
              <th className="py-3 px-3 w-24 text-center">Risk Tier</th>
              <th className="py-3 px-3 w-24 text-center">Target SLA</th>
              <th className="py-3 px-4 w-32 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
            {risks.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500">
                  <FileQuestion className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-60" />
                  <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                    No risk items match your active filters
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Try broadening your search or resetting active filters.
                  </p>
                  {hasActiveFilters && (
                    <button
                      onClick={onResetFilters}
                      className="mt-3 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 inline-flex items-center text-xs"
                    >
                      Clear Filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              risks.map((risk) => (
                <tr
                  key={risk.id}
                  onClick={() => onSelectRisk(risk)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                >
                  {/* 1. Rank */}
                  <td className="py-3 px-3 text-center font-mono font-bold">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                        risk.rank === 1
                          ? 'bg-red-600 text-white shadow-xs'
                          : risk.rank <= 3
                          ? 'bg-orange-500 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      #{risk.rank}
                    </span>
                  </td>

                  {/* 2. Contributing Outcome */}
                  <td className="py-3 px-3">
                    <span className="font-mono font-bold text-blue-700 dark:text-blue-400 block">
                      {risk.outcome_id}
                    </span>
                    <span className="text-[11px] text-slate-500 truncate block max-w-[120px]" title={risk.outcome_title}>
                      {risk.outcome_title}
                    </span>
                  </td>

                  {/* 3. Deficit Description */}
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-900 dark:text-white block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {risk.gap_title}
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                      {risk.deficit_description}
                    </p>
                  </td>

                  {/* 4. Impacted Council Service & Tier Badge */}
                  <td className="py-3 px-3">
                    <span className="font-medium text-slate-800 dark:text-slate-200 block truncate max-w-[220px]" title={risk.impacted_service_name}>
                      {risk.impacted_service_name}
                    </span>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] border ${getTierBadge(risk.impacted_service_tier)}`}>
                        <Landmark className="w-3 h-3 mr-1 opacity-70" />
                        {risk.impacted_service_tier === 'TIER_1'
                          ? 'Tier 1 - Critical (3.0x)'
                          : risk.impacted_service_tier === 'TIER_2'
                          ? 'Tier 2 - Operational (2.0x)'
                          : 'Tier 3 - Informational (1.0x)'}
                      </span>
                    </div>
                  </td>

                  {/* 5. Evidential Status */}
                  <td className="py-3 px-3 text-center">
                    {risk.gap_type === 'EVIDENTIAL_GAP' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        <FileQuestion className="w-3 h-3 mr-1" />
                        {risk.is_stale_evidence ? 'Stale >12mo' : 'No Evidence'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800">
                        <XCircle className="w-3 h-3 mr-1" />
                        Control Deficit
                      </span>
                    )}
                  </td>

                  {/* 6. Priority Score Progress Bar */}
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                        {risk.priority_score.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-slate-400">/ 100</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${getScoreColor(risk.priority_score)}`}
                        style={{ width: `${Math.min(100, Math.max(5, risk.priority_score))}%` }}
                      />
                    </div>
                  </td>

                  {/* 7. Risk Tier Badge */}
                  <td className="py-3 px-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border ${getRiskBadge(risk.risk_level)}`}>
                      {risk.risk_level}
                    </span>
                  </td>

                  {/* 8. Suggested SLA */}
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex items-center font-medium text-slate-700 dark:text-slate-300">
                      <Clock className="w-3 h-3 mr-1 text-slate-400" />
                      {risk.suggested_sla_label}
                    </span>
                  </td>

                  {/* 9. Action Button */}
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateTask(risk);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 transition-all font-semibold text-[11px] inline-flex items-center"
                    >
                      <Wrench className="w-3 h-3 mr-1" />
                      Remediate
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
