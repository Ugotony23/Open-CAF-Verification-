'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  Quote,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  Bot,
  RefreshCw,
  FileCheck,
  Flame,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { api } from '@/lib/api';

export interface CopilotSuggestion {
  id: string;
  suggestion_type: 'EVIDENCE_MAPPING' | 'GAP_CRITIQUE' | 'REMEDIATION_ACTION';
  status: 'PENDING_REVIEW' | 'ACCEPTED' | 'REJECTED';
  title: string;
  summary: string;
  outcome_id?: string;
  citation_quotes: string[];
  confidence_score: number;
  created_at: string;
  payload: Record<string, unknown>;
}

interface CopilotDrawerProps {
  assessmentId?: string | null;
  activeOutcomeId?: string | null;
  activeGapId?: string | null;
  onActionApplied?: (suggestion: CopilotSuggestion) => void;
}

const MOCK_DEMO_SUGGESTIONS: CopilotSuggestion[] = [
  {
    id: 'sugg-demo-001',
    suggestion_type: 'GAP_CRITIQUE',
    status: 'PENDING_REVIEW',
    title: 'Assessor Gap Critique: B2.a Identity and Access Management',
    summary:
      'Council password policy specifies 8-character passwords with 90-day expiry. NCSC CAF Outcome B2.a requires 12+ characters and mandatory multi-factor authentication (MFA) across all administrative and remote access portals.',
    outcome_id: 'B2.a',
    citation_quotes: [
      "Access Control Policy v2.1 (p. 4): 'Administrative users must change 8-character passwords quarterly.'",
      "NCSC CAF B2.a IGP: 'Multi-factor authentication is enforced across all administrative accounts.'",
    ],
    confidence_score: 0.94,
    created_at: new Date().toISOString(),
    payload: { recommended_status: 'NOT_ACHIEVED' },
  },
  {
    id: 'sugg-demo-002',
    suggestion_type: 'EVIDENCE_MAPPING',
    status: 'PENDING_REVIEW',
    title: 'Evidence Mapping: Backup Policy -> B4.a Resilient Networks',
    summary:
      "Uploaded document 'Revenues_Disaster_Recovery_Plan.pdf' contains verified WORM immutable storage clauses matching NCSC Principle B4.",
    outcome_id: 'B4.a',
    citation_quotes: [
      "Section 3.1: 'Database recovery snapshots are replicated to AWS S3 Object Lock immutable tier with 30-day retention.'",
    ],
    confidence_score: 0.88,
    created_at: new Date().toISOString(),
    payload: { outcome_id: 'B4.a' },
  },
  {
    id: 'sugg-demo-003',
    suggestion_type: 'REMEDIATION_ACTION',
    status: 'PENDING_REVIEW',
    title: 'Draft Action: Deploy FIDO2 MFA across Legacy RDP Gateways',
    summary:
      'Estimated Effort: 45.0 hours | Estimated Budget: £18,500 GBP | Target SLA: 14 Days (Critical). Includes 4 technical checklist milestones.',
    outcome_id: 'B2.a',
    citation_quotes: [
      'NCSC Cyber Resilience Baseline: Prioritise phishing-resistant MFA on council edge portals.',
    ],
    confidence_score: 0.91,
    created_at: new Date().toISOString(),
    payload: {
      title: 'Deploy FIDO2 MFA on Legacy Gateways',
      estimated_cost_gbp: 18500,
      estimated_effort_hours: 45,
    },
  },
];

export function CopilotDrawer({
  assessmentId = 'ass-demo-001',
  activeOutcomeId,
  activeGapId,
  onActionApplied,
}: CopilotDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<CopilotSuggestion[]>(MOCK_DEMO_SUGGESTIONS);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'ACCEPTED'>('PENDING');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Fetch suggestions
  const fetchSuggestions = useCallback(async () => {
    try {
      const data = await api.get<CopilotSuggestion[]>('/ai/suggestions');
      if (Array.isArray(data) && data.length > 0) {
        setSuggestions(data);
      }
    } catch {
      // Fallback to demo items
      setSuggestions(MOCK_DEMO_SUGGESTIONS);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchSuggestions();
    }
  }, [isOpen, fetchSuggestions]);

  const handleAccept = async (suggestion: CopilotSuggestion) => {
    setLoading(true);
    try {
      await api.post(`/ai/suggestions/${suggestion.id}/accept`);
    } catch {
      console.warn('API call failed, updating locally');
    }
    const updated = suggestions.map((s) =>
      s.id === suggestion.id ? { ...s, status: 'ACCEPTED' as const } : s
    );
    setSuggestions(updated);
    setActionSuccessMsg(`Recommendation accepted: ${suggestion.title}`);
    onActionApplied?.(suggestion);
    setTimeout(() => setActionSuccessMsg(null), 3500);
    setLoading(false);
  };

  const handleReject = async (suggestion: CopilotSuggestion) => {
    setLoading(true);
    try {
      await api.post(`/ai/suggestions/${suggestion.id}/reject`, {
        rejection_reason: 'Dismissed by assessor',
      });
    } catch {
      console.warn('API call failed, updating locally');
    }
    const updated = suggestions.map((s) =>
      s.id === suggestion.id ? { ...s, status: 'REJECTED' as const } : s
    );
    setSuggestions(updated);
    setActionSuccessMsg('Recommendation dismissed. No data was modified.');
    setTimeout(() => setActionSuccessMsg(null), 3500);
    setLoading(false);
  };

  const handleTriggerCritique = async () => {
    setLoading(true);
    const targetOutcome = activeOutcomeId || 'B2.a';
    try {
      const newSugg = await api.post<CopilotSuggestion>('/ai/critique-gap', {
        assessment_id: assessmentId,
        outcome_id: targetOutcome,
      });
      setSuggestions([newSugg, ...suggestions]);
      setActionSuccessMsg(`New AI critique generated for ${targetOutcome}`);
    } catch {
      // Local demo fallback
      const mockCritique: CopilotSuggestion = {
        id: `sugg-critique-${Date.now()}`,
        suggestion_type: 'GAP_CRITIQUE',
        status: 'PENDING_REVIEW',
        title: `Gap Critique: ${targetOutcome}`,
        summary: `Council evidence demonstrates partial implementation of NCSC ${targetOutcome}. Evidence from past 12 months requires re-verification.`,
        outcome_id: targetOutcome,
        citation_quotes: ['NCSC CAF v4.0 Indicator of Good Practice requires annual verification.'],
        confidence_score: 0.89,
        created_at: new Date().toISOString(),
        payload: { outcome_id: targetOutcome },
      };
      setSuggestions([mockCritique, ...suggestions]);
      setActionSuccessMsg(`New AI critique generated for ${targetOutcome}`);
    } finally {
      setTimeout(() => setActionSuccessMsg(null), 3500);
      setLoading(false);
    }
  };

  const pendingList = suggestions.filter((s) => s.status === 'PENDING_REVIEW');
  const acceptedList = suggestions.filter((s) => s.status === 'ACCEPTED');

  return (
    <>
      {/* Floating Copilot Launcher Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="group relative flex items-center space-x-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-gov-blue text-white font-bold shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all text-xs border border-white/20"
        >
          <div className="relative">
            <Sparkles className="w-4 h-4 animate-pulse" />
            {pendingList.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-400 text-slate-950 rounded-full text-[9px] font-black flex items-center justify-center">
                {pendingList.length}
              </span>
            )}
          </div>
          <span>AI Copilot</span>
          <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] bg-white/20 uppercase tracking-wider font-semibold">
            Human-in-the-Loop
          </span>
        </button>
      </div>

      {/* Slide-Over Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 transition-opacity"
        />
      )}

      {/* Slide-Over Drawer Container */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md md:max-w-lg bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-purple-50 to-indigo-50/40 dark:from-purple-950/30 dark:to-indigo-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center space-x-1.5">
                  <span>Open CAF Assistive Copilot</span>
                </h3>
                <p className="text-[11px] text-purple-700 dark:text-purple-300 font-medium">
                  Evidence Mapping • Gap Critique • Action Drafting
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Human-in-the-Loop Safeguard Notice */}
          <div className="mt-3 p-2.5 rounded-xl bg-purple-100/70 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-[11px] text-purple-900 dark:text-purple-200 flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Human-in-the-Loop Guardrail:</span> All recommendations are suggestions. No scores or remediation tasks change until you explicitly click <strong>Accept</strong>.
            </div>
          </div>
        </div>

        {/* Action Trigger Shortcuts */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between gap-2 overflow-x-auto">
          <button
            type="button"
            disabled={loading}
            onClick={handleTriggerCritique}
            className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center space-x-1 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            <span>Generate Critique {activeOutcomeId ? `(${activeOutcomeId})` : ''}</span>
          </button>

          <button
            type="button"
            onClick={fetchSuggestions}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            title="Refresh suggestions"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Toast / Action Message */}
        {actionSuccessMsg && (
          <div className="m-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* View Tabs: Pending vs Accepted */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-4">
          <button
            type="button"
            onClick={() => setActiveTab('PENDING')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'PENDING'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Pending Review</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
              {pendingList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ACCEPTED')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'ACCEPTED'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Approved History</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {acceptedList.length}
            </span>
          </button>
        </div>

        {/* Suggestion Cards Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {activeTab === 'PENDING' ? (
            pendingList.length === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
                <Bot className="w-8 h-8 mx-auto opacity-30" />
                <p className="text-xs">No suggestions currently pending review.</p>
                <p className="text-[11px]">Click &ldquo;Generate Critique&rdquo; above to analyze outcomes.</p>
              </div>
            ) : (
              pendingList.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs p-4 space-y-3 hover:border-purple-300 dark:hover:border-purple-800 transition-colors"
                >
                  {/* Top Bar: Outcome chip, Type pill, Confidence */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      {item.outcome_id && (
                        <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded-md bg-gov-blue/10 text-gov-blue dark:bg-blue-950/60 dark:text-blue-300">
                          {item.outcome_id}
                        </span>
                      )}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                        {item.suggestion_type.replace('_', ' ')}
                      </span>
                    </div>

                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                      {Math.round(item.confidence_score * 100)}% Match
                    </span>
                  </div>

                  {/* Title & Summary */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                      {item.title}
                    </h4>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {item.summary}
                    </p>
                  </div>

                  {/* Quotation Citations */}
                  {item.citation_quotes && item.citation_quotes.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                        <Quote className="w-3 h-3 text-purple-500" />
                        <span>Evidence Citation:</span>
                      </span>
                      {item.citation_quotes.map((q, idx) => (
                        <blockquote
                          key={idx}
                          className="border-l-2 border-purple-500 pl-2.5 py-0.5 text-[11px] italic text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 rounded-r-lg"
                        >
                          &ldquo;{q}&rdquo;
                        </blockquote>
                      ))}
                    </div>
                  )}

                  {/* Accept / Dismiss Actions */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleReject(item)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center space-x-1"
                    >
                      <ThumbsDown className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      <span>Dismiss</span>
                    </button>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleAccept(item)}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
                    >
                      <ThumbsUp className="w-3.5 h-3.5 mr-1" />
                      <span>Accept Recommendation</span>
                    </button>
                  </div>
                </div>
              ))
            )
          ) : (
            acceptedList.length === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                No approved suggestions in history yet.
              </div>
            ) : (
              acceptedList.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 p-3 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300">
                      {item.title}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Applied
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">{item.summary}</p>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </>
  );
}
