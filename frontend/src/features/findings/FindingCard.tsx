import React from 'react';
import { FileText, MapPin, Quote } from 'lucide-react';
import { Finding } from '../../types';
import { FindingSeverityBadge } from './FindingSeverityBadge';
import { FindingStatusBadge } from './FindingStatusBadge';

interface FindingCardProps {
  finding: Finding;
  onSelect?: (finding: Finding) => void;
}

export const FindingCard: React.FC<FindingCardProps> = ({ finding, onSelect }) => {
  const isRevised = finding.document_role === 'revised';
  const hasCoords =
    finding.norm_x0 !== null &&
    finding.norm_x0 !== undefined &&
    finding.norm_y0 !== null &&
    finding.norm_y0 !== undefined;

  return (
    <div
      className="p-4 rounded-lg bg-slate-800/80 border border-slate-700/60 hover:border-slate-600 transition-colors space-y-3"
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
        <FindingStatusBadge status={finding.status} size="sm" />
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
      </div>
    </div>
  );
};
