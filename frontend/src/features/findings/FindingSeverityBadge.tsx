import React from 'react';
import { AlertOctagon, AlertTriangle, Info } from 'lucide-react';
import { SeverityLevel } from '../../types';

interface FindingSeverityBadgeProps {
  severity: SeverityLevel | string;
  size?: 'sm' | 'md';
}

export const FindingSeverityBadge: React.FC<FindingSeverityBadgeProps> = ({
  severity,
  size = 'sm',
}) => {
  const norm = severity ? severity.toUpperCase() : 'MAJOR';
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  if (norm === 'CRITICAL') {
    return (
      <span
        className={`inline-flex items-center space-x-1 rounded font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30 ${sizeClasses}`}
      >
        <AlertOctagon className={iconSize} />
        <span>CRITICAL</span>
      </span>
    );
  }

  if (norm === 'MAJOR') {
    return (
      <span
        className={`inline-flex items-center space-x-1 rounded font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30 ${sizeClasses}`}
      >
        <AlertTriangle className={iconSize} />
        <span>MAJOR</span>
      </span>
    );
  }

  // Minor or fallback
  return (
    <span
      className={`inline-flex items-center space-x-1 rounded font-medium bg-sky-500/10 text-sky-300 border border-sky-500/20 ${sizeClasses}`}
    >
      <Info className={iconSize} />
      <span>MINOR</span>
    </span>
  );
};
