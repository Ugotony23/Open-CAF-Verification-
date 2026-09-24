'use client';

import React, { useState, useEffect } from 'react';
import {
  RemediationTask,
  RemediationStatus,
  RemediationPriority,
  TechnicalStepItem,
  RemediationTaskCreateInput,
  RemediationTaskUpdateInput,
} from '@/types/remediation';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  PoundSterling,
  Clock,
  User,
  Mail,
  FileText,
  CheckSquare,
  AlertCircle,
} from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: RemediationTask | null;
  defaultStatus?: RemediationStatus;
  assessmentId?: string;
  onSave: (data: RemediationTaskCreateInput | RemediationTaskUpdateInput, taskId?: string) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
}

const OUTCOMES = [
  { id: 'A1.a', label: 'A1.a Governance' },
  { id: 'A2.a', label: 'A2.a Risk Management' },
  { id: 'A3.a', label: 'A3.a Asset Management' },
  { id: 'A4.a', label: 'A4.a Supply Chain Governance' },
  { id: 'A4.b', label: 'A4.b Supplier Cyber Security' },
  { id: 'B1.a', label: 'B1.a Service Protection Policies' },
  { id: 'B2.a', label: 'B2.a Identity and Access Management' },
  { id: 'B2.b', label: 'B2.b Privileged Access Management' },
  { id: 'B3.a', label: 'B3.a Physical Security' },
  { id: 'B4.a', label: 'B4.a Resilient Networks and Systems' },
  { id: 'B4.b', label: 'B4.b Secure Configuration' },
  { id: 'B5.a', label: 'B5.a Vulnerability Management' },
  { id: 'C1.a', label: 'C1.a Monitoring Coverage' },
  { id: 'C2.a', label: 'C2.a Proactive Security Event Tracking' },
  { id: 'D1.a', label: 'D1.a Incident Response Planning' },
  { id: 'D2.a', label: 'D2.a Lessons Learned' },
];

export function TaskModal({
  isOpen,
  onClose,
  task,
  defaultStatus = 'BACKLOG',
  assessmentId = 'ass-demo-001',
  onSave,
  onDelete,
}: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [outcomeId, setOutcomeId] = useState('B2.a');
  const [status, setStatus] = useState<RemediationStatus>(defaultStatus);
  const [priority, setPriority] = useState<RemediationPriority>('HIGH');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [effortHours, setEffortHours] = useState<string>('20');
  const [costGbp, setCostGbp] = useState<string>('5000');
  const [targetDate, setTargetDate] = useState('');
  const [externalTicketId, setExternalTicketId] = useState('');
  const [steps, setSteps] = useState<TechnicalStepItem[]>([]);
  const [newStepText, setNewStepText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setOutcomeId(task.outcome_id || 'B2.a');
      setStatus(task.status || 'BACKLOG');
      setPriority(task.priority || 'HIGH');
      setOwnerName(task.assigned_owner_name || '');
      setOwnerEmail(task.assigned_owner_email || '');
      setEffortHours(task.estimated_effort_hours?.toString() || '0');
      setCostGbp(task.estimated_cost_gbp?.toString() || '0');
      setTargetDate(task.target_completion_date || '');
      setExternalTicketId(task.external_ticket_id || '');

      const normSteps = Array.isArray(task.technical_steps)
        ? task.technical_steps.map((s) => (typeof s === 'string' ? { step: s, completed: false } : s))
        : [];
      setSteps(normSteps);
    } else {
      setTitle('');
      setDescription('');
      setOutcomeId('B2.a');
      setStatus(defaultStatus);
      setPriority('HIGH');
      setOwnerName('');
      setOwnerEmail('');
      setEffortHours('20');
      setCostGbp('5000');
      setTargetDate('');
      setExternalTicketId('');
      setSteps([]);
    }
    setError(null);
  }, [task, defaultStatus, isOpen]);

  if (!isOpen) return null;

  const handleAddStep = () => {
    if (!newStepText.trim()) return;
    setSteps([...steps, { step: newStepText.trim(), completed: false }]);
    setNewStepText('');
  };

  const handleToggleStep = (index: number) => {
    const updated = [...steps];
    updated[index].completed = !updated[index].completed;
    setSteps(updated);
  };

  const handleRemoveStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      outcome_id: outcomeId,
      status,
      priority,
      assigned_owner_name: ownerName.trim() || null,
      assigned_owner_email: ownerEmail.trim() || null,
      estimated_effort_hours: parseFloat(effortHours) || 0,
      estimated_cost_gbp: parseFloat(costGbp) || 0,
      target_completion_date: targetDate || null,
      external_ticket_id: externalTicketId.trim() || null,
      technical_steps: steps,
      assessment_id: assessmentId,
    };

    try {
      await onSave(payload, task?.id);
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task?.id || !onDelete) return;
    if (!confirm(`Are you sure you want to delete "${task.title}"?`)) return;
    setSaving(true);
    try {
      await onDelete(task.id);
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to delete task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {task ? 'Edit Remediation Task' : 'Create Remediation Action'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Alignd to NCSC Cyber Assessment Framework outcome requirements
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Deploy MFA on Legacy Remote Desktop Gateway"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gov-blue"
            />
          </div>

          {/* Outcome & Priority & Status Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Target Outcome *
              </label>
              <select
                value={outcomeId}
                onChange={(e) => setOutcomeId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gov-blue"
              >
                {OUTCOMES.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Priority *
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as RemediationPriority)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gov-blue"
              >
                <option value="CRITICAL">Critical (14d SLA)</option>
                <option value="HIGH">High (45d SLA)</option>
                <option value="MEDIUM">Medium (90d SLA)</option>
                <option value="LOW">Low (180d SLA)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Kanban Status *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as RemediationStatus)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gov-blue"
              >
                <option value="BACKLOG">Backlog</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Description & Context
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Technical summary, business risk, or operational constraints..."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gov-blue"
            />
          </div>

          {/* Owner Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Owner Name
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gov-blue"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Owner Email
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="sarah.jenkins@council.gov.uk"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gov-blue"
                />
              </div>
            </div>
          </div>

          {/* Budget, Effort, Target Date, Ticket */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Est. Cost (£)
              </label>
              <div className="relative">
                <PoundSterling className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={costGbp}
                  onChange={(e) => setCostGbp(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gov-blue font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Effort (Hours)
              </label>
              <div className="relative">
                <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={effortHours}
                  onChange={(e) => setEffortHours(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gov-blue font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Target Date
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gov-blue"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Ticket Key
              </label>
              <input
                type="text"
                value={externalTicketId}
                onChange={(e) => setExternalTicketId(e.target.value)}
                placeholder="JIRA-2041"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gov-blue font-mono"
              />
            </div>
          </div>

          {/* Technical Checklist */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Technical Implementation Checklist
            </label>

            <div className="space-y-2 mb-2 max-h-36 overflow-y-auto">
              {steps.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center space-x-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => handleToggleStep(idx)}
                    className="rounded border-slate-300 text-gov-blue focus:ring-gov-blue"
                  />
                  <span
                    className={`flex-1 text-slate-800 dark:text-slate-200 ${
                      item.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''
                    }`}
                  >
                    {item.step}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(idx)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newStepText}
                onChange={(e) => setNewStepText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddStep();
                  }
                }}
                placeholder="Add actionable step (e.g. 'Deploy conditional access policy')..."
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gov-blue"
              />
              <button
                type="button"
                onClick={handleAddStep}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            {task && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors inline-flex items-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Task</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-xs font-bold text-white bg-gov-blue hover:bg-gov-blue/90 rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : task ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
