import React from 'react';
import { PlusCircle, MinusCircle, Edit3, Equal } from 'lucide-react';
import { DiffType } from '../../types';

interface DiffTypeBadgeProps {
  changeType: DiffType | string;
  size?: 'sm' | 'md';
}

export const DiffTypeBadge: React.FC<DiffTypeBadgeProps> = ({
  changeType,
  size = 'sm',
}) => {
  const norm = changeType ? changeType.toUpperCase() : 'MODIFIED';
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  if (norm === 'ADDED') {
    return (
      <span
        className={`inline-flex items-center space-x-1 rounded font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 ${sizeClasses}`}
      >
        <PlusCircle className={iconSize} />
        <span>ADDED</span>
      </span>
    );
  }

  if (norm === 'DELETED') {
    return (
      <span
        className={`inline-flex items-center space-x-1 rounded font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30 ${sizeClasses}`}
      >
        <MinusCircle className={iconSize} />
        <span>DELETED</span>
      </span>
    );
  }

  if (norm === 'MODIFIED') {
    return (
      <span
        className={`inline-flex items-center space-x-1 rounded font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30 ${sizeClasses}`}
      >
        <Edit3 className={iconSize} />
        <span>MODIFIED</span>
      </span>
    );
  }

  // UNCHANGED or fallback
  return (
    <span
      className={`inline-flex items-center space-x-1 rounded font-medium bg-slate-700/30 text-slate-400 border border-slate-700/50 ${sizeClasses}`}
    >
      <Equal className={iconSize} />
      <span>UNCHANGED</span>
    </span>
  );
};
