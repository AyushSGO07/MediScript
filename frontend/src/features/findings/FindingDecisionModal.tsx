import React, { useState, useEffect } from 'react';
import {
  X,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  CheckCheck,
  Search,
  CircleDot,
  Loader2,
  User,
  ShieldCheck,
} from 'lucide-react';
import { Finding, FindingStatus, FindingDecision } from '../../types';
import { api, getStoredRole, getRoleLabel } from '../../lib/api';
import { FindingSeverityBadge } from './FindingSeverityBadge';

interface FindingDecisionModalProps {
  isOpen: boolean;
  finding: Finding | null;
  onClose: () => void;
  onSuccess: (decision: FindingDecision, newStatus: FindingStatus) => void;
}

const STATUS_CONFIGS: {
  status: FindingStatus;
  label: string;
  description: string;
  icon: React.ElementType;
  badgeClass: string;
  selectedClass: string;
}[] = [
  {
    status: 'Accepted',
    label: 'Accepted',
    description: 'Non-compliance accepted with authorized clinical/regulatory justification',
    icon: CheckCircle2,
    badgeClass: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    selectedClass: 'ring-2 ring-emerald-500 bg-emerald-950/30 border-emerald-500/50',
  },
  {
    status: 'Resolved',
    label: 'Resolved',
    description: 'Issue verified as addressed or corrected in draft label artwork',
    icon: CheckCheck,
    badgeClass: 'text-teal-400 border-teal-500/30 bg-teal-500/10',
    selectedClass: 'ring-2 ring-teal-500 bg-teal-950/30 border-teal-500/50',
  },
  {
    status: 'Under Investigation',
    label: 'Under Investigation',
    description: 'Referred for regulatory, packaging engineering, or clinical team inquiry',
    icon: Search,
    badgeClass: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    selectedClass: 'ring-2 ring-amber-500 bg-amber-950/30 border-amber-500/50',
  },
  {
    status: 'Open',
    label: 'Open',
    description: 'Active open compliance finding requiring resolution',
    icon: CircleDot,
    badgeClass: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    selectedClass: 'ring-2 ring-purple-500 bg-purple-950/30 border-purple-500/50',
  },
];

export const FindingDecisionModal: React.FC<FindingDecisionModalProps> = ({
  isOpen,
  finding,
  onClose,
  onSuccess,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<FindingStatus>('Accepted');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const role = getStoredRole();
  const actorLabel = getRoleLabel(role);

  useEffect(() => {
    if (finding) {
      setSelectedStatus(finding.status);
      setNote('');
      setError(null);
    }
  }, [finding, isOpen]);

  if (!isOpen || !finding) return null;

  const isCritical = finding.severity === 'Critical';
  const noteTrimmed = note.trim();
  const minChars = 5;
  const isNoteValid = !isCritical || noteTrimmed.length >= minChars;
  const charsLeft = Math.max(0, minChars - noteTrimmed.length);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNoteValid) {
      setError(`Reviewer justification note is strictly mandatory for Critical findings (minimum ${minChars} characters).`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const decision = await api.recordFindingDecision(finding.id, {
        new_status: selectedStatus,
        note: noteTrimmed ? noteTrimmed : undefined,
        actor: actorLabel,
        actor_role: role,
      });

      onSuccess(decision, selectedStatus);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to record decision');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                Record Compliance Decision
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-xs text-indigo-300 font-semibold bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/60">
                  {finding.rule_key}
                </span>
                <FindingSeverityBadge severity={finding.severity} size="sm" />
                <span className="text-xs text-slate-400">{finding.category}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Finding Explanation Snippet */}
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              Finding Context
            </span>
            <p className="leading-relaxed line-clamp-2">{finding.explanation}</p>
          </div>

          {/* Actor Identity Badge */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 text-xs text-slate-300">
            <div className="flex items-center space-x-2">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-400">Reviewer:</span>
              <span className="font-medium text-slate-200">{actorLabel}</span>
            </div>
            <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/40">
              {role}
            </span>
          </div>

          {/* Status Selection Cards */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Triage Decision State <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {STATUS_CONFIGS.map((cfg) => {
                const Icon = cfg.icon;
                const isSelected = selectedStatus === cfg.status;
                return (
                  <button
                    key={cfg.status}
                    type="button"
                    onClick={() => setSelectedStatus(cfg.status)}
                    className={`flex items-start space-x-2.5 p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? cfg.selectedClass
                        : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600 text-slate-300'
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-lg border mt-0.5 shrink-0 ${cfg.badgeClass}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white flex items-center justify-between">
                        <span>{cfg.label}</span>
                        {finding.status === cfg.status && (
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-mono">
                            (Current)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug mt-0.5 line-clamp-2">
                        {cfg.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mandatory Justification Note (REVW-02) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <span>Regulatory Justification & Rationale</span>
                {isCritical ? (
                  <span className="text-rose-400 font-bold">*</span>
                ) : (
                  <span className="text-slate-400 font-normal">(Optional)</span>
                )}
              </label>
              {isCritical && (
                <span
                  className={`text-[11px] font-mono ${
                    isNoteValid ? 'text-emerald-400' : 'text-rose-400 font-medium'
                  }`}
                >
                  {noteTrimmed.length} / {minChars} chars min {charsLeft > 0 && `(${charsLeft} more required)`}
                </span>
              )}
            </div>

            {isCritical && (
              <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  <strong>Mandatory Justification Required:</strong> For Critical severity findings, an authorized regulatory rationale is strictly required before submission.
                </span>
              </div>
            )}

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={
                isCritical
                  ? 'Enter mandatory regulatory justification, CAPA reference, or risk assessment rationale...'
                  : 'Enter optional reviewer commentary or notes regarding this decision...'
              }
              className={`w-full px-3 py-2 rounded-xl bg-slate-950 border text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors resize-none ${
                isCritical && !isNoteValid
                  ? 'border-rose-500/50 focus:border-rose-500 ring-1 ring-rose-500/20'
                  : 'border-slate-700 focus:border-indigo-500'
              }`}
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isNoteValid}
              className={`inline-flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all ${
                isSubmitting || !isNoteValid
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 active:scale-95'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Recording Decision...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Confirm Decision</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
