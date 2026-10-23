import React, { useState } from 'react';
import {
  Activity,
  CheckCheck,
  ShieldCheck,
  GitCompare,
  FileUp,
  Edit3,
  FolderPlus,
  FileText,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  Code,
  Layers,
} from 'lucide-react';
import { ActivityEvent } from '../../types';

interface ActivityTimelineCardProps {
  event: ActivityEvent;
  projectName?: string;
  onInspect: (event: ActivityEvent) => void;
}

function getEventStyle(eventType: string): {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  borderClass: string;
} {
  switch (eventType) {
    case 'FINDING_DECISION_RECORDED':
      return {
        icon: CheckCheck,
        iconBg: 'bg-emerald-500/10',
        iconColor: 'text-emerald-400',
        borderClass: 'border-emerald-500/30',
      };
    case 'RULE_EVALUATION_COMPLETED':
      return {
        icon: ShieldCheck,
        iconBg: 'bg-indigo-500/10',
        iconColor: 'text-indigo-400',
        borderClass: 'border-indigo-500/30',
      };
    case 'DIFF_PROMOTED':
      return {
        icon: GitCompare,
        iconBg: 'bg-teal-500/10',
        iconColor: 'text-teal-400',
        borderClass: 'border-teal-500/30',
      };
    case 'DOCUMENT_UPLOADED':
      return {
        icon: FileUp,
        iconBg: 'bg-sky-500/10',
        iconColor: 'text-sky-400',
        borderClass: 'border-sky-500/30',
      };
    case 'FIELD_OVERRIDDEN':
    case 'FIELD_UPDATED':
      return {
        icon: Edit3,
        iconBg: 'bg-purple-500/10',
        iconColor: 'text-purple-400',
        borderClass: 'border-purple-500/30',
      };
    case 'PROJECT_CREATED':
      return {
        icon: FolderPlus,
        iconBg: 'bg-cyan-500/10',
        iconColor: 'text-cyan-400',
        borderClass: 'border-cyan-500/30',
      };
    case 'REVIEW_CREATED':
      return {
        icon: FileText,
        iconBg: 'bg-blue-500/10',
        iconColor: 'text-blue-400',
        borderClass: 'border-blue-500/30',
      };
    default:
      return {
        icon: Activity,
        iconBg: 'bg-slate-700/20',
        iconColor: 'text-slate-400',
        borderClass: 'border-slate-700/50',
      };
  }
}

function getEventTitle(event: ActivityEvent): React.ReactNode {
  const d = event.details || {};
  switch (event.event_type) {
    case 'FINDING_DECISION_RECORDED':
      return (
        <span className="leading-snug">
          Decision recorded on{' '}
          <strong className="text-white font-mono">{d.rule_key || 'finding'}</strong>:{' '}
          <span className="text-slate-400 font-medium">{d.prior_status}</span> →{' '}
          <span className="text-emerald-400 font-semibold">{d.new_status}</span>
        </span>
      );
    case 'RULE_EVALUATION_COMPLETED':
      return (
        <span className="leading-snug">
          Rule engine evaluation completed:{' '}
          <span className="text-emerald-400 font-semibold">{d.rules_passed ?? 0} passed</span>,{' '}
          <span className="text-rose-400 font-semibold">{d.rules_failed ?? d.total_findings ?? 0} non-compliant findings</span>
        </span>
      );
    case 'DIFF_PROMOTED':
      return (
        <span className="leading-snug">
          Revision diff promoted to finding:{' '}
          <span className="text-teal-300 font-medium">
            {d.change || d.change_type || d.diff_id || 'Text modification'}
          </span>
        </span>
      );
    case 'DOCUMENT_UPLOADED':
      return (
        <span className="leading-snug">
          Label document uploaded:{' '}
          <strong className="text-white font-mono">{d.filename || d.original_filename || 'PDF'}</strong>{' '}
          <span className="text-slate-400 uppercase font-mono text-[10px]">
            ({d.role || 'label'})
          </span>
        </span>
      );
    case 'PROJECT_CREATED':
      return (
        <span className="leading-snug">
          Project created: <strong className="text-white">{d.name || 'New Project'}</strong>
        </span>
      );
    case 'REVIEW_CREATED':
      return (
        <span className="leading-snug">
          Review workspace initialized: <strong className="text-white">{d.name || 'New Review'}</strong>
        </span>
      );
    default:
      return (
        <span className="leading-snug">
          System action: <span className="font-mono text-slate-300">{event.event_type}</span>
        </span>
      );
  }
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  } catch {
    return dateStr;
  }
}

export const ActivityTimelineCard: React.FC<ActivityTimelineCardProps> = ({
  event,
  projectName,
  onInspect,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const style = getEventStyle(event.event_type);
  const Icon = style.icon;

  const detailEntries = Object.entries(event.details || {});
  const hasDetails = detailEntries.length > 0;

  return (
    <div className="relative pl-6 before:absolute before:left-2.5 before:top-4 before:bottom-0 before:w-0.5 before:bg-slate-800 last:before:hidden">
      {/* Node Dot */}
      <div
        className={`absolute -left-6 top-3.5 w-7 h-7 rounded-lg border flex items-center justify-center ${style.iconBg} ${style.borderClass} ${style.iconColor}`}
      >
        <Icon className="w-3.5 h-3.5" />
      </div>

      {/* Card Content */}
      <div className="bg-slate-850/80 border border-slate-800 rounded-xl p-4 space-y-3 hover:border-slate-700 transition-colors shadow-sm text-left">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-mono text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                {event.event_type}
              </span>
              {projectName && (
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-slate-500" />
                  <span>{projectName}</span>
                </span>
              )}
            </div>
            <div className="text-xs text-slate-200">{getEventTitle(event)}</div>
          </div>

          <div className="flex items-center space-x-1.5 text-slate-400 text-[11px] font-mono shrink-0">
            <Clock className="w-3 h-3 text-slate-500" />
            <span title={new Date(event.created_at).toLocaleString()}>
              {formatRelativeTime(event.created_at)}
            </span>
          </div>
        </div>

        {/* Actor Info */}
        <div className="flex items-center justify-between text-xs text-slate-300 pt-1 border-t border-slate-800/60">
          <div className="flex items-center space-x-1.5 min-w-0">
            <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="text-slate-400 text-[11px]">Actor:</span>
            <span className="font-medium text-slate-200 text-xs truncate">{event.actor}</span>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {hasDetails && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex items-center space-x-1 text-[11px] text-slate-400 hover:text-indigo-300 transition-colors"
              >
                <span>{isExpanded ? 'Hide' : 'Details'}</span>
                {isExpanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => onInspect(event)}
              className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 text-[11px] font-mono transition-colors"
              title="Inspect complete structured JSON audit payload"
            >
              <Code className="w-3 h-3 text-indigo-400" />
              <span>Inspect</span>
            </button>
          </div>
        </div>

        {/* Expanded Key-Value Details */}
        {isExpanded && hasDetails && (
          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1.5 text-xs animate-in fade-in duration-100">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-1">
              Structured Event Attributes
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px]">
              {detailEntries.map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-2 py-0.5 border-b border-slate-900">
                  <span className="text-slate-500 truncate">{k}:</span>
                  <span className="text-slate-200 font-semibold truncate text-right">
                    {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
