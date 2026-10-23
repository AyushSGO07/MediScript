import React, { useState } from 'react';
import { X, GitBranch, AlertCircle } from 'lucide-react';
import { ChecklistVersion } from '../../types';

interface NewVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClone: (data: {
    version: string;
    clone_from_version_id?: string;
    effective_date?: string;
    changelog_summary?: string;
  }) => Promise<void>;
  sourceVersion: ChecklistVersion | null;
  checklistName: string;
}

export const NewVersionModal: React.FC<NewVersionModalProps> = ({
  isOpen,
  onClose,
  onClone,
  sourceVersion,
  checklistName,
}) => {
  const [versionTag, setVersionTag] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [changelog, setChangelog] = useState('');
  const [copyRules, setCopyRules] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionTag.trim()) {
      setError('New version tag is required (e.g. v1.1.0).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onClone({
        version: versionTag.trim(),
        clone_from_version_id: copyRules && sourceVersion ? sourceVersion.id : undefined,
        effective_date: effectiveDate.trim() || undefined,
        changelog_summary: changelog.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create new version');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#1E293B] border border-slate-700/80 rounded-xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60 bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <GitBranch className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Branch New Checklist Version</h3>
              <p className="text-[11px] text-slate-400">{checklistName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {sourceVersion && (
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
              <span className="text-slate-500">Source Baseline Version: </span>
              <span className="font-mono font-semibold text-white">{sourceVersion.version}</span>
              <span className="text-slate-500 ml-2">
                ({sourceVersion.rules?.length || sourceVersion.rule_count || 0} active rules)
              </span>
            </div>
          )}

          {/* Version Tag */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              New Version Tag <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={versionTag}
              onChange={(e) => setVersionTag(e.target.value)}
              placeholder="e.g. v1.1.0 or v2.0.0"
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3.5 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Effective Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Effective Date (ISO YYYY-MM-DD)
            </label>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Changelog Summary */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Version Revision Changelog
            </label>
            <textarea
              rows={2}
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              placeholder="e.g. Added Single-Use symbol rule and aligned UDI regex with 2024 guidance."
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Copy Rules checkbox */}
          {sourceVersion && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="copy_rules"
                checked={copyRules}
                onChange={(e) => setCopyRules(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0 focus:ring-offset-0"
              />
              <label htmlFor="copy_rules" className="text-xs text-slate-300 select-none">
                Clone all rules from {sourceVersion.version} into this new draft version
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-700/60">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 transition disabled:opacity-50"
            >
              {loading ? 'Branching...' : 'Create Draft Version'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
