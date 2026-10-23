import React, { useState } from 'react';
import { FileText, MapPin, Quote, History, ShieldCheck } from 'lucide-react';
import { Finding } from '../../types';
import { FindingSeverityBadge } from './FindingSeverityBadge';
import { FindingStatusBadge } from './FindingStatusBadge';
import { FindingDecisionModal } from './FindingDecisionModal';
import { FindingDecisionHistoryDrawer } from './FindingDecisionHistoryDrawer';

interface FindingCardProps {
  finding: Finding;
  onSelect?: (finding: Finding) => void;
  onStatusUpdated?: () => void;
}

export const FindingCard: React.FC<FindingCardProps> = ({ finding, onSelect, onStatusUpdated }) => {
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  const isRevised = finding.document_role === 'revised';
  const hasCoords =
    finding.norm_x0 !== null &&
    finding.norm_x0 !== undefined &&
    finding.norm_y0 !== null &&
    finding.norm_y0 !== undefined;

  const decisionCount = finding.decision_count ?? 0;

  return (
    <>
      <div
        className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60 hover:border-slate-600 transition-colors space-y-3 cursor-pointer"
        onClick={() => onSelect && onSelect(finding)}
      >
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <FindingSeverityBadge severity={finding.severity} size="sm" />
            <span className="px-2 py-0.5 text-xs font-mono font-medium rounded bg-slate-900/80 text-slate-300 border border-slate-700">
              {finding.rule_key}
            </span>
            <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-700/40 text-slate-400">
              {finding.category}
            </span>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
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

        {/* Explanation Text */}
        <p className="text-sm text-slate-200 leading-relaxed font-normal">
          {finding.explanation}
        </p>

        {/* Expected vs Observed Comparison */}
        {(finding.expected_value || finding.observed_value) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {finding.expected_value && (
              <div className="p-2.5 rounded bg-emerald-950/20 border border-emerald-500/20 flex flex-col space-y-1">
                <span className="text-[10px] font-semibold tracking-wider uppercase text-emerald-400">
                  Expected
                </span>
                <span className="font-mono text-emerald-200 break-words">
                  {finding.expected_value}
                </span>
              </div>
            )}
            {finding.observed_value && (
              <div className="p-2.5 rounded bg-rose-950/20 border border-rose-500/20 flex flex-col space-y-1">
                <span className="text-[10px] font-semibold tracking-wider uppercase text-rose-400">
                  Observed
                </span>
                <span className="font-mono text-rose-200 break-words">
                  {finding.observed_value}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Latest Decision Note if present */}
        {finding.latest_decision && (
          <div className="p-2 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200 space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-indigo-300 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                Latest Decision: {finding.latest_decision.new_status}
              </span>
              <span className="text-[10px] text-indigo-400/80 font-mono">
                {finding.latest_decision.actor}
              </span>
            </div>
            {finding.latest_decision.note && (
              <p className="text-[11px] text-slate-300 line-clamp-1 italic font-sans">
                "{finding.latest_decision.note}"
              </p>
            )}
          </div>
        )}

        {/* Evidence Citation & Coordinates */}
        <div className="pt-2 border-t border-slate-700/40 flex flex-col space-y-2">
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
            <div className="flex items-center space-x-2">
              <span
                className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                  isRevised
                    ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                    : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                }`}
              >
                <FileText className="w-3 h-3 mr-1" />
                <span>{isRevised ? 'Revised Document' : 'Baseline Document'}</span>
              </span>

              {finding.page_number && (
                <span className="text-slate-400 font-mono text-[11px]">
                  Page {finding.page_number}
                </span>
              )}
            </div>

            {hasCoords ? (
              <div
                className="inline-flex items-center space-x-1 text-slate-400 font-mono text-[10px] bg-slate-900/60 px-2 py-0.5 rounded border border-slate-700/50"
                title="Normalized bounding box coordinates [x0, y0, x1, y1]"
              >
                <MapPin className="w-3 h-3 text-cyan-400" />
                <span>
                  bbox: [{finding.norm_x0?.toFixed(3)}, {finding.norm_y0?.toFixed(3)},{' '}
                  {finding.norm_x1?.toFixed(3)}, {finding.norm_y1?.toFixed(3)}]
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400 italic">
                Location: Whole document (Field omitted / unreadable)
              </span>
            )}
          </div>

          {/* Snippet Context */}
          {finding.evidence_snippet && (
            <div className="p-2 rounded bg-slate-900/70 border border-slate-800 text-xs text-slate-300 flex items-start space-x-2">
              <Quote className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span className="font-mono italic text-[11px] text-slate-300 line-clamp-2">
                "{finding.evidence_snippet}"
              </span>
            </div>
          )}

          {/* Decision and History Actions */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsHistoryDrawerOpen(true);
              }}
              className="inline-flex items-center space-x-1 text-xs text-slate-400 hover:text-indigo-300 font-mono transition-colors"
            >
              <History className="w-3.5 h-3.5 text-slate-500" />
              <span>History ({decisionCount})</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsDecisionModalOpen(true);
              }}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Record Decision</span>
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
          onSuccess={() => {
            if (onStatusUpdated) onStatusUpdated();
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
