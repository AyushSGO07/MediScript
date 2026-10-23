import React, { useState } from 'react';
import { X, Plus, AlertCircle } from 'lucide-react';
import { Checklist } from '../../types';

interface CreateChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    name: string;
    jurisdiction: string;
    source_reference?: string;
    description?: string;
    initial_version?: string;
  }) => Promise<Checklist>;
}

const JURISDICTION_PRESETS = [
  'FDA (US)',
  'EU MDR (EU)',
  'ISO (Global)',
  'Health Canada',
  'TGA (Australia)',
  'Custom Jurisdiction',
];

export const CreateChecklistModal: React.FC<CreateChecklistModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [jurisdiction, setJurisdiction] = useState('FDA (US)');
  const [customJurisdiction, setCustomJurisdiction] = useState('');
  const [sourceReference, setSourceReference] = useState('');
  const [description, setDescription] = useState('');
  const [initialVersion, setInitialVersion] = useState('v1.0.0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalJurisdiction =
      jurisdiction === 'Custom Jurisdiction' ? customJurisdiction.trim() : jurisdiction;

    if (!name.trim() || !finalJurisdiction) {
      setError('Checklist name and jurisdiction are required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onCreate({
        name: name.trim(),
        jurisdiction: finalJurisdiction,
        source_reference: sourceReference.trim() || undefined,
        description: description.trim() || undefined,
        initial_version: initialVersion.trim() || 'v1.0.0',
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create checklist');
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
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Create Regulatory Checklist</h3>
              <p className="text-[11px] text-slate-400">Establish standard verification requirements container</p>
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

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Checklist Standard Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. US FDA 21 CFR 801/830 Labeling Standard"
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Jurisdiction */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Target Regulatory Jurisdiction <span className="text-rose-400">*</span>
            </label>
            <select
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            >
              {JURISDICTION_PRESETS.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
            {jurisdiction === 'Custom Jurisdiction' && (
              <input
                type="text"
                value={customJurisdiction}
                onChange={(e) => setCustomJurisdiction(e.target.value)}
                placeholder="Enter custom jurisdiction name"
                className="w-full mt-2 bg-slate-900/80 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            )}
          </div>

          {/* Source Reference */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Statutory / Regulatory Source Reference
            </label>
            <input
              type="text"
              value={sourceReference}
              onChange={(e) => setSourceReference(e.target.value)}
              placeholder="e.g. 21 CFR 801.20 & 830.300"
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Scope & Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Unique Device Identification and general safety labeling requirements for Class II/III medical devices."
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Initial Version Tag */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Initial Version Tag
            </label>
            <input
              type="text"
              value={initialVersion}
              onChange={(e) => setInitialVersion(e.target.value)}
              placeholder="v1.0.0"
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3.5 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

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
              {loading ? 'Creating...' : 'Create Checklist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
