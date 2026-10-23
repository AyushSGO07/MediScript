import React from 'react';
import { CircleDot, CheckCircle2, CheckCheck, Search } from 'lucide-react';
import { FindingStatus } from '../../types';

interface FindingStatusBadgeProps {
  status: FindingStatus | string;
  size?: 'sm' | 'md';
}

export const FindingStatusBadge: React.FC<FindingStatusBadgeProps> = ({
  status,
  size = 'sm',
}) => {
  const norm = status ? status.toLowerCase() : 'open';
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  if (norm === 'accepted') {
    return (
      <span
        className={`inline-flex items-center space-x-1 rounded font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${sizeClasses}`}
      >
        <CheckCircle2 className={iconSize} />
        <span>Accepted</span>
      </span>
    );
  }

  if (norm === 'resolved') {
    return (
      <span
        className={`inline-flex items-center space-x-1 rounded font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20 ${sizeClasses}`}
      >
        <CheckCheck className={iconSize} />
        <span>Resolved</span>
      </span>
    );
  }

  if (norm === 'under investigation') {
    return (
      <span
        className={`inline-flex items-center space-x-1 rounded font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 ${sizeClasses}`}
      >
        <Search className={iconSize} />
        <span>Under Investigation</span>
      </span>
    );
  }

  // Open / default
  return (
    <span
      className={`inline-flex items-center space-x-1 rounded font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 ${sizeClasses}`}
    >
      <CircleDot className={iconSize} />
      <span>Open</span>
    </span>
  );
};
