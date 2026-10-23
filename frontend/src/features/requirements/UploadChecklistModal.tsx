import React, { useState, useRef } from 'react';
import { X, Upload, FileCode2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Checklist } from '../../types';

interface UploadChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, targetChecklistId?: string) => Promise<Checklist>;
  checklists: Checklist[];
}

export const UploadChecklistModal: React.FC<UploadChecklistModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  checklists,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [targetChecklistId, setTargetChecklistId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const ext = selected.name.toLowerCase();
      if (!ext.endsWith('.csv') && !ext.endsWith('.json')) {
        setError('Only .csv or .json files are supported.');
        setFile(null);
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      const ext = selected.name.toLowerCase();
      if (!ext.endsWith('.csv') && !ext.endsWith('.json')) {
        setError('Only .csv or .json files are supported.');
        setFile(null);
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a CSV or JSON file to upload.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onUpload(file, targetChecklistId || undefined);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Upload and validation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#1E293B] border border-slate-700/80 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60 bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Import Regulatory Checklist</h3>
              <p className="text-[11px] text-slate-400">CSV or JSON file ingestion with schema validation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs whitespace-pre-line">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Mode Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Import Target Destination
            </label>
            <select
              value={targetChecklistId}
              onChange={(e) => setTargetChecklistId(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            >
              <option value="">Create as a New Regulatory Checklist</option>
              {checklists.map((c) => (
                <option key={c.id} value={c.id}>
                  Append Version to: {c.name} ({c.jurisdiction})
                </option>
              ))}
            </select>
          </div>

          {/* Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
              isDragOver
                ? 'border-sky-500 bg-sky-500/10'
                : file
                ? 'border-emerald-500/50 bg-emerald-500/5'
                : 'border-slate-700 hover:border-slate-600 bg-slate-900/40'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv,.json"
              className="hidden"
            />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="font-mono text-xs font-semibold text-white">{file.name}</div>
                <div className="text-[11px] text-slate-400">
                  {(file.size / 1024).toFixed(1)} KB • Click to replace file
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center">
                  <FileCode2 className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-white">
                  Drop CSV or JSON checklist file here
                </div>
                <div className="text-[11px] text-slate-400">
                  Supports standard column format: rule_key, field_key, description, severity, rule_type
                </div>
              </div>
            )}
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
              disabled={loading || !file}
              className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-lg shadow-teal-600/20 transition disabled:opacity-50"
            >
              {loading ? 'Validating & Importing...' : 'Import Checklist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
