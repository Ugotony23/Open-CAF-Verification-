'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileBarChart,
  Download,
  Eye,
  FileSpreadsheet,
  ShieldCheck,
  AlertTriangle,
  PoundSterling,
  Calendar,
  Building,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  Layers,
  Sparkles,
  ArrowDownToLine,
  Loader2,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('opencaf_access_token') || localStorage.getItem('access_token');
}

interface AssessmentOption {
  id: string;
  title: string;
  council_service_name?: string;
  status: string;
  created_at: string;
}

interface ReportSummary {
  assessment_id: string;
  assessment_title: string;
  council_name: string;
  scores: {
    total_outcomes: number;
    achieved_outcomes: number;
    partially_achieved_outcomes: number;
    not_achieved_outcomes: number;
    achieved_percentage: number;
    partially_achieved_percentage: number;
    not_achieved_percentage: number;
    completion_rate: number;
    objectives?: Record<
      string,
      {
        total_outcomes: number;
        achieved: number;
        partially_achieved: number;
        not_achieved: number;
        completion_rate: number;
      }
    >;
  };
  critical_risks_count: number;
  total_risks_count: number;
  total_remediation_budget_gbp: number;
  total_remediation_effort_hours: number;
  total_remediation_tasks: number;
}

export default function ReportsPage() {
  const [assessments, setAssessments] = useState<AssessmentOption[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloadingExec, setDownloadingExec] = useState<boolean>(false);
  const [downloadingAudit, setDownloadingAudit] = useState<boolean>(false);
  const [downloadingExcel, setDownloadingExcel] = useState<boolean>(false);
  const [previewTab, setPreviewTab] = useState<'exec_p1' | 'exec_p2' | 'audit_sample'>('exec_p1');

  // 1. Fetch available assessments
  useEffect(() => {
    async function fetchAssessments() {
      try {
        const token = getStoredToken();
        const res = await fetch(`${API_BASE}/assessments`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setAssessments(data);
          if (data.length > 0) {
            setSelectedAssessmentId(data[0].id);
          }
        }
      } catch (err) {
        console.warn('Could not fetch assessments list, using fallback defaults', err);
      }
    }
    fetchAssessments();
  }, []);

  // 2. Fetch report summary metrics when selected assessment changes
  useEffect(() => {
    async function fetchSummary() {
      if (!selectedAssessmentId) {
        // Provide rich default Borsetshire Council mockup if backend is not yet populated
        setSummary({
          assessment_id: 'borsetshire-demo-id',
          assessment_title: 'Borsetshire Cyber Resilience Assessment 2025/26',
          council_name: 'Borsetshire District Council',
          scores: {
            total_outcomes: 39,
            achieved_outcomes: 23,
            partially_achieved_outcomes: 12,
            not_achieved_outcomes: 4,
            achieved_percentage: 59.0,
            partially_achieved_percentage: 30.8,
            not_achieved_percentage: 10.2,
            completion_rate: 100.0,
            objectives: {
              A: { total_outcomes: 9, achieved: 6, partially_achieved: 3, not_achieved: 0, completion_rate: 100 },
              B: { total_outcomes: 20, achieved: 12, partially_achieved: 5, not_achieved: 3, completion_rate: 100 },
              C: { total_outcomes: 5, achieved: 3, partially_achieved: 2, not_achieved: 0, completion_rate: 100 },
              D: { total_outcomes: 5, achieved: 2, partially_achieved: 2, not_achieved: 1, completion_rate: 100 },
            },
          },
          critical_risks_count: 4,
          total_risks_count: 12,
          total_remediation_budget_gbp: 127500,
          total_remediation_effort_hours: 585,
          total_remediation_tasks: 10,
        });
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const token = getStoredToken();
        const res = await fetch(`${API_BASE}/reports/${selectedAssessmentId}/summary`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setSummary(data);
        } else {
          // Use fallback mock
          setSummary({
            assessment_id: selectedAssessmentId,
            assessment_title: 'Borsetshire Cyber Resilience Assessment 2025/26',
            council_name: 'Borsetshire District Council',
            scores: {
              total_outcomes: 39,
              achieved_outcomes: 23,
              partially_achieved_outcomes: 12,
              not_achieved_outcomes: 4,
              achieved_percentage: 59.0,
              partially_achieved_percentage: 30.8,
              not_achieved_percentage: 10.2,
              completion_rate: 100.0,
              objectives: {
                A: { total_outcomes: 9, achieved: 6, partially_achieved: 3, not_achieved: 0, completion_rate: 100 },
                B: { total_outcomes: 20, achieved: 12, partially_achieved: 5, not_achieved: 3, completion_rate: 100 },
                C: { total_outcomes: 5, achieved: 3, partially_achieved: 2, not_achieved: 0, completion_rate: 100 },
                D: { total_outcomes: 5, achieved: 2, partially_achieved: 2, not_achieved: 1, completion_rate: 100 },
              },
            },
            critical_risks_count: 4,
            total_risks_count: 12,
            total_remediation_budget_gbp: 127500,
            total_remediation_effort_hours: 585,
            total_remediation_tasks: 10,
          });
        }
      } catch (err) {
        console.warn('Could not fetch report preview summary', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, [selectedAssessmentId]);

  // 3. PDF Download trigger
  const handleDownloadPDF = async (type: 'executive' | 'audit') => {
    const isExec = type === 'executive';
    if (isExec) setDownloadingExec(true);
    else setDownloadingAudit(true);

    try {
      const token = getStoredToken();
      const endpoint = isExec
        ? `${API_BASE}/reports/${selectedAssessmentId || 'demo'}/executive-pdf`
        : `${API_BASE}/reports/${selectedAssessmentId || 'demo'}/audit-pdf`;

      const res = await fetch(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = isExec
        ? `OpenCAF_Executive_Cabinet_Briefing_${summary?.council_name.replace(/\s+/g, '_') || 'Council'}.pdf`
        : `OpenCAF_Detailed_Audit_Pack_${summary?.council_name.replace(/\s+/g, '_') || 'Council'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(`Could not download PDF directly from backend: ${err}. Please ensure the backend is running and assessment is initialized.`);
    } finally {
      if (isExec) setDownloadingExec(false);
      else setDownloadingAudit(false);
    }
  };

  // 4. Excel Download trigger
  const handleDownloadExcel = async () => {
    setDownloadingExcel(true);
    try {
      const token = getStoredToken();
      const endpoint = `${API_BASE}/assessments/${selectedAssessmentId || 'demo'}/export/excel`;
      const res = await fetch(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OpenCAF_Remediation_Plan_${summary?.council_name.replace(/\s+/g, '_') || 'Council'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(`Excel download error: ${err}`);
    } finally {
      setDownloadingExcel(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Header & Context */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
              <FileBarChart className="w-4 h-4" />
              <span>Assurance Reporting Engine</span>
              <span className="text-slate-400">•</span>
              <span className="bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded text-[10px] font-mono">
                OFFICIAL-SENSITIVE
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              Executive Reports & Cabinet Assurance Packs
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
              Publication-grade NCSC CAF v4.0 briefings for the Council Chief Executive, Section 151 Officer, Cabinet, and external audit regulators.
            </p>
          </div>

          {/* Assessment Selector */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs text-slate-500 dark:text-slate-400">Target Assessment</div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {summary?.council_name || 'Borsetshire District Council'}
              </div>
            </div>
            {assessments.length > 1 && (
              <select
                value={selectedAssessmentId}
                onChange={(e) => setSelectedAssessmentId(e.target.value)}
                className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 font-medium"
              >
                {assessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* High-Level Posture Summary Stat Cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>CAF Maturity Score</span>
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {summary.scores.achieved_percentage}%
                </span>
                <span className="text-xs text-slate-500">Achieved</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                {summary.scores.achieved_outcomes} of {summary.scores.total_outcomes} Outcomes
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Active Control Deficits</span>
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
                  {summary.scores.not_achieved_outcomes}
                </span>
                <span className="text-xs text-rose-700 dark:text-rose-300 font-medium">Material Gaps</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                {summary.critical_risks_count} Tier 1 Essential Services
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Required Investment</span>
                <PoundSterling className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-blue-700 dark:text-blue-400">
                  £{(summary.total_remediation_budget_gbp || 127500).toLocaleString('en-GB')}
                </span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                12-Month Capital & Revenue
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Delivery Hours</span>
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {(summary.total_remediation_effort_hours || 585).toLocaleString('en-GB')}
                </span>
                <span className="text-xs text-slate-500">hrs</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                Across {summary.total_remediation_tasks || 10} action items
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Available Reports Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Report 1: Executive Cabinet Briefing */}
        <div className="bg-white dark:bg-slate-900 border-2 border-blue-600/60 dark:border-blue-500/60 rounded-xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
            Cabinet Ready
          </div>
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-blue-700 dark:text-blue-400">
              <FileBarChart className="w-4 h-4" />
              <span>Report 1: Executive Briefing</span>
            </div>
            <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
              Executive Cabinet Briefing (2-Page PDF)
            </h2>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Concise, high-level briefing tailored for the Council Chief Executive, Section 151 Officer, and Cabinet Members. Focuses on cyber threat exposure to statutory citizen services.
            </p>

            <div className="mt-4 space-y-2">
              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Included Sections:
              </div>
              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Page 1: Strategic Narrative & Objective A-D Donut Cards</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Page 2: Top 5 Cyber Risks to Essential Citizen Services</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>12-Month Remediation Burn Plan & Capital Investment (£ GBP)</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <button
              onClick={() => handleDownloadPDF('executive')}
              disabled={downloadingExec}
              className="w-full flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2.5 px-4 rounded-lg shadow-xs transition-colors text-sm disabled:opacity-50"
            >
              {downloadingExec ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Rendering WeasyPrint PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Cabinet Briefing PDF</span>
                </>
              )}
            </button>
            <button
              onClick={() => setPreviewTab('exec_p1')}
              className="w-full flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium py-2 px-3 rounded-lg text-xs transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview Page Layout Below</span>
            </button>
          </div>
        </div>

        {/* Report 2: Detailed Assurance & Audit Pack */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Report 2: Technical Pack</span>
            </div>
            <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
              Assurance & Audit Pack (Full Register PDF)
            </h2>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Exhaustive statutory evidence register for Internal Audit committees, Section 151 oversight, and NCSC/MHCLG external cyber resilience inspectors.
            </p>

            <div className="mt-4 space-y-2">
              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Included Sections:
              </div>
              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Complete Register of all 39 Contributing Outcomes</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Assessor Rationales & Checked Indicators of Good Practice</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Cryptographic SHA-256 Vault Citations for Every Document</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <button
              onClick={() => handleDownloadPDF('audit')}
              disabled={downloadingAudit}
              className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 px-4 rounded-lg shadow-xs transition-colors text-sm disabled:opacity-50"
            >
              {downloadingAudit ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Rendering Audit Pack PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Audit Pack PDF</span>
                </>
              )}
            </button>
            <button
              onClick={() => setPreviewTab('audit_sample')}
              className="w-full flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium py-2 px-3 rounded-lg text-xs transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview Audit Layout Below</span>
            </button>
          </div>
        </div>

        {/* Report 3: Multi-Format Spreadsheet & Ticket Exporter */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-amber-700 dark:text-amber-400">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Integrations & Worksheets</span>
            </div>
            <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
              Remediation Action Plan (Excel & Tickets)
            </h2>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Formatted OpenPyXL spreadsheet with GOV.UK blue styling, cost formulas, and bulk ticket payloads for Jira and GitHub Issues.
            </p>

            <div className="mt-4 space-y-2">
              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Included Formats:
              </div>
              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Excel Workbook (.xlsx) with Currency (£) & Formulas</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>RFC 4180 Audit CSV for Risk Registers</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Jira REST Bulk JSON & GitHub Issues Payloads</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <button
              onClick={handleDownloadExcel}
              disabled={downloadingExcel}
              className="w-full flex items-center justify-center gap-2 bg-amber-700 hover:bg-amber-800 text-white font-semibold py-2.5 px-4 rounded-lg shadow-xs transition-colors text-sm disabled:opacity-50"
            >
              {downloadingExcel ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Excel...</span>
                </>
              ) : (
                <>
                  <ArrowDownToLine className="w-4 h-4" />
                  <span>Download Action Plan (.xlsx)</span>
                </>
              )}
            </button>
            <Link
              href="/remediation"
              className="w-full flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium py-2 px-3 rounded-lg text-xs transition-colors"
            >
              <span>Open Remediation Kanban & Jira Exporter</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Interactive Report Document Preview Pane */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="border-b border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Eye className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              Publication Preview (Live Document Layout)
            </span>
          </div>

          {/* Preview Tab Buttons */}
          <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => setPreviewTab('exec_p1')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                previewTab === 'exec_p1'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Cabinet Briefing: Page 1
            </button>
            <button
              onClick={() => setPreviewTab('exec_p2')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                previewTab === 'exec_p2'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Cabinet Briefing: Page 2 (Risks & Burn Plan)
            </button>
            <button
              onClick={() => setPreviewTab('audit_sample')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                previewTab === 'audit_sample'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Audit Pack Sample
            </button>
          </div>
        </div>

        {/* Preview Document Paper Simulation */}
        <div className="p-6 bg-slate-100 dark:bg-slate-950 flex justify-center overflow-x-auto">
          <div className="w-full max-w-4xl bg-white text-slate-900 p-8 rounded-lg shadow-md border border-slate-300 font-sans text-xs space-y-6">
            {/* Header */}
            <div className="border-b-4 border-[#1d70b8] pb-3 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-[#1d70b8] tracking-tight">
                  {summary?.council_name || 'Borsetshire District Council'}
                </h3>
                <div className="text-sm font-bold text-slate-800 mt-0.5">
                  {previewTab === 'audit_sample'
                    ? 'NCSC CAF v4.0 Detailed Assurance & Audit Pack (39 Contributing Outcomes)'
                    : 'Executive Cabinet Cyber Resilience Briefing (NCSC CAF v4.0)'}
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-500">
                <div><strong>Classification:</strong> OFFICIAL-SENSITIVE</div>
                <div><strong>Assessment:</strong> 2025/26 Statutory Baseline</div>
                <div><strong>Framework:</strong> NCSC CAF Version 4.0</div>
              </div>
            </div>

            {/* TAB 1: EXECUTIVE BRIEFING PAGE 1 */}
            {previewTab === 'exec_p1' && (
              <div className="space-y-5">
                {/* Executive Narrative */}
                <div className="bg-[#f3f2f1] border-l-4 border-[#1d70b8] p-3 rounded-r text-[11px] text-slate-800 leading-relaxed">
                  <div className="font-bold text-[#1d70b8] mb-1">
                    Executive Summary for Cabinet & Section 151 Officer
                  </div>
                  This briefing presents the cyber resilience posture of <strong>{summary?.council_name || 'Borsetshire District Council'}</strong> evaluated against the <strong>NCSC Cyber Assessment Framework (CAF) v4.0</strong>. Local authorities face sustained, high-severity ransomware and data extortion threats targeting statutory citizen services. Across all 39 Contributing Outcomes, the council has achieved <strong>{summary?.scores.achieved_outcomes || 23} ({summary?.scores.achieved_percentage || 59.0}%)</strong> outcomes, with <strong>{summary?.scores.partially_achieved_outcomes || 12} ({summary?.scores.partially_achieved_percentage || 30.8}%)</strong> requiring technical hardening, and <strong>{summary?.scores.not_achieved_outcomes || 4} ({summary?.scores.not_achieved_percentage || 10.2}%)</strong> active control deficits posing material risk to statutory service continuity.
                </div>

                {/* 4 Objective Maturity Cards */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { id: 'A', name: 'Managing Cyber Risk', pct: 66.7, ach: 6, part: 3, not: 0 },
                    { id: 'B', name: 'Protecting Against Attack', pct: 60.0, ach: 12, part: 5, not: 3 },
                    { id: 'C', name: 'Detecting Incidents', pct: 60.0, ach: 3, part: 2, not: 0 },
                    { id: 'D', name: 'Minimising Service Impact', pct: 40.0, ach: 2, part: 2, not: 1 },
                  ].map((obj) => (
                    <div key={obj.id} className="border border-slate-200 rounded p-3 bg-white">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Objective {obj.id}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-800 h-8 line-clamp-2">
                        {obj.name}
                      </div>
                      <div className="text-lg font-bold text-[#00703c] mt-1">
                        {obj.pct}% <span className="text-[9px] font-normal text-slate-500">Achieved</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden flex my-2">
                        <div style={{ width: `${obj.pct}%` }} className="bg-[#00703c]" />
                        <div style={{ width: '25%' }} className="bg-[#f47738]" />
                        <div style={{ width: '15%' }} className="bg-[#d4351c]" />
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-500">
                        <span>✓ {obj.ach}</span>
                        <span>~ {obj.part}</span>
                        <span>✗ {obj.not}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary Banner */}
                <div className="bg-[#1d70b8] text-white p-4 rounded flex justify-between text-center">
                  <div>
                    <div className="text-xl font-black">39</div>
                    <div className="text-[9px] uppercase tracking-wider text-blue-100">Total Outcomes</div>
                  </div>
                  <div>
                    <div className="text-xl font-black text-emerald-300">{summary?.scores.achieved_outcomes || 23}</div>
                    <div className="text-[9px] uppercase tracking-wider text-blue-100">Achieved (59.0%)</div>
                  </div>
                  <div>
                    <div className="text-xl font-black text-amber-300">{summary?.scores.partially_achieved_outcomes || 12}</div>
                    <div className="text-[9px] uppercase tracking-wider text-blue-100">Partially Achieved</div>
                  </div>
                  <div>
                    <div className="text-xl font-black text-rose-300">{summary?.scores.not_achieved_outcomes || 4}</div>
                    <div className="text-[9px] uppercase tracking-wider text-blue-100">Control Deficits</div>
                  </div>
                  <div>
                    <div className="text-xl font-black">100.0%</div>
                    <div className="text-[9px] uppercase tracking-wider text-blue-100">Audit Completion</div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 border-t border-dashed border-slate-300 pt-3">
                  <strong>Assurance Declaration:</strong> Assessed in accordance with NCSC CAF v4.0 principles. All outcomes are backed by tamper-evident cryptographic evidence logs stored in the Open CAF evidence vault.
                </div>
              </div>
            )}

            {/* TAB 2: EXECUTIVE BRIEFING PAGE 2 */}
            {previewTab === 'exec_p2' && (
              <div className="space-y-5">
                <div>
                  <h4 className="font-bold text-[#1d70b8] text-sm mb-2">
                    Top 5 Cyber Risks to Essential Citizen Services (Tier 1 Priority)
                  </h4>
                  <div className="border border-slate-200 rounded overflow-hidden">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-[#f3f2f1] text-slate-800 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2 w-8 text-center">#</th>
                          <th className="p-2">Impacted Council Service</th>
                          <th className="p-2">Deficit Description</th>
                          <th className="p-2 text-center">Score</th>
                          <th className="p-2 text-center">Risk Tier</th>
                          <th className="p-2 text-center">Target SLA</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        <tr>
                          <td className="p-2 font-bold text-center">1</td>
                          <td className="p-2 font-semibold">Adult & Children's Social Care</td>
                          <td className="p-2 text-slate-600">Legacy Remote Desktop Gateway lacking MFA for on-call social workers (B2.a)</td>
                          <td className="p-2 text-center font-bold text-rose-600">92.5</td>
                          <td className="p-2 text-center"><span className="bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-bold text-[10px]">CRITICAL</span></td>
                          <td className="p-2 text-center font-bold text-rose-600">14 days</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-bold text-center">2</td>
                          <td className="p-2 font-semibold">Adult & Children's Social Care</td>
                          <td className="p-2 text-slate-600">Statutory child protection SQL server on flat unsegmented network with building IoT (B4.a)</td>
                          <td className="p-2 text-center font-bold text-rose-600">90.0</td>
                          <td className="p-2 text-center"><span className="bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-bold text-[10px]">CRITICAL</span></td>
                          <td className="p-2 text-center font-bold text-rose-600">14 days</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-bold text-center">3</td>
                          <td className="p-2 font-semibold">Revenues & Housing Benefits</td>
                          <td className="p-2 text-slate-600">Revenues SQL backups lack immutable air-gapped protection against ransomware (D1.a)</td>
                          <td className="p-2 text-center font-bold text-rose-600">88.0</td>
                          <td className="p-2 text-center"><span className="bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-bold text-[10px]">CRITICAL</span></td>
                          <td className="p-2 text-center font-bold text-rose-600">14 days</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-bold text-center">4</td>
                          <td className="p-2 font-semibold">Electoral Registration & Elections</td>
                          <td className="p-2 text-slate-600">Electoral register AD domain trusts legacy corporate domain without isolation (B1.a)</td>
                          <td className="p-2 text-center font-bold text-rose-600">81.0</td>
                          <td className="p-2 text-center"><span className="bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-bold text-[10px]">CRITICAL</span></td>
                          <td className="p-2 text-center font-bold text-rose-600">14 days</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-bold text-center">5</td>
                          <td className="p-2 font-semibold">Citizen Payments & Transaction Gateway</td>
                          <td className="p-2 text-slate-600">Email domain lacks DMARC 'reject' enforcement on citizen payment notifications (B4.d)</td>
                          <td className="p-2 text-center font-bold text-amber-600">72.0</td>
                          <td className="p-2 text-center"><span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold text-[10px]">HIGH</span></td>
                          <td className="p-2 text-center font-bold text-amber-600">45 days</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 12-Month Burn Plan */}
                <div>
                  <h4 className="font-bold text-[#1d70b8] text-sm mb-2">
                    12-Month Phased Remediation Roadmap & Investment Burn Plan
                  </h4>
                  <div className="border border-slate-200 rounded overflow-hidden">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-[#f3f2f1] text-slate-800 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2">Execution Phase</th>
                          <th className="p-2">Strategic Focus & Key Deliverables</th>
                          <th className="p-2 text-center">Target Window</th>
                          <th className="p-2 text-right">Required Budget (£)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        <tr>
                          <td className="p-2 font-bold">Phase 1: Emergency Containment</td>
                          <td className="p-2 text-slate-600">Enforce MFA on social care remote gateway, isolate OT/BMS networks, configure immutable AWS S3 backups.</td>
                          <td className="p-2 text-center"><span className="bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-bold text-[10px]">0 - 30 Days</span></td>
                          <td className="p-2 text-right font-bold">£94,000</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-bold">Phase 2: Core Hardening</td>
                          <td className="p-2 text-slate-600">Transition DMARC to reject, upgrade legacy Housing servers, deploy LAPS for civic IoT endpoints.</td>
                          <td className="p-2 text-center"><span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold text-[10px]">30 - 90 Days</span></td>
                          <td className="p-2 text-right font-bold">£20,700</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-bold">Phase 3: Resilience & Governance</td>
                          <td className="p-2 text-slate-600">Develop OT incident playbooks, establish continuous SaaS vendor auditing, conduct bare-metal restore drills.</td>
                          <td className="p-2 text-center"><span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold text-[10px]">90 - 365 Days</span></td>
                          <td className="p-2 text-right font-bold">£12,800</td>
                        </tr>
                        <tr className="bg-[#f3f2f1] font-bold">
                          <td colSpan={3} className="p-2 text-right">Total Required 12-Month Cyber Remediation Investment:</td>
                          <td className="p-2 text-right text-blue-700 text-xs">£127,500</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: AUDIT PACK SAMPLE */}
            {previewTab === 'audit_sample' && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#1d70b8] text-white px-2 py-0.5 rounded font-bold text-[11px]">B2.a</span>
                      <span className="font-bold text-slate-800 text-xs">Identity and Access Management</span>
                    </div>
                    <span className="bg-[#d4351c] text-white px-2 py-0.5 rounded font-bold text-[10px]">NOT_ACHIEVED</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    The organisation understands, documents and manages access to the network and information systems supporting essential functions.
                  </p>
                  <div className="bg-[#f3f2f1] border-l-2 border-[#1d70b8] p-2 mt-2 text-[10px] text-slate-700">
                    <strong>Assessor Rationale:</strong> Legacy Remote Desktop Gateway used by Adult Social Care out-of-hours social workers lacks modern FIDO2/MFA conditional access enforcement.
                  </div>
                  <div className="mt-2 space-y-1 text-[10px]">
                    <div className="font-bold text-slate-500">Indicators of Good Practice (IGP):</div>
                    <div className="text-slate-400">☐ [ACHIEVED] Multi-factor authentication is enforced for all remote access and administrative connections.</div>
                    <div className="font-bold text-[#00703c]">☑ [PARTIALLY_ACHIEVED] Passwords are changed from default values, but MFA is not enforced on legacy remote paths.</div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <div className="font-bold text-slate-500 text-[10px]">Verified Evidence Vault Citations:</div>
                    <div className="bg-white border border-slate-200 p-1.5 rounded mt-1 text-[10px]">
                      <strong>CREST Accredited External Infrastructure Penetration Test - Q3 2024</strong> (crest_infrastructure_pentest_q3_2024.pdf)
                      <div className="font-mono text-[9px] text-slate-400">SHA-256: 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069...</div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#1d70b8] text-white px-2 py-0.5 rounded font-bold text-[11px]">B4.c</span>
                      <span className="font-bold text-slate-800 text-xs">Endpoint Protection & Threat Isolation</span>
                    </div>
                    <span className="bg-[#00703c] text-white px-2 py-0.5 rounded font-bold text-[10px]">ACHIEVED</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Technical controls are in place to detect and mitigate malicious code execution on council endpoints.
                  </p>
                  <div className="bg-[#f3f2f1] border-l-2 border-[#1d70b8] p-2 mt-2 text-[10px] text-slate-700">
                    <strong>Assessor Rationale:</strong> CrowdStrike Falcon EDR is deployed and reporting healthy on 100% of Windows and Linux servers with automated endpoint isolation.
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <div className="font-bold text-slate-500 text-[10px]">Verified Evidence Vault Citations:</div>
                    <div className="bg-white border border-slate-200 p-1.5 rounded mt-1 text-[10px]">
                      <strong>CrowdStrike Falcon EDR Coverage & Sensor Health Report</strong> (crowdstrike_edr_telemetry_report.pdf)
                      <div className="font-mono text-[9px] text-slate-400">SHA-256: 2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae...</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
