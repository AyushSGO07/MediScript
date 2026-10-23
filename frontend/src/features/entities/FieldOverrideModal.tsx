import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, RotateCcw, Check, UserCheck } from 'lucide-react';
import { ExtractedField } from '../../types';
import { api, getRoleLabel, getStoredRole } from '../../lib/api';
import { EntityConfidenceBadge } from './EntityConfidenceBadge';

interface FieldOverrideModalProps {
  field: ExtractedField | null;
  isOpen: boolean;
  onClose: () => void;
  onFieldUpdated: (updated: ExtractedField) => void;
}

export const FieldOverrideModal: React.FC<FieldOverrideModalProps> = ({
  field,
  isOpen,
  onClose,
  onFieldUpdated,
}) => {
  const [newValue, setNewValue] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (field) {
      setNewValue(field.value || '');
      setReason('');
      setError(null);
    }
  }, [field, isOpen]);

  if (!isOpen || !field) return null;

  const activeActor = getRoleLabel(getStoredRole());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 3) {
      setError('A substantive regulatory rationale of at least 3 characters is mandatory.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const updated = await api.updateField(field.id, newValue.trim(), reason.trim());
      onFieldUpdated(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update field override');
    } finally {
      setLoading(false);
    }
  };

  const handleRevert = async () => {
    try {
      setLoading(true);
      setError(null);
      const reverted = await api.revertField(field.id);
      onFieldUpdated(reverted);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to revert override');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#0F172A] border border-slate-700/80 rounded-xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{field.field_label}</h3>
              <p className="text-[11px] font-mono text-slate-400">{field.field_key}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
            {error}
          </div>
        )}

        {/* Original Extraction Baseline Card */}
        <div className="mt-4 p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-400 text-[11px]">Original Extraction Provenance</span>
            <EntityConfidenceBadge state={field.original_confidence_state as any || field.confidence_state} size="sm" />
          </div>
          <div className="font-mono text-slate-200 bg-slate-950 px-2 py-1 rounded border border-slate-800/80 text-[11px]">
            {field.original_value || field.raw_value || '(None / Not Found)'}
          </div>
          {field.evidence_text && (
            <p className="text-[10px] text-slate-500 italic mt-1 line-clamp-2" title={field.evidence_text}>
              Cited snippet (Page {field.evidence_page || 1}): "{field.evidence_text}"
            </p>
          )}
        </div>

        {/* Correction Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Corrected / Overridden Value *
            </label>
            <input
              type="text"
              required
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500"
              placeholder="Enter verified label parameter..."
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-slate-300 font-semibold">
                Regulatory Override Rationale *
              </label>
              <span className="text-[10px] text-slate-500">Min 3 characters</span>
            </div>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Verified against ERP batch release specification and secondary barcode inspection."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 text-xs"
            />
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded border border-slate-800">
            <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Audit Signature: <strong>{activeActor}</strong></span>
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-800">
            <div>
              {field.is_overridden && (
                <button
                  type="button"
                  onClick={handleRevert}
                  disabled={loading}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-medium transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Revert to Original</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || reason.trim().length < 3}
                className="inline-flex items-center space-x-1 px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold transition-colors disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{loading ? 'Saving...' : 'Apply Override'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
