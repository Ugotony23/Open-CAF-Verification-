'use client';

import React from 'react';
import { RemediationTask, RemediationPriority } from '@/types/remediation';
import {
  Clock,
  PoundSterling,
  AlertTriangle,
  ExternalLink,
  Calendar,
  CheckSquare,
  GripVertical,
} from 'lucide-react';

interface TaskCardProps {
  task: RemediationTask;
  onClick: () => void;
  onDragStart?: (e: React.DragEvent, taskId: string) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

export function TaskCard({ task, onClick, onDragStart, onDragEnd }: TaskCardProps) {
  const today = new Date().toISOString().split('T')[0];
  const isOverdue =
    task.target_completion_date &&
    task.target_completion_date < today &&
    task.status !== 'COMPLETED' &&
    task.status !== 'CANCELLED';

  const priorityConfig: Record<RemediationPriority, { bg: string; text: string; label: string }> = {
    CRITICAL: {
      bg: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900',
      text: 'Critical',
      label: '14d SLA',
    },
    HIGH: {
      bg: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-900',
      text: 'High',
      label: '45d SLA',
    },
    MEDIUM: {
      bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900',
      text: 'Medium',
      label: '90d SLA',
    },
    LOW: {
      bg: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      text: 'Low',
      label: '180d SLA',
    },
  };

  const priorityStyle = priorityConfig[task.priority] || priorityConfig.MEDIUM;

  // Extract checklist progress
  const steps = Array.isArray(task.technical_steps) ? task.technical_steps : [];
  const completedSteps = steps.filter((s) => typeof s === 'object' && s.completed).length;
  const totalSteps = steps.length;

  // Assignee initials
  const initials = task.assigned_owner_name
    ? task.assigned_owner_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??';

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart?.(e, task.id);
      }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`group relative bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing border-slate-200 dark:border-slate-800 hover:border-gov-blue/50 dark:hover:border-blue-500/50 ${
        isOverdue ? 'ring-1 ring-red-500/30' : ''
      }`}
    >
      {/* Top row: Outcome chip, Priority pill, Drag handle */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
          {/* Outcome chip */}
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-gov-blue/10 text-gov-blue dark:bg-blue-950/60 dark:text-blue-300 font-mono">
            {task.outcome_id}
          </span>

          {/* Priority pill */}
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${priorityStyle.bg}`}
          >
            {priorityStyle.text}
          </span>

          {/* External ticket ID */}
          {task.external_ticket_id && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              <ExternalLink className="w-2.5 h-2.5 mr-1" />
              {task.external_ticket_id}
            </span>
          )}
        </div>

        <div className="text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-400">
          <GripVertical className="w-4 h-4" />
        </div>
      </div>

      {/* Task Title */}
      <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
        {task.title}
      </h4>

      {/* Description Snippet */}
      {task.description && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Technical Steps Progress */}
      {totalSteps > 0 && (
        <div className="mt-2.5 flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400">
          <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
          <span>
            {completedSteps}/{totalSteps} steps completed
          </span>
          <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gov-blue dark:bg-blue-500 h-full rounded-full transition-all"
              style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Meta Pills: Cost, Effort, Target Date */}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          {/* Cost */}
          <span className="inline-flex items-center font-bold text-slate-800 dark:text-slate-200">
            <PoundSterling className="w-3.5 h-3.5 text-slate-400 mr-0.5" />
            {task.estimated_cost_gbp.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
          </span>

          {/* Effort Hours */}
          <span className="inline-flex items-center text-slate-500 dark:text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-400 mr-1" />
            {task.estimated_effort_hours}h
          </span>
        </div>

        {/* Due Date & Overdue flag */}
        {task.target_completion_date && (
          <div
            className={`flex items-center text-[11px] font-medium ${
              isOverdue
                ? 'text-red-600 dark:text-red-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {isOverdue ? (
              <AlertTriangle className="w-3 h-3 mr-1" />
            ) : (
              <Calendar className="w-3 h-3 mr-1 text-slate-400" />
            )}
            <span>{task.target_completion_date}</span>
          </div>
        )}
      </div>

      {/* Owner Avatar & Name */}
      <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-50 dark:border-slate-800/50">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0">
            {initials}
          </div>
          <span className="text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-[140px]">
            {task.assigned_owner_name || 'Unassigned'}
          </span>
        </div>

        {task.status === 'COMPLETED' && (
          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Done
          </span>
        )}
      </div>
    </div>
  );
}
