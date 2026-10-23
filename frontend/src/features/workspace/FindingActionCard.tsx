import React, { useState } from 'react';
import {
  MapPin,
  ChevronRight,
  GitCompare,
  Layers,
  History,
  ShieldCheck,
} from 'lucide-react';
import { Finding, FindingStatus } from '../../types';
import { FindingSeverityBadge } from '../findings/FindingSeverityBadge';
import { FindingStatusBadge } from '../findings/FindingStatusBadge';
import { FindingDecisionModal } from '../findings/FindingDecisionModal';
import { FindingDecisionHistoryDrawer } from '../findings/FindingDecisionHistoryDrawer';

interface FindingActionCardProps {
  finding: Finding;
  isSelected: boolean;
  onSelect: () => void;
  onJumpToEvidence: () => void;
  onUpdateStatus: (findingId: string, status: FindingStatus) => Promise<void>;
}

export const FindingActionCard: React.FC<FindingActionCardProps> = ({
  finding,
  isSelected,
  onSelect,
  onJumpToEvidence,
  onUpdateStatus,
}) => {
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  const hasCoords =
    finding.norm_x0 !== null &&
    finding.norm_x0 !== undefined &&
    finding.norm_y0 !== null &&
    finding.norm_y0 !== undefined;

  const decisionCount = finding.decision_count ?? 0;

  return (
    <>
      <div
        onClick={onSelect}
        className={`rounded-xl border p-3.5 space-y-3 transition-all duration-150 cursor-pointer select-none text-left relative ${
          isSelected
            ? 'bg-slate-800/95 border-indigo-500/80 ring-1 ring-indigo-500/40 shadow-lg shadow-indigo-950/40'
            : 'bg-slate-900/60 border-slate-800/90 hover:bg-slate-850 hover:border-slate-700/80 text-slate-300'
        }`}
      >
        {/* 1. Header: Severity, Rule Key, Category & Status */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5 min-w-0">
            <FindingSeverityBadge severity={finding.severity} size="sm" />
            <span className="font-mono text-[11px] text-slate-300 font-semibold truncate bg-slate-950/70 px-1.5 py-0.5 rounded border border-slate-800">
              {finding.rule_key}
            </span>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsDecisionModalOpen(true);
              }}
              className="hover:opacity-80 transition-opacity"
              title="Click to record compliance decision"
            >
              <FindingStatusBadge status={finding.status} size="sm" />
            </button>
          </div>
        </div>

        {/* 2. Plain-Text Explanation */}
        <p className="text-xs text-slate-200 leading-relaxed font-sans">
          {finding.explanation}
        </p>

        {/* 3. Expected vs. Observed Comparison Block */}
        {(finding.expected_value || finding.observed_value) && (
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-lg p-2 space-y-1 font-mono text-[11px]">
            {finding.expected_value && (
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-500 shrink-0">Expected:</span>
                <span className="text-emerald-400 font-semibold text-right truncate">
                  {finding.expected_value}
                </span>
              </div>
            )}
            {finding.observed_value && (
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-500 shrink-0">Observed:</span>
                <span className="text-rose-400 font-semibold text-right truncate">
                  {finding.observed_value}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 3b. Latest Decision Summary if exists */}
        {finding.latest_decision && (
          <div className="p-2 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-[11px] text-indigo-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-indigo-300 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-indigo-400" />
                Latest Decision: {finding.latest_decision.new_status}
              </span>
              <span className="text-[10px] text-indigo-400/80 font-mono">
                {finding.latest_decision.actor}
              </span>
            </div>
            {finding.latest_decision.note && (
              <p className="text-[10px] text-slate-300 line-clamp-1 italic font-sans">
                "{finding.latest_decision.note}"
              </p>
            )}
          </div>
        )}

        {/* 4. Category & Promotion indicator + History link */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 border-t border-slate-800/60">
          <span className="flex items-center space-x-1">
            <Layers className="w-3 h-3 text-slate-500" />
            <span>{finding.category || 'General'}</span>
          </span>

          <div className="flex items-center space-x-2">
            {finding.diff_item_id && (
              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-teal-500/15 text-teal-300 border border-teal-500/30">
                <GitCompare className="w-2.5 h-2.5" />
                <span>Promoted Diff</span>
              </span>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsHistoryDrawerOpen(true);
              }}
              className="inline-flex items-center space-x-1 text-slate-400 hover:text-indigo-300 font-mono transition-colors px-1 py-0.5 rounded hover:bg-slate-800"
              title="View chronological decision history"
            >
              <History className="w-3 h-3 text-slate-500" />
              <span>History ({decisionCount})</span>
            </button>
          </div>
        </div>

        {/* 5. Footer: Citation & CTAs */}
        <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-800/80">
          <div className="flex items-center space-x-1.5 text-[10px] font-mono text-slate-400 truncate">
            <span
              className={`px-1.5 py-0.5 rounded font-semibold uppercase ${
                finding.document_role === 'revised'
                  ? 'bg-purple-500/15 text-purple-300'
                  : 'bg-sky-500/15 text-sky-300'
              }`}
            >
              {finding.document_role === 'revised' ? 'Revised' : 'Baseline'}
            </span>
            <span>Page {finding.page_number || 1}</span>
            {hasCoords && (
              <span className="text-slate-500 hidden sm:inline">
                [{(finding.norm_x0! * 100).toFixed(0)}%, {(finding.norm_y0! * 100).toFixed(0)}%]
              </span>
            )}
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsDecisionModalOpen(true);
              }}
              className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-semibold bg-slate-800/80 hover:bg-slate-750 text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/60 transition-all"
              title="Record compliance triage decision"
            >
              <ShieldCheck className="w-3 h-3 text-indigo-400" />
              <span>Decide</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onJumpToEvidence();
              }}
              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                isSelected
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80'
              }`}
              title="Jump directly to cited evidence in Evidence Canvas"
            >
              <MapPin className="w-3 h-3 text-indigo-400" />
              <span className="hidden sm:inline">Jump</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Decision Modal */}
      {isDecisionModalOpen && (
        <FindingDecisionModal
          isOpen={isDecisionModalOpen}
          finding={finding}
          onClose={() => setIsDecisionModalOpen(false)}
          onSuccess={async (_decision, newStatus) => {
            await onUpdateStatus(finding.id, newStatus);
          }}
        />
      )}

      {/* Decision History Drawer */}
      {isHistoryDrawerOpen && (
        <FindingDecisionHistoryDrawer
          isOpen={isHistoryDrawerOpen}
          finding={finding}
          onClose={() => setIsHistoryDrawerOpen(false)}
        />
      )}
    </>
  );
};
