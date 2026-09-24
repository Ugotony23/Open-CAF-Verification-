'use client';

import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Landmark,
  CheckCircle2,
  XCircle,
  FileText,
  Wrench,
  ExternalLink,
  Layers,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { PrioritizedRiskItem } from '@/types/risk';

interface GapDetailDrawerProps {
  risk: PrioritizedRiskItem | null;
  isOpen: boolean;
  onClose: () => void;
  onCreateTask: (risk: PrioritizedRiskItem) => void;
}

export function GapDetailDrawer({
  risk,
  isOpen,
  onClose,
  onCreateTask,
}: GapDetailDrawerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [createdSuccess, setCreatedSuccess] = useState(false);

  if (!isOpen || !risk) return null;

  const handleCreateTask = () => {
    setIsCreating(true);
    setTimeout(() => {
      setIsCreating(false);
      setCreatedSuccess(true);
      onCreateTask(risk);
      setTimeout(() => setCreatedSuccess(false), 3000);
    }, 400);
  };

  const getTierStyle = (tier: string) => {
    switch (tier) {
      case 'TIER_1':
        return 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/60';
      case 'TIER_2':
        return 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60';
      default:
        return 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/60';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end">
      {/* Click outside to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Container */}
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 h-full flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50 dark:bg-slate-850">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono font-extrabold text-sm px-2.5 py-1 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {risk.outcome_id}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Rank #{risk.rank}
              </span>
              <span
                className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  risk.risk_level === 'CRITICAL'
                    ? 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border border-red-300 dark:border-red-800'
                    : risk.risk_level === 'HIGH'
                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300 border border-orange-300 dark:border-orange-800'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                }`}
              >
                {risk.risk_level} RISK
              </span>
            </div>
            <h2 className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
              {risk.gap_title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Contributing Outcome: <strong>{risk.outcome_title}</strong> (Objective {risk.objective_id})
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700 dark:text-slate-300">
          {/* 1. Impacted Council Service Banner */}
          <div className={`p-4 rounded-xl border ${getTierStyle(risk.impacted_service_tier)}`}>
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider mb-1">
              <Landmark className="w-4 h-4" />
              <span>Impacted Council Service</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold">{risk.impacted_service_name}</span>
              <span className="font-semibold text-xs px-2 py-0.5 rounded bg-white/70 dark:bg-slate-900/50">
                {risk.impacted_service_tier === 'TIER_1'
                  ? 'Tier 1 Critical (3.0x Weight)'
                  : risk.impacted_service_tier === 'TIER_2'
                  ? 'Tier 2 Operational (2.0x Weight)'
                  : 'Tier 3 Informational (1.0x Weight)'}
              </span>
            </div>
            <p className="mt-2 text-xs opacity-90">
              {risk.impacted_service_tier === 'TIER_1'
                ? 'Disruption directly endangers resident life safety, statutory child/adult social care protection, or statutory council revenues and elections.'
                : risk.impacted_service_tier === 'TIER_2'
                ? 'Disruption paralyses municipal administrative operations, planning applications, or contractor housing maintenance.'
                : 'Disruption has low operational impact on statutory services and citizen safety.'}
            </p>
          </div>

          {/* 2. Mathematical Scoring Factor Breakdown */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
              <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center">
                <Flame className="w-3.5 h-3.5 mr-1.5 text-red-500" />
                Council Impact Matrix Formula
              </span>
              <span className="font-mono font-black text-sm text-blue-700 dark:text-blue-400">
                Priority Score: {risk.priority_score.toFixed(1)} / 100
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1">
              {/* Factor 1: Gap Severity */}
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                  Gap Severity (1-5)
                </span>
                <span className="text-lg font-black text-slate-900 dark:text-white mt-0.5 block">
                  {risk.gap_severity_score}
                  <span className="text-xs font-normal text-slate-400">/5</span>
                </span>
                <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                  {risk.gap_severity_level}
                </span>
              </div>

              {/* Factor 2: Service Criticality */}
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                  Service Weight
                </span>
                <span className="text-lg font-black text-slate-900 dark:text-white mt-0.5 block">
                  {risk.service_criticality_weight.toFixed(1)}x
                </span>
                <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                  {risk.impacted_service_tier}
                </span>
              </div>

              {/* Factor 3: Threat Likelihood */}
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                  Threat Likelihood
                </span>
                <span className="text-lg font-black text-slate-900 dark:text-white mt-0.5 block">
                  {risk.threat_likelihood_score}
                  <span className="text-xs font-normal text-slate-400">/3</span>
                </span>
                <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                  Prevalent UK Vector
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
              <strong>Threat Vector:</strong> {risk.threat_likelihood_vector}
            </p>
          </div>

          {/* 3. Deficit Description */}
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] mb-2">
              Deficit Description &amp; Technical Scope
            </h3>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs leading-relaxed">
              {risk.deficit_description}
            </div>
          </div>

          {/* 4. Exact Unmet IGPs (Indicators of Good Practice) */}
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] mb-2 flex items-center justify-between">
              <span>Unmet Indicators of Good Practice (IGPs)</span>
              <span className="text-red-600 font-semibold text-[10px]">
                {risk.unmet_igps && risk.unmet_igps.length > 0
                  ? `${risk.unmet_igps.length} Unsatisfied Criteria`
                  : 'Evidential Deficit'}
              </span>
            </h3>

            {risk.unmet_igps && risk.unmet_igps.length > 0 ? (
              <div className="space-y-2">
                {risk.unmet_igps.map((igp) => (
                  <div
                    key={igp.igp_id}
                    className="p-3 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 flex items-start space-x-2.5"
                  >
                    <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-red-800 dark:text-red-300">
                          {igp.igp_id}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200">
                          {igp.level}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-700 dark:text-slate-300 text-xs">
                        {igp.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 flex items-start space-x-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 dark:text-amber-200">
                  {risk.gap_type === 'EVIDENTIAL_GAP'
                    ? 'All stated procedural criteria are marked achieved by the assessor, but supporting audit verification is missing or older than the 12-month compliance cycle.'
                    : 'Partial compliance recorded with outstanding control enhancements needed.'}
                </p>
              </div>
            )}
          </div>

          {/* 5. Remediation Recommendation */}
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] mb-2">
              Assessor Remediation Guidance
            </h3>
            <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200 text-xs leading-relaxed">
              {risk.recommendation}
            </div>
          </div>
        </div>

        {/* Sticky Footer Action Bar */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
          <div className="flex items-center text-xs text-slate-500 space-x-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>
              Target SLA: <strong>{risk.suggested_sla_label}</strong>
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleCreateTask}
              disabled={isCreating}
              className={`px-4 py-2 rounded-lg text-white font-semibold text-xs flex items-center transition-all shadow-xs ${
                createdSuccess
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isCreating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Generating Task...
                </>
              ) : createdSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Task Created!
                </>
              ) : (
                <>
                  <Wrench className="w-3.5 h-3.5 mr-1.5" />
                  Create Remediation Task
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
