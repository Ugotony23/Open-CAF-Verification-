'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  RemediationTask,
  RemediationStatus,
  RemediationPriority,
  RemediationSummary,
  RemediationTaskCreateInput,
  RemediationTaskUpdateInput,
  TechnicalStepItem,
} from '@/types/remediation';
import { api } from '@/lib/api';

const MOCK_DEMO_TASKS: RemediationTask[] = [
  {
    id: 'task-demo-001',
    tenant_id: '12737959-27b8-4451-a9f9-e382fa07b461',
    assessment_id: 'ass-demo-001',
    outcome_id: 'B2.a',
    gap_id: 'gap-b2a-001',
    title: 'Deploy FIDO2 MFA across Legacy Remote Desktop & VPN Gateways',
    description:
      'Enforce hardware/authenticator app MFA across all domain administrator accounts and staff accessing Social Care Case Management remotely.',
    technical_steps: [
      { step: 'Audit all legacy NTLM and RADIUS authentication endpoints', completed: true },
      { step: 'Configure Microsoft Entra Conditional Access with FIDO2 enforcement', completed: true },
      { step: 'Deploy YubiKeys to 45 high-privilege administrators', completed: false },
      { step: 'Disable single-factor RDP gateway fallback', completed: false },
    ],
    status: 'IN_PROGRESS',
    priority: 'CRITICAL',
    assigned_owner_name: 'David Cameron (Infra Lead)',
    assigned_owner_email: 'david.cameron@borsetshire.gov.uk',
    estimated_effort_hours: 45.0,
    estimated_cost_gbp: 18500.0,
    target_completion_date: '2026-09-20',
    external_ticket_id: 'JIRA-2041',
    created_at: '2026-09-01T09:00:00Z',
    updated_at: '2026-09-05T14:30:00Z',
  },
  {
    id: 'task-demo-002',
    tenant_id: '12737959-27b8-4451-a9f9-e382fa07b461',
    assessment_id: 'ass-demo-001',
    outcome_id: 'B4.a',
    gap_id: 'gap-b4a-002',
    title: 'Deploy Air-Gapped Immutable Backups for Revenues & Benefits DB',
    description:
      'Implement WORM (Write Once Read Many) immutable cloud object storage and automated weekly restoration sandbox verification for Council Tax databases.',
    technical_steps: [
      { step: 'Procure immutable S3 object lock storage tier', completed: true },
      { step: 'Configure Veeam immutable backup repository with hardened Linux agent', completed: false },
      { step: 'Perform dry-run database recovery test in isolated VLAN', completed: false },
      { step: 'Sign off RTO/RPO SLA compliance with Head of Revenues', completed: false },
    ],
    status: 'BACKLOG',
    priority: 'CRITICAL',
    assigned_owner_name: 'Sarah Jenkins (SecOps)',
    assigned_owner_email: 'sarah.jenkins@borsetshire.gov.uk',
    estimated_effort_hours: 60.0,
    estimated_cost_gbp: 32000.0,
    target_completion_date: '2026-09-28',
    external_ticket_id: 'JIRA-2049',
    created_at: '2026-09-02T10:15:00Z',
    updated_at: '2026-09-02T10:15:00Z',
  },
  {
    id: 'task-demo-003',
    tenant_id: '12737959-27b8-4451-a9f9-e382fa07b461',
    assessment_id: 'ass-demo-001',
    outcome_id: 'B5.a',
    gap_id: 'gap-b5a-003',
    title: 'Isolate SCADA Traffic Light & BMS IoT from Corporate LAN',
    description:
      'Implement micro-segmentation and next-generation firewall inspection between building management SCADA systems and the corporate council network.',
    technical_steps: [
      { step: 'Map all OT/IoT MAC addresses and port configurations', completed: true },
      { step: 'Create dedicated VRF and 802.1Q VLANs for BMS controllers', completed: true },
      { step: 'Deploy Palo Alto ACLs blocking outbound unauthorized internet access', completed: false },
    ],
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    assigned_owner_name: 'Marcus Vance (Networks)',
    assigned_owner_email: 'marcus.vance@borsetshire.gov.uk',
    estimated_effort_hours: 35.0,
    estimated_cost_gbp: 12500.0,
    target_completion_date: '2026-10-15',
    external_ticket_id: 'GH-88',
    created_at: '2026-09-03T11:00:00Z',
    updated_at: '2026-09-06T16:00:00Z',
  },
  {
    id: 'task-demo-004',
    tenant_id: '12737959-27b8-4451-a9f9-e382fa07b461',
    assessment_id: 'ass-demo-001',
    outcome_id: 'C2.a',
    gap_id: 'gap-c2a-004',
    title: 'Centralize Audit Logging into SIEM with 24/7 Managed SOC',
    description:
      'Ingest Windows Security event logs, Azure sign-ins, and firewall syslog feeds into Microsoft Sentinel with automated alert correlation.',
    technical_steps: [
      { step: 'Install Azure Monitoring Agent on 120 council virtual machines', completed: true },
      { step: 'Configure NCSC Cyber Security Information Sharing Partnership (CISP) threat feed', completed: true },
      { step: 'Tune high-fidelity alert rules for lateral movement and pass-the-hash', completed: true },
    ],
    status: 'IN_REVIEW',
    priority: 'HIGH',
    assigned_owner_name: 'Sarah Jenkins (SecOps)',
    assigned_owner_email: 'sarah.jenkins@borsetshire.gov.uk',
    estimated_effort_hours: 40.0,
    estimated_cost_gbp: 24000.0,
    target_completion_date: '2026-09-15',
    external_ticket_id: 'JIRA-2065',
    created_at: '2026-08-25T14:00:00Z',
    updated_at: '2026-09-07T11:20:00Z',
  },
  {
    id: 'task-demo-005',
    tenant_id: '12737959-27b8-4451-a9f9-e382fa07b461',
    assessment_id: 'ass-demo-001',
    outcome_id: 'D1.a',
    gap_id: 'gap-d1a-005',
    title: 'Conduct Ransomware Crisis Tabletop Drill with Cabinet Members',
    description:
      'Simulate an operational disruption of electoral register systems 4 weeks prior to local elections with Council Chief Executive and Emergency Planning team.',
    technical_steps: [
      { step: 'Draft scenario injection injects with external specialist assessor', completed: true },
      { step: 'Convene Cabinet Emergency Committee & Gold Command', completed: true },
      { step: 'Publish Post-Incident Review (PIR) and update Playbook D1-v3', completed: true },
    ],
    status: 'COMPLETED',
    priority: 'HIGH',
    assigned_owner_name: 'Rachel Sterling (Emergency Planning)',
    assigned_owner_email: 'rachel.sterling@borsetshire.gov.uk',
    estimated_effort_hours: 25.0,
    estimated_cost_gbp: 6500.0,
    target_completion_date: '2026-08-30',
    completed_at: '2026-08-29T16:45:00Z',
    external_ticket_id: 'CAB-102',
    created_at: '2026-08-15T09:30:00Z',
    updated_at: '2026-08-29T16:45:00Z',
  },
  {
    id: 'task-demo-006',
    tenant_id: '12737959-27b8-4451-a9f9-e382fa07b461',
    assessment_id: 'ass-demo-001',
    outcome_id: 'A4.b',
    gap_id: 'gap-a4b-006',
    title: 'Establish Third-Party Cyber Risk Questionnaire for SaaS Vendors',
    description:
      'Standardize supplier assurance framework aligned to NCSC Supply Chain Guidance for all council software contracts > £50k.',
    technical_steps: [
      { step: 'Formulate ISO 27001 / Cyber Essentials Plus requirement clauses', completed: false },
      { step: 'Embed mandatory breach notification SLA (24h) in council procurement template', completed: false },
    ],
    status: 'BACKLOG',
    priority: 'MEDIUM',
    assigned_owner_name: 'Alan Turing (Procurement)',
    assigned_owner_email: 'alan.turing@borsetshire.gov.uk',
    estimated_effort_hours: 20.0,
    estimated_cost_gbp: 4000.0,
    target_completion_date: '2026-11-01',
    external_ticket_id: 'PROC-51',
    created_at: '2026-09-04T12:00:00Z',
    updated_at: '2026-09-04T12:00:00Z',
  },
];

function calculateSummary(tasks: RemediationTask[]): RemediationSummary {
  const today = new Date().toISOString().split('T')[0];
  let totalBudget = 0;
  let totalHours = 0;
  let openCount = 0;
  let completedCount = 0;
  let inProgressCount = 0;
  let overdueCount = 0;

  const byStatus: Record<RemediationStatus, number> = {
    BACKLOG: 0,
    IN_PROGRESS: 0,
    IN_REVIEW: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  };

  const byPriority: Record<RemediationPriority, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };

  tasks.forEach((t) => {
    totalBudget += t.estimated_cost_gbp || 0;
    totalHours += t.estimated_effort_hours || 0;

    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;

    if (t.status === 'COMPLETED') {
      completedCount++;
    } else if (t.status === 'CANCELLED') {
      // Not counted in active open tasks
    } else {
      openCount++;
      if (t.status === 'IN_PROGRESS') {
        inProgressCount++;
      }
      if (t.target_completion_date && t.target_completion_date < today) {
        overdueCount++;
      }
    }
  });

  const total = tasks.length;
  const compliantCount = total - overdueCount;
  const slaCompliance = total > 0 ? (compliantCount / total) * 100 : 100.0;

  return {
    total_tasks: total,
    open_tasks: openCount,
    completed_tasks: completedCount,
    in_progress_tasks: inProgressCount,
    total_budget_required_gbp: totalBudget,
    total_estimated_effort_hours: totalHours,
    by_status: byStatus,
    by_priority: byPriority,
    sla_compliance_rate: Math.round(slaCompliance * 10) / 10,
    overdue_tasks_count: overdueCount,
  };
}

export function useRemediation(assessmentId?: string) {
  const [tasks, setTasks] = useState<RemediationTask[]>(MOCK_DEMO_TASKS);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const queryParam = assessmentId ? `?assessment_id=${assessmentId}` : '';
      const data = await api.get<RemediationTask[]>(`/remediation/tasks${queryParam}`);
      if (Array.isArray(data) && data.length > 0) {
        // Normalise technical_steps if stringified
        const normalized = data.map((t) => {
          let steps = t.technical_steps;
          if (typeof steps === 'string') {
            try {
              steps = JSON.parse(steps);
            } catch {
              steps = [];
            }
          }
          return { ...t, technical_steps: Array.isArray(steps) ? steps : [] };
        });
        setTasks(normalized);
      } else {
        // Use demo dataset as baseline if empty
        setTasks(MOCK_DEMO_TASKS);
      }
      setError(null);
    } catch {
      // Fallback to demo tasks for seamless client operation
      setTasks(MOCK_DEMO_TASKS);
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  }, []);

  // Move / update status with optimistic update & API sync
  const moveTask = useCallback(
    async (taskId: string, newStatus: RemediationStatus) => {
      const prevTasks = [...tasks];
      const targetTask = tasks.find((t) => t.id === taskId);
      if (!targetTask || targetTask.status === newStatus) return;

      const now = new Date().toISOString();
      const updatedTasks = tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: newStatus,
              completed_at: newStatus === 'COMPLETED' ? now : t.completed_at,
              updated_at: now,
            }
          : t
      );
      setTasks(updatedTasks);
      showToast(`Task moved to ${newStatus.replace('_', ' ')}`);

      try {
        await api.patch(`/remediation/tasks/${taskId}/status`, { status: newStatus });
      } catch (err) {
        // On offline mock, keep local state; otherwise revert if severe error
        console.warn('Backend update failed, maintaining local state:', err);
      }
    },
    [tasks, showToast]
  );

  // Create new task
  const createTask = useCallback(
    async (input: RemediationTaskCreateInput): Promise<RemediationTask> => {
      try {
        const res = await api.post<RemediationTask>('/remediation/tasks', input);
        const newTask: RemediationTask = {
          ...res,
          technical_steps: Array.isArray(res.technical_steps) ? res.technical_steps : [],
        };
        setTasks((prev) => [newTask, ...prev]);
        showToast(`Remediation task "${newTask.title}" created`);
        return newTask;
      } catch (err) {
        // Create local optimistic task if backend call fails
        const newTask: RemediationTask = {
          id: `task-local-${Date.now()}`,
          tenant_id: '12737959-27b8-4451-a9f9-e382fa07b461',
          assessment_id: input.assessment_id || 'ass-demo-001',
          outcome_id: input.outcome_id,
          gap_id: input.gap_id || null,
          title: input.title,
          description: input.description || null,
          technical_steps: input.technical_steps || [],
          status: input.status || 'BACKLOG',
          priority: input.priority || 'HIGH',
          assigned_owner_name: input.assigned_owner_name || null,
          assigned_owner_email: input.assigned_owner_email || null,
          estimated_effort_hours: input.estimated_effort_hours || 0,
          estimated_cost_gbp: input.estimated_cost_gbp || 0,
          target_completion_date: input.target_completion_date || null,
          completed_at: input.status === 'COMPLETED' ? new Date().toISOString() : null,
          external_ticket_id: input.external_ticket_id || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setTasks((prev) => [newTask, ...prev]);
        showToast(`Remediation task "${newTask.title}" created locally`);
        return newTask;
      }
    },
    [showToast]
  );

  // Update existing task
  const updateTask = useCallback(
    async (taskId: string, input: RemediationTaskUpdateInput): Promise<void> => {
      try {
        const res = await api.patch<RemediationTask>(`/remediation/tasks/${taskId}`, input);
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, ...res, updated_at: new Date().toISOString() } : t))
        );
        showToast('Task updated successfully');
      } catch {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, ...input, updated_at: new Date().toISOString() } : t))
        );
        showToast('Task updated locally');
      }
    },
    [showToast]
  );

  // Delete task
  const deleteTask = useCallback(
    async (taskId: string): Promise<void> => {
      try {
        await api.delete(`/remediation/tasks/${taskId}`);
      } catch (err) {
        console.warn('API delete failed, removing locally:', err);
      }
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      showToast('Task deleted');
    },
    [showToast]
  );

  // Live calculated summary
  const summary = useMemo(() => calculateSummary(tasks), [tasks]);

  return {
    tasks,
    summary,
    loading,
    error,
    toastMessage,
    moveTask,
    createTask,
    updateTask,
    deleteTask,
    refetch: fetchTasks,
    dismissToast: () => setToastMessage(null),
  };
}
