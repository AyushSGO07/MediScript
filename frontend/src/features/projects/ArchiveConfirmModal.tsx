import React, { useState } from 'react';
import { api } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { AlertTriangle, X } from 'lucide-react';
import { Project } from '../../types';

interface ArchiveConfirmModalProps {
  project: Project | null;
  onClose: () => void;
}

export const ArchiveConfirmModal: React.FC<ArchiveConfirmModalProps> = ({ project, onClose }) => {
  const { refreshData } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!project) return null;

  const handleArchive = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.archiveProject(project.id);
      await refreshData();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to archive project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-3 text-amber-400 font-bold text-base">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>Confirm Archive Action</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
            {error}
          </div>
        )}

        <div className="mt-4 text-xs text-slate-300 space-y-2">
          <p>
            Are you sure you want to archive <strong className="text-white">"{project.name}"</strong>?
          </p>
          <p className="text-slate-400 text-[11px]">
            Reviews within this project will be preserved in read-only mode and hidden from standard view filters.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-end space-x-3 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleArchive}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? 'Archiving...' : 'Archive Project'}
          </button>
        </div>
      </div>
    </div>
  );
};
