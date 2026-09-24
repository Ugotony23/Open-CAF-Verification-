'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  CircleDashed,
  Layers,
} from 'lucide-react';
import { AssessmentOutcome, OutcomeStatus } from '@/types/assessment';
import { CAF_OBJECTIVES } from '@/lib/cafTaxonomy';

interface AssessmentTreeProps {
  outcomes: AssessmentOutcome[];
  selectedOutcomeId: string;
  onSelectOutcome: (outcomeId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function AssessmentTree({
  outcomes,
  selectedOutcomeId,
  onSelectOutcome,
  searchQuery,
  onSearchChange,
}: AssessmentTreeProps) {
  // Store expanded state of objectives and principles
  const [expandedObjectives, setExpandedObjectives] = useState<Record<string, boolean>>({
    A: true,
    B: true,
    C: false,
    D: false,
  });

  const [expandedPrinciples, setExpandedPrinciples] = useState<Record<string, boolean>>({
    A1: true,
    A2: false,
    A3: false,
    A4: false,
    B1: true,
    B2: true,
  });

  const toggleObjective = (objId: string) => {
    setExpandedObjectives((prev) => ({ ...prev, [objId]: !prev[objId] }));
  };

  const togglePrinciple = (prId: string) => {
    setExpandedPrinciples((prev) => ({ ...prev, [prId]: !prev[prId] }));
  };

  // Status indicator helper
  const getStatusBadge = (status: OutcomeStatus) => {
    switch (status) {
      case 'ACHIEVED':
        return {
          dot: 'bg-emerald-500 ring-emerald-200 dark:ring-emerald-900',
          icon: CheckCircle2,
          textColor: 'text-emerald-700 dark:text-emerald-400',
          label: 'Achieved',
        };
      case 'PARTIALLY_ACHIEVED':
        return {
          dot: 'bg-amber-500 ring-amber-200 dark:ring-amber-900',
          icon: AlertTriangle,
          textColor: 'text-amber-700 dark:text-amber-400',
          label: 'Partially',
        };
      case 'NOT_ACHIEVED':
        return {
          dot: 'bg-rose-500 ring-rose-200 dark:ring-rose-900',
          icon: XCircle,
          textColor: 'text-rose-700 dark:text-rose-400',
          label: 'Not Achieved',
        };
      case 'NOT_STARTED':
      default:
        return {
          dot: 'bg-slate-400 ring-slate-200 dark:ring-slate-700',
          icon: CircleDashed,
          textColor: 'text-slate-400 dark:text-slate-500',
          label: 'Not Started',
        };
    }
  };

  // Outcome lookup map
  const outcomeMap = React.useMemo(() => {
    const map = new Map<string, AssessmentOutcome>();
    outcomes.forEach((o) => map.set(o.outcome_id, o));
    return map;
  }, [outcomes]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Header & Quick Search */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5 text-govuk-blue dark:text-sky-400" />
            <span>CAF Structure</span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            {outcomes.length} Outcomes
          </span>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by code or title (e.g. A1.a)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-govuk-blue"
          />
        </div>
      </div>

      {/* Hierarchical Tree Body */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {CAF_OBJECTIVES.map((obj) => {
          const isObjExpanded = expandedObjectives[obj.id] ?? true;

          // Objective completion stats
          const objOutcomes = outcomes.filter((o) => o.outcome_id.startsWith(obj.id));
          const objAchieved = objOutcomes.filter((o) => o.status === 'ACHIEVED').length;
          const objPartially = objOutcomes.filter((o) => o.status === 'PARTIALLY_ACHIEVED').length;

          return (
            <div
              key={obj.id}
              className="rounded-lg border border-slate-200/80 dark:border-slate-800/80 overflow-hidden"
            >
              {/* Objective Row */}
              <button
                type="button"
                onClick={() => toggleObjective(obj.id)}
                className="w-full flex items-center justify-between p-2.5 bg-slate-100/70 dark:bg-slate-800/40 hover:bg-slate-200/50 dark:hover:bg-slate-800 text-left transition-colors"
              >
                <div className="flex items-center space-x-2 truncate">
                  {isObjExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  )}
                  <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                    {obj.code}: {obj.title}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 flex-shrink-0 ml-1">
                  {objAchieved}/{objOutcomes.length}
                </span>
              </button>

              {/* Principles List */}
              {isObjExpanded && (
                <div className="p-1 space-y-1 bg-white dark:bg-slate-900">
                  {obj.principles.map((pr) => {
                    const isPrExpanded = expandedPrinciples[pr.id] ?? false;
                    const prOutcomes = pr.outcomes
                      .map((o) => outcomeMap.get(o.id))
                      .filter(Boolean) as AssessmentOutcome[];

                    const prAchieved = prOutcomes.filter((o) => o.status === 'ACHIEVED').length;
                    const prTotal = prOutcomes.length || pr.outcomes.length;
                    const prPercent = prTotal > 0 ? Math.round((prAchieved / prTotal) * 100) : 0;

                    return (
                      <div
                        key={pr.id}
                        className="rounded-md border border-slate-100 dark:border-slate-800 overflow-hidden"
                      >
                        {/* Principle Header with Progress bar */}
                        <div
                          onClick={() => togglePrinciple(pr.id)}
                          className="px-2.5 py-1.5 flex flex-col space-y-1 bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1.5 truncate">
                              {isPrExpanded ? (
                                <ChevronDown className="w-3 h-3 text-slate-400" />
                              ) : (
                                <ChevronRight className="w-3 h-3 text-slate-400" />
                              )}
                              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {pr.code} {pr.title}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {prAchieved}/{prTotal}
                            </span>
                          </div>

                          {/* Progress bar per Principle */}
                          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                            <div
                              className="bg-govuk-blue h-full rounded-full transition-all duration-300"
                              style={{ width: `${prPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Outcomes within Principle */}
                        {isPrExpanded && (
                          <div className="py-1 pl-4 pr-1 space-y-0.5">
                            {pr.outcomes.map((item) => {
                              const outcome = outcomeMap.get(item.id);
                              const isSelected = selectedOutcomeId === item.id;
                              const status = outcome?.status || 'NOT_STARTED';
                              const badge = getStatusBadge(status);

                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => onSelectOutcome(item.id)}
                                  className={`w-full text-left px-2.5 py-1.5 rounded-md flex items-center justify-between text-xs transition-all ${
                                    isSelected
                                      ? 'bg-govuk-blue text-white shadow-xs font-semibold'
                                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                  }`}
                                >
                                  <div className="flex items-center space-x-2 truncate">
                                    {/* Color-coded status dot with ring */}
                                    <span
                                      className={`w-2 h-2 rounded-full ring-2 ${badge.dot} flex-shrink-0 ${
                                        isSelected ? 'ring-white' : ''
                                      }`}
                                    />
                                    <span className="font-mono text-[11px] font-bold">
                                      {item.code}
                                    </span>
                                    <span className="truncate text-xs">
                                      {item.title}
                                    </span>
                                  </div>

                                  {/* Status indicator tag */}
                                  <span
                                    className={`ml-1 text-[9px] uppercase tracking-wider font-mono font-bold flex-shrink-0 ${
                                      isSelected
                                        ? 'text-blue-100'
                                        : badge.textColor
                                    }`}
                                  >
                                    {status === 'ACHIEVED'
                                      ? 'ACH'
                                      : status === 'PARTIALLY_ACHIEVED'
                                      ? 'PART'
                                      : status === 'NOT_ACHIEVED'
                                      ? 'NOT'
                                      : 'NEW'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
