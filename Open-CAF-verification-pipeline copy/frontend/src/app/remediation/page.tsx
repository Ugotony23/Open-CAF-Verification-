'use client';

import React, { useState } from 'react';
import { useRemediation } from '@/hooks/useRemediation';
import { BurndownSummary } from '@/components/remediation/BurndownSummary';
import { KanbanBoard } from '@/components/remediation/KanbanBoard';
import { RemediationTableView } from '@/components/remediation/RemediationTableView';
import { TaskModal } from '@/components/remediation/TaskModal';
import { ExportModal } from '@/components/remediation/ExportModal';
import { RemediationTask, RemediationStatus, RemediationTaskCreateInput, RemediationTaskUpdateInput } from '@/types/remediation';
import {
  ListTodo,
  LayoutGrid,
  Table as TableIcon,
  Plus,
  Download,
  Share2,
  CheckCircle2,
  FileSpreadsheet,
  X,
} from 'lucide-react';

export default function RemediationPage() {
  const {
    tasks,
    summary,
    loading,
    toastMessage,
    moveTask,
    createTask,
    updateTask,
    deleteTask,
    dismissToast,
  } = useRemediation();

  const [viewMode, setViewMode] = useState<'KANBAN' | 'TABLE'>('KANBAN');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<RemediationTask | null>(null);
  const [defaultStatusForNewTask, setDefaultStatusForNewTask] = useState<RemediationStatus>('BACKLOG');
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const handleOpenCreateModal = (status: RemediationStatus = 'BACKLOG') => {
    setEditingTask(null);
    setDefaultStatusForNewTask(status);
    setModalOpen(true);
  };

  const handleOpenEditModal = (task: RemediationTask) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleSaveTask = async (
    data: RemediationTaskCreateInput | RemediationTaskUpdateInput,
    taskId?: string
  ) => {
    if (taskId) {
      await updateTask(taskId, data as RemediationTaskUpdateInput);
    } else {
      await createTask(data as RemediationTaskCreateInput);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-3 rounded-xl shadow-xl border border-slate-800 dark:border-slate-200 text-xs font-semibold flex items-center space-x-2 animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={dismissToast}
            className="ml-2 text-slate-400 hover:text-white dark:hover:text-slate-900"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
            <ListTodo className="w-4 h-4" />
            <span>Operational Cyber Delivery</span>
          </div>
          <h1 className="mt-1 text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Remediation Tracker & Action Plans
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Track sprints across council IT and service teams, prioritize budget (£ GBP), and burn down CAF audit deficits.
          </p>
        </div>

        {/* Action Buttons & View Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle */}
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('KANBAN')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'KANBAN'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'TABLE'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>

          {/* Export Button -> Opens Rich ExportModal */}
          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5 text-gov-blue dark:text-blue-400" />
            <span>Export Action Plan</span>
          </button>

          {/* Create Task Button */}
          <button
            type="button"
            onClick={() => handleOpenCreateModal('BACKLOG')}
            className="px-4 py-2 rounded-xl bg-gov-blue hover:bg-gov-blue/90 text-white text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Task</span>
          </button>
        </div>
      </div>

      {/* Top Summary Bar */}
      <BurndownSummary summary={summary} />

      {/* Main View Area: Kanban vs Table */}
      {viewMode === 'KANBAN' ? (
        <KanbanBoard
          tasks={tasks}
          onMoveTask={moveTask}
          onEditTask={handleOpenEditModal}
          onAddTask={handleOpenCreateModal}
        />
      ) : (
        <RemediationTableView
          tasks={tasks}
          onEditTask={handleOpenEditModal}
          onStatusChange={moveTask}
          onDeleteTask={deleteTask}
        />
      )}

      {/* Create / Edit Modal */}
      <TaskModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        task={editingTask}
        defaultStatus={defaultStatusForNewTask}
        onSave={handleSaveTask}
        onDelete={deleteTask}
      />

      {/* Rich Multi-Format Export Modal (Excel, CSV, Jira, GitHub) */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        tasks={tasks}
      />
    </div>
  );
}
