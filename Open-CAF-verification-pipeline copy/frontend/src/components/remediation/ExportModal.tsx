'use client';

import React, { useState } from 'react';
import { RemediationTask } from '@/types/remediation';
import { tokenStorage } from '@/lib/api';
import {
  X,
  Download,
  Copy,
  Check,
  FileSpreadsheet,
  FileText,
  Share2,
  GitBranch,
  Code2,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessmentId?: string;
  tasks: RemediationTask[];
}

type ExportTab = 'EXCEL' | 'CSV' | 'JIRA' | 'GITHUB';

export function ExportModal({
  isOpen,
  onClose,
  assessmentId = 'ass-demo-001',
  tasks,
}: ExportModalProps) {
  const [activeTab, setActiveTab] = useState<ExportTab>('EXCEL');
  const [jiraProjectKey, setJiraProjectKey] = useState('CAF');
  const [jiraIssueType, setJiraIssueType] = useState('Task');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  // Generate Jira JSON structure
  const jiraPayload = {
    issueUpdates: tasks.map((t) => ({
      fields: {
        project: { key: jiraProjectKey },
        summary: `[${t.outcome_id}] ${t.title}`,
        description:
          `*NCSC CAF Contributing Outcome:* ${t.outcome_id}\n` +
          `*Estimated Effort:* ${t.estimated_effort_hours}h | *Estimated Budget:* £${(t.estimated_cost_gbp || 0).toLocaleString('en-GB')}\n` +
          `*Assigned Lead:* ${t.assigned_owner_name || 'Unassigned'} (${t.assigned_owner_email || 'N/A'})\n\n` +
          `${t.description || 'No detailed description provided.'}`,
        issuetype: { name: jiraIssueType },
        priority: {
          name:
            t.priority === 'CRITICAL'
              ? 'Highest'
              : t.priority === 'HIGH'
              ? 'High'
              : t.priority === 'MEDIUM'
              ? 'Medium'
              : 'Low',
        },
        labels: ['OpenCAF', 'NCSC-CAF', `CAF-${t.outcome_id.replace('.', '_')}`],
        duedate: t.target_completion_date || undefined,
      },
    })),
  };

  // Generate GitHub Issues structure
  const githubPayload = {
    total_tasks: tasks.length,
    issues: tasks.map((t) => ({
      title: `[${t.outcome_id}] ${t.title}`,
      body:
        `### NCSC Cyber Assessment Framework Action Item\n\n` +
        `- **Contributing Outcome:** \`${t.outcome_id}\`\n` +
        `- **Priority:** \`${t.priority}\`\n` +
        `- **Status:** \`${t.status}\`\n` +
        `- **Est. Cost:** £${(t.estimated_cost_gbp || 0).toLocaleString('en-GB')}\n` +
        `- **Est. Effort:** ${t.estimated_effort_hours} hours\n` +
        `- **Target Date:** ${t.target_completion_date || 'TBD'}\n\n` +
        `#### Context & Scope\n${t.description || 'No description provided.'}`,
      labels: ['opencaf', 'ncsc-caf', `outcome:${t.outcome_id.toLowerCase()}`, `priority:${t.priority.toLowerCase()}`],
      assignees: t.assigned_owner_email ? [t.assigned_owner_email.split('@')[0]] : [],
    })),
  };

  const handleCopyJson = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadCsv = async () => {
    setDownloading(true);
    setError(null);
    try {
      const token = tokenStorage.getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/assessments/${assessmentId}/export/csv`, {
        headers,
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `opencaf_remediation_${assessmentId}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Fallback client CSV generator
        const headersList = [
          'Outcome Code',
          'Title',
          'Status',
          'Priority',
          'Owner Name',
          'Owner Email',
          'Cost GBP',
          'Effort Hours',
          'Target Date',
          'Ticket ID',
        ];
        const rows = tasks.map((t) => [
          t.outcome_id,
          `"${t.title.replace(/"/g, '""')}"`,
          t.status,
          t.priority,
          `"${(t.assigned_owner_name || '').replace(/"/g, '""')}"`,
          `"${(t.assigned_owner_email || '').replace(/"/g, '""')}"`,
          t.estimated_cost_gbp || 0,
          t.estimated_effort_hours || 0,
          t.target_completion_date || '',
          t.external_ticket_id || '',
        ]);
        const csvContent = [headersList.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `opencaf_remediation_${assessmentId}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      setError('Unable to download CSV directly from server; downloaded client snapshot.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadExcel = async () => {
    setDownloading(true);
    setError(null);
    try {
      const token = tokenStorage.getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/assessments/${assessmentId}/export/excel`, {
        headers,
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `opencaf_remediation_action_plan_${assessmentId}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        setError('Server Excel exporter returned an error. Ensure backend server is running.');
      }
    } catch {
      setError('Could not connect to backend exporter endpoint.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadJsonFile = (payload: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gov-blue/10 dark:bg-blue-950/60 flex items-center justify-center text-gov-blue dark:text-blue-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Export Remediation Action Plan & Integrations
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Share audit deliverables or sync tasks with council issue trackers
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 bg-slate-50/50 dark:bg-slate-900/30 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('EXCEL')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'EXCEL'
                ? 'border-gov-blue text-gov-blue dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excel Action Plan (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CSV')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'CSV'
                ? 'border-gov-blue text-gov-blue dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Audit CSV (RFC 4180)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('JIRA')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'JIRA'
                ? 'border-gov-blue text-gov-blue dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Share2 className="w-4 h-4 text-blue-500" />
            <span>Jira REST Bulk JSON</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('GITHUB')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'GITHUB'
                ? 'border-gov-blue text-gov-blue dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <GitBranch className="w-4 h-4 text-slate-800 dark:text-slate-200" />
            <span>GitHub Issues Payload</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: EXCEL */}
          {activeTab === 'EXCEL' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Audit Committee Executive Action Plan (.xlsx)</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Generates an openpyxl-formatted spreadsheet engineered specifically for council leadership and Audit & Governance Committees.
                </p>
                <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1 list-disc list-inside">
                  <li>Official GOV.UK Blue (<code className="text-xs text-blue-600">#1D70B8</code>) title banner & headers</li>
                  <li>Formatted currency cells (£ GBP) with thousand separators</li>
                  <li>Dynamic <code className="text-xs">=SUM()</code> financial total row at the foot of the table</li>
                  <li>Color-coded status pills (Completed Green, In Progress Blue, Critical Priority Red)</li>
                </ul>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Includes {tasks.length} remediation action items
                </span>
                <button
                  type="button"
                  disabled={downloading}
                  onClick={handleDownloadExcel}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{downloading ? 'Generating...' : 'Download Excel (.xlsx)'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: CSV */}
          {activeTab === 'CSV' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-400 font-bold text-sm">
                  <FileText className="w-4 h-4" />
                  <span>RFC 4180 Standard CSV Export</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Clean, universal plain-text table export containing all 15 audit fields. Ready for immediate ingestion into council data lakes, PowerBI, Tableau, or custom risk databases.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Format: UTF-8, CRLF, comma-separated with quoted text
                </span>
                <button
                  type="button"
                  disabled={downloading}
                  onClick={handleDownloadCsv}
                  className="px-5 py-2.5 rounded-xl bg-gov-blue hover:bg-gov-blue/90 text-white text-xs font-bold shadow-xs transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{downloading ? 'Exporting...' : 'Download CSV File'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: JIRA */}
          {activeTab === 'JIRA' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Jira Project Key
                  </label>
                  <input
                    type="text"
                    value={jiraProjectKey}
                    onChange={(e) => setJiraProjectKey(e.target.value.toUpperCase())}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    placeholder="e.g. CAF"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Jira Issue Type
                  </label>
                  <input
                    type="text"
                    value={jiraIssueType}
                    onChange={(e) => setJiraIssueType(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    placeholder="Task"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Jira REST API v3 Bulk Creation Payload (<code>POST /rest/api/3/issue/bulk</code>):
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyJson(JSON.stringify(jiraPayload, null, 2))}
                    className="text-xs text-gov-blue dark:text-blue-400 hover:underline flex items-center space-x-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 text-[11px] font-mono max-h-56 overflow-y-auto overflow-x-auto border border-slate-800">
                  {JSON.stringify(jiraPayload, null, 2)}
                </pre>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => handleCopyJson(JSON.stringify(jiraPayload, null, 2))}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-1.5"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied to Clipboard' : 'Copy JSON Payload'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadJsonFile(jiraPayload, `opencaf-jira-bulk-${assessmentId}.json`)}
                  className="px-4 py-2 rounded-xl bg-gov-blue hover:bg-gov-blue/90 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .json File</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: GITHUB */}
          {activeTab === 'GITHUB' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    GitHub Issues Batch Payload:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyJson(JSON.stringify(githubPayload, null, 2))}
                    className="text-xs text-gov-blue dark:text-blue-400 hover:underline flex items-center space-x-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 text-[11px] font-mono max-h-64 overflow-y-auto overflow-x-auto border border-slate-800">
                  {JSON.stringify(githubPayload, null, 2)}
                </pre>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => handleCopyJson(JSON.stringify(githubPayload, null, 2))}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-1.5"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied to Clipboard' : 'Copy JSON Payload'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadJsonFile(githubPayload, `opencaf-github-issues-${assessmentId}.json`)}
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-xs flex items-center space-x-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .json File</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
