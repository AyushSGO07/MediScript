import React from 'react';
import { CheckCircle2, AlertTriangle, EyeOff, HelpCircle } from 'lucide-react';
import { ConfidenceState } from '../../types';

interface EntityConfidenceBadgeProps {
  state: ConfidenceState;
  size?: 'sm' | 'md';
}

export const EntityConfidenceBadge: React.FC<EntityConfidenceBadgeProps> = ({
  state,
  size = 'sm',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  switch (state) {
    case 'EXTRACTED':
      return (
        <span
          className={`inline-flex items-center space-x-1 rounded font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 ${sizeClasses}`}
          title="High confidence deterministic extraction with verifiable evidence"
        >
          <CheckCircle2 className={iconSize} />
          <span>EXTRACTED</span>
        </span>
      );
    case 'AMBIGUOUS':
      return (
        <span
          className={`inline-flex items-center space-x-1 rounded font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30 ${sizeClasses}`}
          title="Multiple conflicting candidate values found; human review required"
        >
          <AlertTriangle className={iconSize} />
          <span>AMBIGUOUS</span>
        </span>
      );
    case 'NOT_READABLE':
      return (
        <span
          className={`inline-flex items-center space-x-1 rounded font-mono font-medium bg-purple-500/10 text-purple-400 border border-purple-500/30 ${sizeClasses}`}
          title="Scanned raster document or unparseable text layer; OCR required"
        >
          <EyeOff className={iconSize} />
          <span>NOT_READABLE</span>
        </span>
      );
    case 'NOT_FOUND':
    default:
      return (
        <span
          className={`inline-flex items-center space-x-1 rounded font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700 ${sizeClasses}`}
          title="Field was evaluated against all blocks; no pattern matched"
        >
          <HelpCircle className={iconSize} />
          <span>NOT_FOUND</span>
        </span>
      );
  }
};
