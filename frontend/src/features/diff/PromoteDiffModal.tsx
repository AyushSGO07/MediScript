import React, { useState } from 'react';
import { X, Flag, AlertOctagon, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { DiffItem, SeverityLevel, Finding } from '../../types';
import { api } from '../../lib/api';

interface PromoteDiffModalProps {
  reviewId: string;
  diffItem: DiffItem;
  isOpen: boolean;
  onClose: () => void;
  onPromoted: (finding: Finding, updatedDiff: DiffItem) => void;
}

export const PromoteDiffModal: React.FC<PromoteDiffModalProps> = ({
  reviewId,
  diffItem,
  isOpen,
  onClose,
  onPromoted,
}) => {
  const defaultSeverity: SeverityLevel =
    diffItem.significance === 'High' ? 'Critical' : 'Major';

  const [severity, setSeverity] = useState<SeverityLevel>(defaultSeverity);
  const [explanation, setExplanation] = useState<string>(
    `Revision diff [${diffItem.change_type}]: ${diffItem.baseline_text || '(none)'} -> ${diffItem.revised_text || '(none)'}`
  );
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      const res = await api.promoteDiffToFinding(reviewId, diffItem.id, {
        severity,
        explanation: explanation.trim(),
      });
      onPromoted(res.finding, res.diff_item);
      onClose();
    } catch (err: any) {
      console.error('Failed to promote diff:', err);
      setError(err.message || 'Failed to promote diff item to finding');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-2">
            <Flag className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-semibold text-white tracking-tight">
              Promote Diff to Compliance Finding
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center space-x-2">
              <AlertOctagon className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Changed text summary */}
          <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 uppercase tracking-wider text-[10px]">
                {diffItem.change_type} • {diffItem.category}
              </span>
              <span className="text-slate-400 font-mono text-[10px]">
                {diffItem.baseline_page && `Base p.${diffItem.baseline_page} `}
                {diffItem.revised_page && `Rev p.${diffItem.revised_page}`}
              </span>
            </div>
            {diffItem.baseline_text && (
              <div className="text-rose-300 font-mono text-[11px] line-through bg-rose-950/20 p-2 rounded border border-rose-500/20">
                - {diffItem.baseline_text}
              </div>
            )}
            {diffItem.revised_text && (
              <div className="text-emerald-300 font-mono text-[11px] bg-emerald-950/20 p-2 rounded border border-emerald-500/20">
                + {diffItem.revised_text}
              </div>
            )}
          </div>

          {/* Severity selector */}
          <div className="space-y-1.5">
            <label className="block font-medium text-slate-300">
              Severity Level <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Critical', 'Major', 'Minor'] as SeverityLevel[]).map((level) => (
                <button
                  type="button"
                  key={level}
                  onClick={() => setSeverity(level)}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                    severity === level
                      ? level === 'Critical'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm'
                        : level === 'Major'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                        : 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-sm'
                      : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:bg-slate-800'
                  }`}
                >
                  {level === 'Critical' && <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />}
                  {level === 'Major' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                  {level === 'Minor' && <Info className="w-3.5 h-3.5 text-sky-400" />}
                  <span>{level}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Rationale / Explanation textarea */}
          <div className="space-y-1.5">
            <label className="block font-medium text-slate-300">
              Reviewer Rationale & Violation Explanation <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={3}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explain why this revision difference requires formal compliance remediation..."
              className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none font-normal"
              required
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Promoting...</span>
                </>
              ) : (
                <>
                  <Flag className="w-3.5 h-3.5" />
                  <span>Promote to Finding</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
