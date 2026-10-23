import React from 'react';
import {
  ArrowLeft,
  Columns,
  Square,
  Play,
  GitCompare,
  Layers,
} from 'lucide-react';
import { Review } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';

interface ReviewWorkspaceHeaderProps {
  review: Review;
  projectName?: string;
  activeRole: 'revised' | 'baseline';
  viewMode: 'single' | 'split';
  onRoleChange: (role: 'revised' | 'baseline') => void;
  onViewModeChange: (mode: 'single' | 'split') => void;
  onBack: () => void;
  onRunEvaluation: () => void;
  onRunDiff: () => void;
}

export const ReviewWorkspaceHeader: React.FC<ReviewWorkspaceHeaderProps> = ({
  review,
  projectName = 'Project',
  activeRole,
  viewMode,
  onRoleChange,
  onViewModeChange,
  onBack,
  onRunEvaluation,
  onRunDiff,
}) => {
  return (
    <header className="h-14 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-4 select-none shrink-0 z-30">
      {/* Left: Back button & Breadcrumb */}
      <div className="flex items-center space-x-3 min-w-0">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 transition-colors shrink-0"
          title="Return to Reviews list"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Reviews</span>
        </button>

        <div className="h-4 w-px bg-slate-700/70 shrink-0" />

        <div className="flex items-center space-x-2 truncate min-w-0">
          <span className="text-xs text-slate-400 truncate max-w-[140px]">
            {projectName}
          </span>
          <span className="text-slate-600">/</span>
          <h1 className="text-sm font-semibold text-white truncate max-w-[220px]">
            {review.name}
          </h1>
          <StatusBadge status={review.status} size="sm" />
        </div>
      </div>

      {/* Center: Document Switcher & View Mode Toggle */}
      <div className="flex items-center space-x-2">
        {/* Single / Split Toggle */}
        <div className="bg-slate-800/90 p-0.5 rounded-lg border border-slate-700/80 flex items-center space-x-0.5 text-xs">
          <button
            onClick={() => onViewModeChange('single')}
            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md font-medium transition-all ${
              viewMode === 'single'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Single document viewport"
          >
            <Square className="w-3.5 h-3.5" />
            <span>Single</span>
          </button>
          <button
            onClick={() => onViewModeChange('split')}
            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md font-medium transition-all ${
              viewMode === 'split'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Side-by-side dual document viewport"
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Split View</span>
          </button>
        </div>

        {/* Role Switcher (Active in Single View) */}
        {viewMode === 'single' && (
          <div className="bg-slate-800/90 p-0.5 rounded-lg border border-slate-700/80 flex items-center space-x-0.5 text-xs">
            <button
              onClick={() => onRoleChange('revised')}
              className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-md font-semibold transition-all ${
                activeRole === 'revised'
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span>Revised Label</span>
            </button>
            <button
              onClick={() => onRoleChange('baseline')}
              className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-md font-semibold transition-all ${
                activeRole === 'baseline'
                  ? 'bg-sky-600/30 text-sky-300 border border-sky-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span>Baseline Label</span>
            </button>
          </div>
        )}

        {/* Checklist Version Pill */}
        <div className="hidden lg:flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-[11px] font-mono">
          <Layers className="w-3 h-3 text-indigo-400" />
          <span>{review.checklist_version_id || 'FDA 21 CFR 801/830'}</span>
        </div>
      </div>

      {/* Right: Quick Review Execution Actions */}
      <div className="flex items-center space-x-2 shrink-0">
        <button
          onClick={onRunEvaluation}
          className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/20 transition-all"
          title="Run / Inspect Automated Rule Evaluation"
        >
          <Play className="w-3.5 h-3.5" />
          <span>Evaluate</span>
        </button>

        <button
          onClick={onRunDiff}
          className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700/80 transition-all"
          title="Run / Inspect Deterministic Revision Diff"
        >
          <GitCompare className="w-3.5 h-3.5" />
          <span>Diff</span>
        </button>
      </div>
    </header>
  );
};
