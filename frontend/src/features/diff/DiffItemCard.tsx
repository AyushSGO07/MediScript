import React, { useState } from 'react';
import { MapPin, Flag, CheckCircle2, ArrowRight, Sparkles, ChevronDown, ChevronUp, ShieldAlert, Loader2 } from 'lucide-react';
import { DiffItem, ClinicalImpactSummary } from '../../types';
import { DiffTypeBadge } from './DiffTypeBadge';
import { api } from '../../lib/api';

interface DiffItemCardProps {
  diffItem: DiffItem;
  onPromote?: (item: DiffItem) => void;
}

export const DiffItemCard: React.FC<DiffItemCardProps> = ({ diffItem, onPromote }) => {
  const [impact, setImpact] = useState<ClinicalImpactSummary | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [isImpactOpen, setIsImpactOpen] = useState(false);

  const hasBaseCoords =
    diffItem.baseline_norm_x0 !== null &&
    diffItem.baseline_norm_x0 !== undefined &&
    diffItem.baseline_norm_y0 !== null &&
    diffItem.baseline_norm_y0 !== undefined;

  const hasRevCoords =
    diffItem.revised_norm_x0 !== null &&
    diffItem.revised_norm_x0 !== undefined &&
    diffItem.revised_norm_y0 !== null &&
    diffItem.revised_norm_y0 !== undefined;

  const handleToggleImpact = async () => {
    if (!impact && !loadingImpact) {
      try {
        setLoadingImpact(true);
        const data = await api.getDiffClinicalImpact(diffItem.review_id, diffItem.id);
        setImpact(data);
        setIsImpactOpen(true);
      } catch (err) {
        console.error('Failed to load clinical impact analysis:', err);
      } finally {
        setLoadingImpact(false);
      }
    } else {
      setIsImpactOpen(!isImpactOpen);
    }
  };

  return (
    <div className="p-4 rounded-lg bg-slate-800/80 border border-slate-700/60 hover:border-slate-600 transition-colors space-y-3">
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <DiffTypeBadge changeType={diffItem.change_type} size="sm" />
          <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-700/40 text-slate-300 border border-slate-700">
            {diffItem.category}
          </span>
          <span
            className={`px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded ${
              diffItem.significance === 'High'
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                : diffItem.significance === 'Medium'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'bg-slate-700/40 text-slate-400'
            }`}
          >
            {diffItem.significance} Priority
          </span>

          {impact && (
            <span
              className={`px-2 py-0.5 text-[10px] font-bold rounded flex items-center gap-1 ${
                impact.clinical_risk === 'High'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : impact.clinical_risk === 'Medium'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              <ShieldAlert className="w-3 h-3" />
              {impact.clinical_risk} Clinical Risk
            </span>
          )}
        </div>

        {/* Page References */}
        <div className="flex items-center space-x-1.5 text-[11px] font-mono">
          {diffItem.baseline_page && (
            <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
              Base p.{diffItem.baseline_page}
            </span>
          )}
          {diffItem.baseline_page && diffItem.revised_page && (
            <ArrowRight className="w-3 h-3 text-slate-500" />
          )}
          {diffItem.revised_page && (
            <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
              Rev p.{diffItem.revised_page}
            </span>
          )}
        </div>
      </div>

      {/* Visual Token Diff Rendering */}
      <div className="p-3 rounded bg-slate-900/80 border border-slate-800 text-xs leading-relaxed break-words font-mono">
        {diffItem.token_diffs && diffItem.token_diffs.length > 0 ? (
          <div className="flex flex-wrap items-baseline gap-1">
            {diffItem.token_diffs.map((token, idx) => {
              if (token.type === 'delete') {
                return (
                  <span
                    key={idx}
                    className="bg-rose-500/20 text-rose-300 line-through px-1 py-0.5 rounded border border-rose-500/30 text-[11px]"
                    title="Deleted from baseline"
                  >
                    {token.text}
                  </span>
                );
              }
              if (token.type === 'insert') {
                return (
                  <span
                    key={idx}
                    className="bg-emerald-500/20 text-emerald-300 font-semibold px-1 py-0.5 rounded border border-emerald-500/30 text-[11px]"
                    title="Inserted into revised"
                  >
                    {token.text}
                  </span>
                );
              }
              return (
                <span key={idx} className="text-slate-300 text-[11px]">
                  {token.text}
                </span>
              );
            })}
          </div>
        ) : (
          <div className="space-y-1.5">
            {diffItem.baseline_text && (
              <div className="text-rose-300 line-through">
                - {diffItem.baseline_text}
              </div>
            )}
            {diffItem.revised_text && (
              <div className="text-emerald-300 font-semibold">
                + {diffItem.revised_text}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expandable Clinical Impact Summary (AIAS-02) */}
      <div className="rounded-lg bg-slate-900/60 border border-slate-700/50 overflow-hidden text-xs">
        <button
          onClick={handleToggleImpact}
          disabled={loadingImpact}
          className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-slate-800/60 transition-colors text-slate-300"
        >
          <div className="flex items-center gap-1.5 font-medium text-teal-400">
            {loadingImpact ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>Clinical & Regulatory Impact Analysis (AI Assistant)</span>
          </div>
          {isImpactOpen ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>

        {isImpactOpen && impact && (
          <div className="p-3 pt-1 border-t border-slate-800 space-y-2 text-slate-300 bg-slate-950/40">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Summary:</span>
              <p className="text-xs text-slate-200 mt-0.5">{impact.plain_language_summary}</p>
            </div>
            <div>
              <span className="text-[10px] text-amber-400/90 uppercase font-bold tracking-wider">Regulatory Implication:</span>
              <p className="text-xs text-slate-300 mt-0.5">{impact.regulatory_implication}</p>
            </div>
            <div>
              <span className="text-[10px] text-emerald-400/90 uppercase font-bold tracking-wider">Recommended Action:</span>
              <p className="text-xs text-slate-300 mt-0.5">{impact.suggested_action}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer: Coordinates & Action */}
      <div className="pt-2 border-t border-slate-700/40 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 text-slate-400 font-mono text-[10px]">
          {hasBaseCoords && (
            <div
              className="inline-flex items-center space-x-1 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-700/50 text-sky-300"
              title="Baseline normalized coordinates [x0, y0, x1, y1]"
            >
              <MapPin className="w-3 h-3 text-sky-400" />
              <span>
                Base: [{diffItem.baseline_norm_x0?.toFixed(3)},{' '}
                {diffItem.baseline_norm_y0?.toFixed(3)},{' '}
                {diffItem.baseline_norm_x1?.toFixed(3)},{' '}
                {diffItem.baseline_norm_y1?.toFixed(3)}]
              </span>
            </div>
          )}

          {hasRevCoords && (
            <div
              className="inline-flex items-center space-x-1 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-700/50 text-purple-300"
              title="Revised normalized coordinates [x0, y0, x1, y1]"
            >
              <MapPin className="w-3 h-3 text-purple-400" />
              <span>
                Rev: [{diffItem.revised_norm_x0?.toFixed(3)},{' '}
                {diffItem.revised_norm_y0?.toFixed(3)},{' '}
                {diffItem.revised_norm_x1?.toFixed(3)},{' '}
                {diffItem.revised_norm_y1?.toFixed(3)}]
              </span>
            </div>
          )}
        </div>

        {/* Promotion Action */}
        <div>
          {diffItem.is_promoted ? (
            <span
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium"
              title="This revision difference has been promoted to a compliance finding"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Promoted to Finding</span>
            </span>
          ) : (
            <button
              onClick={() => onPromote && onPromote(diffItem)}
              className="inline-flex items-center space-x-1.5 px-3 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold transition-colors"
              title="Promote this revision diff into an actionable compliance finding"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Promote to Finding</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
