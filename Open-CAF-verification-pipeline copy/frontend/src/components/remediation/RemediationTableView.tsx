'use client';

import React, { useState } from 'react';
import { RemediationTask, RemediationStatus, RemediationPriority } from '@/types/remediation';
import {
  ExternalLink,
  Calendar,
  PoundSterling,
  Clock,
  Edit2,
  Trash2,
  AlertTriangle,
  ArrowUpDown,
  Search,
  Filter,
} from 'lucide-react';

interface RemediationTableViewProps {
  tasks: RemediationTask[];
  onEditTask: (task: RemediationTask) => void;
  onStatusChange: (taskId: string, newStatus: RemediationStatus) => void;
  onDeleteTask: (taskId: string) => void;
}

export function RemediationTableView({
  tasks,
  onEditTask,
  onStatusChange,
  onDeleteTask,
}: RemediationTableViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  const today = new Date().toISOString().split('T')[0];

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.outcome_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.assigned_owner_name &&
        task.assigned_owner_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (task.external_ticket_id &&
        task.external_ticket_id.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || task.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const priorityBadges: Record<RemediationPriority, { bg: string; text: string }> = {
    CRITICAL: { bg: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300', text: 'Critical' },
    HIGH: { bg: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300', text: 'High' },
    MEDIUM: { bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300', text: 'Medium' },
    LOW: { bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', text: 'Low' },
  };

  const statusBadges: Record<RemediationStatus, { bg: string; text: string }> = {
    BACKLOG: { bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', text: 'Backlog' },
    IN_PROGRESS: { bg: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300', text: 'In Progress' },
    IN_REVIEW: { bg: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300', text: 'In Review' },
    COMPLETED: { bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300', text: 'Completed' },
    CANCELLED: { bg: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400', text: 'Cancelled' },
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
      {/* Search & Filter Bar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tasks, outcomes, owners, or ticket IDs..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gov-blue"
          />
        </div>

        <div className="flex items-center space-x-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gov-blue"
          >
            <option value="ALL">All Statuses</option>
            <option value="BACKLOG">Backlog</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="COMPLETED">Completed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gov-blue"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4">Outcome</th>
              <th className="py-3 px-4">Remediation Action</th>
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Owner</th>
              <th className="py-3 px-4">Cost (£)</th>
              <th className="py-3 px-4">Effort</th>
              <th className="py-3 px-4">Target Date</th>
              <th className="py-3 px-4">Ticket</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-400 dark:text-slate-500">
                  No matching remediation tasks found.
                </td>
              </tr>
            ) : (
              filteredTasks.map((task) => {
                const isOverdue =
                  task.target_completion_date &&
                  task.target_completion_date < today &&
                  task.status !== 'COMPLETED' &&
                  task.status !== 'CANCELLED';

                return (
                  <tr
                    key={task.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-gov-blue dark:text-blue-400">
                      {task.outcome_id}
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <div
                        onClick={() => onEditTask(task)}
                        className="font-bold text-slate-900 dark:text-white cursor-pointer hover:underline truncate"
                      >
                        {task.title}
                      </div>
                      {task.description && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {task.description}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                          priorityBadges[task.priority]?.bg
                        }`}
                      >
                        {priorityBadges[task.priority]?.text}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <select
                        value={task.status}
                        onChange={(e) =>
                          onStatusChange(task.id, e.target.value as RemediationStatus)
                        }
                        className={`text-[11px] font-bold rounded-lg px-2 py-1 border-0 cursor-pointer focus:ring-1 focus:ring-gov-blue ${
                          statusBadges[task.status]?.bg
                        }`}
                      >
                        <option value="BACKLOG">Backlog</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="IN_REVIEW">In Review</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {task.assigned_owner_name || '—'}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap font-mono font-semibold text-slate-900 dark:text-white">
                      £{task.estimated_cost_gbp.toLocaleString('en-GB')}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {task.estimated_effort_hours}h
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {task.target_completion_date ? (
                        <span
                          className={`inline-flex items-center text-[11px] ${
                            isOverdue
                              ? 'text-red-600 dark:text-red-400 font-bold'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {isOverdue && <AlertTriangle className="w-3 h-3 mr-1" />}
                          {task.target_completion_date}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {task.external_ticket_id ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {task.external_ticket_id}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => onEditTask(task)}
                        className="p-1 rounded-lg text-slate-400 hover:text-gov-blue dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit task"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteTask(task.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
