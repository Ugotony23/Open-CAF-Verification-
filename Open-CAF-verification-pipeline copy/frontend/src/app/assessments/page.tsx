'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Plus,
  ArrowRight,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { api } from '@/lib/api';
import { AssessmentResponse } from '@/types/assessment';

export default function AssessmentsListPage() {
  const [assessments, setAssessments] = useState<AssessmentResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newScope, setNewScope] = useState<string>('');
  const [newService, setNewService] = useState<string>('');
  const [creating, setCreating] = useState<boolean>(false);

  useEffect(() => {
    loadAssessments();
  }, []);

  async function loadAssessments() {
    setLoading(true);
    try {
      const data = await api.get<AssessmentResponse[]>('/assessments');
      if (data && data.length > 0) {
        setAssessments(data);
      } else {
        // Provide baseline default for local exploration
        setAssessments([
          {
            id: 'ass-borsetshire-2025-01' as any,
            tenant_id: 'ten-borsetshire-001' as any,
            title: 'CAF v4.0 Annual Assurance Audit 2025/26',
            scope_description:
              'Council-wide scope encompassing Tier 1 citizen digital services, adult social care systems, and revenues infrastructure.',
            status: 'IN_PROGRESS',
            council_service_name: 'Statutory Citizen Services',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            score_summary: {
              total_outcomes: 39,
              evaluated_outcomes: 23,
              remaining_outcomes: 16,
              completion_rate: 59,
              overall_achieved_count: 14,
              overall_achieved_pct: 36,
              overall_partially_achieved_count: 7,
              overall_partially_achieved_pct: 18,
              overall_not_achieved_count: 2,
              overall_not_achieved_pct: 5,
              overall_not_started_count: 16,
              overall_maturity_score: 68,
              objectives: {},
            },
          },
        ]);
      }
    } catch {
      // Offline fallback
      setAssessments([
        {
          id: 'ass-borsetshire-2025-01' as any,
          tenant_id: 'ten-borsetshire-001' as any,
          title: 'CAF v4.0 Annual Assurance Audit 2025/26',
          scope_description:
            'Council-wide scope encompassing Tier 1 citizen digital services, adult social care systems, and revenues infrastructure.',
          status: 'IN_PROGRESS',
          council_service_name: 'Statutory Citizen Services',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          score_summary: {
            total_outcomes: 39,
            evaluated_outcomes: 23,
            remaining_outcomes: 16,
            completion_rate: 59,
            overall_achieved_count: 14,
            overall_achieved_pct: 36,
            overall_partially_achieved_count: 7,
            overall_partially_achieved_pct: 18,
            overall_not_achieved_count: 2,
            overall_not_achieved_pct: 5,
            overall_not_started_count: 16,
            overall_maturity_score: 68,
            objectives: {},
          },
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newScope.trim()) return;

    setCreating(true);
    try {
      const created = await api.post<AssessmentResponse>('/assessments', {
        title: newTitle,
        scope_description: newScope,
        council_service_name: newService || undefined,
      });
      setAssessments((prev) => [created, ...prev]);
      setShowCreateModal(false);
      setNewTitle('');
      setNewScope('');
      setNewService('');
    } catch {
      // Mock creation fallback
      const mockCreated: AssessmentResponse = {
        id: `ass-custom-${Date.now()}` as any,
        tenant_id: 'ten-borsetshire-001' as any,
        title: newTitle,
        scope_description: newScope,
        status: 'IN_PROGRESS',
        council_service_name: newService || 'General Council Infrastructure',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setAssessments((prev) => [mockCreated, ...prev]);
      setShowCreateModal(false);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-govuk-blue dark:text-sky-400 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>NCSC Cyber Assessment Framework (v4.0)</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Council Assessment Registers
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
            Manage your annual and service-specific CAF evaluations. Every assessment initialises the 39 official Contributing Outcomes and 78 IGPs.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2.5 rounded-lg bg-govuk-blue hover:bg-govuk-blueHover text-white text-xs font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          <span>New Assessment</span>
        </button>
      </div>

      {/* Assessments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {assessments.map((ass) => {
          const completion = ass.score_summary?.completion_rate ?? 0;
          const maturity = ass.score_summary?.overall_maturity_score ?? 0;

          return (
            <div
              key={ass.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-govuk-blue dark:bg-blue-900/40 dark:text-sky-300 font-mono">
                    {ass.status}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Updated {new Date(ass.updated_at).toLocaleDateString('en-GB')}
                  </span>
                </div>

                <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">
                  {ass.title}
                </h3>

                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {ass.scope_description}
                </p>

                {ass.council_service_name && (
                  <div className="mt-2 flex items-center space-x-1.5 text-xs text-slate-500">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{ass.council_service_name}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2 text-xs">
                  <span className="text-slate-500">Completion</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {completion}% (39 Outcomes)
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden mb-4">
                  <div
                    className="bg-govuk-blue h-full rounded-full"
                    style={{ width: `${completion}%` }}
                  />
                </div>

                <Link
                  href={`/assessments/${ass.id}`}
                  className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-govuk-blue text-white text-xs font-semibold transition-colors"
                >
                  <span>Open Interactive Assessment Matrix</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal for Creating a New Assessment */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Initialize New Council Assessment
            </h3>
            <p className="text-xs text-slate-500">
              This will automatically provision all 39 NCSC CAF v4.0 Contributing Outcomes and associated IGPs in NOT_STARTED status.
            </p>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assessment Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Q3 2026 Core Infrastructure & Elections Assurance"
                  className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Council Service Scope *
                </label>
                <textarea
                  required
                  rows={3}
                  value={newScope}
                  onChange={(e) => setNewScope(e.target.value)}
                  placeholder="Describe the networks, services, databases, and citizen services in scope..."
                  className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Department / Service Lead (Optional)
                </label>
                <input
                  type="text"
                  value={newService}
                  onChange={(e) => setNewService(e.target.value)}
                  placeholder="e.g. Adult Social Care & Revenues Directorate"
                  className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="mt-5 flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-1.5 rounded-md bg-govuk-blue text-white text-xs font-semibold hover:bg-govuk-blueHover disabled:opacity-50"
                >
                  {creating ? 'Initializing 39 Outcomes...' : 'Create Assessment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
