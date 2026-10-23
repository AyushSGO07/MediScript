import React from 'react';
import { ReviewStatus, ProjectStatus } from '../../types';

interface StatusBadgeProps {
  status: ReviewStatus | ProjectStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getColors = () => {
    switch (status) {
      case 'Draft':
        return 'bg-slate-700/60 text-slate-300 border-slate-600/60';
      case 'In Progress':
      case 'active':
        return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
      case 'Completed':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'Archived':
      case 'archived':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const px = size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-mono font-medium rounded-md border ${px} ${getColors()}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
      {status}
    </span>
  );
};
