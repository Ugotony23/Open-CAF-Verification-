'use client';

import React, { useState } from 'react';
import { RemediationTask, RemediationStatus } from '@/types/remediation';
import { TaskCard } from './TaskCard';
import { Plus, ListFilter, PoundSterling, Clock } from 'lucide-react';

interface KanbanBoardProps {
  tasks: RemediationTask[];
  onMoveTask: (taskId: string, newStatus: RemediationStatus) => void;
  onEditTask: (task: RemediationTask) => void;
  onAddTask: (status: RemediationStatus) => void;
}

interface ColumnConfig {
  status: RemediationStatus;
  title: string;
  badgeBg: string;
  badgeText: string;
  accentBorder: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    status: 'BACKLOG',
    title: 'Backlog / Planned',
    badgeBg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    badgeText: 'Backlog',
    accentBorder: 'border-t-slate-400',
  },
  {
    status: 'IN_PROGRESS',
    title: 'In Progress / Active',
    badgeBg: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    badgeText: 'In Progress',
    accentBorder: 'border-t-blue-500',
  },
  {
    status: 'IN_REVIEW',
    title: 'In Review / QA',
    badgeBg: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',
    badgeText: 'In Review',
    accentBorder: 'border-t-purple-500',
  },
  {
    status: 'COMPLETED',
    title: 'Completed / Signed-Off',
    badgeBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    badgeText: 'Completed',
    accentBorder: 'border-t-emerald-500',
  },
];

export function KanbanBoard({ tasks, onMoveTask, onEditTask, onAddTask }: KanbanBoardProps) {
  const [dragOverCol, setDragOverCol] = useState<RemediationStatus | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.status);
        const colHours = colTasks.reduce((acc, t) => acc + (t.estimated_effort_hours || 0), 0);
        const colCost = colTasks.reduce((acc, t) => acc + (t.estimated_cost_gbp || 0), 0);
        const isDraggedOver = dragOverCol === col.status;

        return (
          <div
            key={col.status}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (dragOverCol !== col.status) {
                setDragOverCol(col.status);
              }
            }}
            onDragLeave={(e) => {
              // Only reset if leaving the column container itself
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragOverCol(null);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverCol(null);
              const taskId = e.dataTransfer.getData('text/plain');
              if (taskId) {
                onMoveTask(taskId, col.status);
              }
            }}
            className={`flex flex-col rounded-2xl bg-slate-100/70 dark:bg-slate-900/50 border border-t-4 ${
              col.accentBorder
            } border-slate-200 dark:border-slate-800 transition-colors duration-200 min-h-[500px] ${
              isDraggedOver
                ? 'ring-2 ring-gov-blue dark:ring-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                : ''
            }`}
          >
            {/* Column Header */}
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  {col.title}
                </span>
                <span
                  className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold ${col.badgeBg}`}
                >
                  {colTasks.length}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onAddTask(col.status)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-colors"
                title={`Add task to ${col.badgeText}`}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Column Sub-metrics (£ and Hours) */}
            <div className="px-3.5 py-2 bg-white/50 dark:bg-slate-900/30 border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center font-medium">
                <PoundSterling className="w-3 h-3 mr-0.5 text-slate-400" />
                £{colCost.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
              </span>
              <span className="flex items-center font-medium">
                <Clock className="w-3 h-3 mr-1 text-slate-400" />
                {colHours.toFixed(0)} hrs
              </span>
            </div>

            {/* Task Cards List */}
            <div className="p-3 flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-320px)]">
              {colTasks.length === 0 ? (
                <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400 dark:text-slate-500 space-y-1">
                  <ListFilter className="w-4 h-4 opacity-50" />
                  <span>No tasks in {col.badgeText.toLowerCase()}</span>
                  <button
                    type="button"
                    onClick={() => onAddTask(col.status)}
                    className="text-gov-blue dark:text-blue-400 font-semibold hover:underline mt-1"
                  >
                    + Create one
                  </button>
                </div>
              ) : (
                colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => onEditTask(task)}
                  />
                ))
              )}
            </div>

            {/* Column Footer: Quick Add Button */}
            <div className="p-3 border-t border-slate-200/60 dark:border-slate-800/60">
              <button
                type="button"
                onClick={() => onAddTask(col.status)}
                className="w-full py-2 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-colors flex items-center justify-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
