import React, { useEffect, useState } from 'react';
import {
  X,
  History,
  ArrowRight,
  User,
  Clock,
  MessageSquare,
  AlertOctagon,
  Loader2,
} from 'lucide-react';
import { Finding, FindingDecision } from '../../types';
import { api } from '../../lib/api';
import { FindingSeverityBadge } from './FindingSeverityBadge';

interface FindingDecisionHistoryDrawerProps {
  isOpen: boolean;
  finding: Finding | null;
  onClose: () => void;
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

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Accepted':
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    case 'Resolved':
      return 'text-teal-400 bg-teal-500/10 border-teal-500/30';
    case 'Under Investigation':
      return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    case 'Open':
    default:
      return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
  }
}

export const FindingDecisionHistoryDrawer: React.FC<FindingDecisionHistoryDrawerProps> = ({
  isOpen,
  finding,
  onClose,
}) => {
  const [decisions, setDecisions] = useState<FindingDecision[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && finding) {
      loadHistory(finding.id);
    }
  }, [isOpen, finding]);

  const loadHistory = async (findingId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getFindingDecisions(findingId);
      setDecisions(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load decision history');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !finding) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg h-full bg-slate-900 border-l border-slate-700/80 shadow-2xl flex flex-col text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-850 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                Decision History
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-xs text-indigo-300 font-semibold bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/60">
                  {finding.rule_key}
                </span>
                <FindingSeverityBadge severity={finding.severity} size="sm" />
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              <p className="text-xs">Loading audit history...</p>
            </div>
          ) : decisions.length === 0 ? (
            <div className="py-16 text-center space-y-2 text-slate-400">
              <History className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-300">No decisions recorded yet</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Decisions and regulatory rationales recorded for this finding will appear here in chronological order.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
              {decisions.map((dec, idx) => (
                <div key={dec.id} className="relative group">
                  {/* Timeline Node Dot */}
                  <div
                    className={`absolute -left-6 top-1.5 w-3 h-3 rounded-full border-2 border-slate-900 ${
                      idx === 0 ? 'bg-indigo-500 ring-2 ring-indigo-500/30' : 'bg-slate-600'
                    }`}
                  />

                  {/* Card Body */}
                  <div className="bg-slate-850/80 border border-slate-800 rounded-xl p-4 space-y-3 shadow-md hover:border-slate-700 transition-colors">
                    {/* Status Transition Header */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center space-x-1.5 text-xs font-medium">
                        <span
                          className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${getStatusBadgeClass(
                            dec.prior_status
                          )}`}
                        >
                          {dec.prior_status}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span
                          className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${getStatusBadgeClass(
                            dec.new_status
                          )}`}
                        >
                          {dec.new_status}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1 text-[11px] text-slate-400 font-mono">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span title={new Date(dec.created_at).toISOString()}>
                          {formatRelativeTime(dec.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Actor Identification */}
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="font-medium text-slate-200 truncate">{dec.actor}</span>
                      </div>
                      {dec.actor_role && (
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                          {dec.actor_role}
                        </span>
                      )}
                    </div>

                    {/* Justification Note */}
                    <div className="pt-2 border-t border-slate-800/80">
                      {dec.note ? (
                        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 leading-relaxed font-sans space-y-1">
                          <div className="flex items-center space-x-1 text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                            <MessageSquare className="w-3 h-3 text-indigo-400" />
                            <span>Reviewer Justification Note</span>
                          </div>
                          <p className="whitespace-pre-wrap">{dec.note}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">
                          No rationale note provided.
                        </span>
                      )}
                    </div>

                    {/* ISO Timestamp Footer */}
                    <div className="text-[10px] text-slate-500 font-mono text-right">
                      {new Date(dec.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900 text-xs text-slate-400 flex items-center justify-between">
          <span>{decisions.length} recorded decision{decisions.length === 1 ? '' : 's'}</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
