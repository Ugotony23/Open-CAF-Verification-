'use client';

import React, { useState } from 'react';
import {
  X,
  Link as LinkIcon,
  CheckCircle2,
  Trash2,
  Plus,
  BookOpen,
  AlertCircle,
} from 'lucide-react';
import { EvidenceItem } from '@/types/evidence';
import { CAF_OBJECTIVES } from '@/lib/cafTaxonomy';
import { api } from '@/lib/api';

interface LinkOutcomeModalProps {
  isOpen: boolean;
  item: EvidenceItem | null;
  onClose: () => void;
  onUpdated: (updatedItem: EvidenceItem) => void;
}

export function LinkOutcomeModal({
  isOpen,
  item,
  onClose,
  onUpdated,
}: LinkOutcomeModalProps) {
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string>('A1.a');
  const [citationNotes, setCitationNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOutcomeId) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await api.post(`/evidence/${item.id}/link`, {
        outcome_id: selectedOutcomeId,
        citation_notes: citationNotes || undefined,
      });

      const updatedIds = Array.from(new Set([...item.linked_outcome_ids, selectedOutcomeId]));
      const updatedItem: EvidenceItem = {
        ...item,
        linked_outcome_ids: updatedIds,
      };

      onUpdated(updatedItem);
      setCitationNotes('');
    } catch {
      // Optimistic local update fallback
      const updatedIds = Array.from(new Set([...item.linked_outcome_ids, selectedOutcomeId]));
      onUpdated({
        ...item,
        linked_outcome_ids: updatedIds,
      });
      setCitationNotes('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlink = async (outcomeId: string) => {
    try {
      await api.delete(`/evidence/${item.id}/link/${outcomeId}`);
    } catch {
      // Non-fatal
    }
    const updatedIds = item.linked_outcome_ids.filter((id) => id !== outcomeId);
    onUpdated({
      ...item,
      linked_outcome_ids: updatedIds,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <LinkIcon className="w-4 h-4 text-govuk-blue dark:text-sky-400" />
              <span>Link Evidence to CAF Outcomes</span>
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate max-w-sm">
              Artifact: <span className="font-semibold text-slate-700 dark:text-slate-200">{item.title}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Current Linked Outcomes List */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Currently Linked Contributing Outcomes ({item.linked_outcome_ids.length})
            </h4>

            {item.linked_outcome_ids.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                This evidence document is not linked to any CAF outcomes yet. Use the form below to link it.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {item.linked_outcome_ids.map((code) => (
                  <div
                    key={code}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className="px-2 py-0.5 rounded bg-govuk-blue text-white font-mono text-[10px] font-bold">
                        {code}
                      </span>
                      <span className="text-xs text-slate-800 dark:text-slate-200 font-semibold truncate">
                        Contributing Outcome {code}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUnlink(code)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title="Remove Link"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form to Add a New Link */}
          <form onSubmit={handleAddLink} className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-govuk-blue dark:text-sky-400 flex items-center space-x-1.5">
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Outcome Link</span>
            </h4>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select CAF Outcome *
              </label>
              <select
                value={selectedOutcomeId}
                onChange={(e) => setSelectedOutcomeId(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
              >
                {CAF_OBJECTIVES.map((obj) => (
                  <optgroup key={obj.id} label={`${obj.code}: ${obj.title}`}>
                    {obj.principles.map((pr) =>
                      pr.outcomes.map((out) => (
                        <option key={out.id} value={out.id}>
                          {out.id}: {out.title} ({pr.title})
                        </option>
                      ))
                    )}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Specific Citation / Audit Proof Notes (Optional)
              </label>
              <input
                type="text"
                value={citationNotes}
                onChange={(e) => setCitationNotes(e.target.value)}
                placeholder="e.g. Page 14 Section 3.2: Bi-annual Disaster Recovery test results"
                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-lg bg-govuk-blue hover:bg-govuk-blueHover text-white text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? 'Linking...' : 'Link to Outcome'}
              </button>
            </div>
          </form>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold hover:bg-slate-800"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
