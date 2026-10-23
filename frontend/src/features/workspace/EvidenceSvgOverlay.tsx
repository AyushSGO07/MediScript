import React, { useState } from 'react';
import { Finding, ExtractedField, DiffItem, TextBlock } from '../../types';
import { WorkspaceLayers } from './useReviewWorkspace';
import { MapPin } from 'lucide-react';

interface EvidenceSvgOverlayProps {
  findings: Finding[];
  entities: ExtractedField[];
  diffs: DiffItem[];
  searchMatches?: TextBlock[];
  currentSearchMatchIndex?: number;
  selectedFindingId: string | null;
  activeLayers: WorkspaceLayers;
  onSelectFinding: (findingId: string) => void;
  role: 'revised' | 'baseline';
}

interface HoverCardState {
  type: 'finding' | 'entity' | 'diff' | 'search';
  title: string;
  badge: string;
  badgeColor: string;
  subtitle?: string;
  snippet?: string;
  normX: number;
  normY: number;
}

export const EvidenceSvgOverlay: React.FC<EvidenceSvgOverlayProps> = ({
  findings,
  entities,
  diffs,
  searchMatches = [],
  currentSearchMatchIndex = 0,
  selectedFindingId,
  activeLayers,
  onSelectFinding,
  role,
}) => {
  const [hoverCard, setHoverCard] = useState<HoverCardState | null>(null);

  // Helper to get severity colors
  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return {
          stroke: '#F43F5E',
          fill: 'rgba(244, 63, 94, 0.16)',
          text: 'text-rose-400',
          bg: 'bg-rose-500/20 border-rose-500/40',
        };
      case 'Major':
        return {
          stroke: '#F59E0B',
          fill: 'rgba(245, 158, 11, 0.16)',
          text: 'text-amber-400',
          bg: 'bg-amber-500/20 border-amber-500/40',
        };
      default:
        return {
          stroke: '#0EA5E9',
          fill: 'rgba(14, 165, 233, 0.14)',
          text: 'text-sky-400',
          bg: 'bg-sky-500/20 border-sky-500/40',
        };
    }
  };

  const getEntityStyle = (state: string) => {
    switch (state) {
      case 'EXTRACTED':
        return { stroke: '#10B981', fill: 'rgba(16, 185, 129, 0.08)', dash: '4 2' };
      case 'AMBIGUOUS':
        return { stroke: '#F59E0B', fill: 'rgba(245, 158, 11, 0.08)', dash: '4 2' };
      default:
        return { stroke: '#A855F7', fill: 'rgba(168, 85, 247, 0.08)', dash: '4 2' };
    }
  };

  const getDiffStyle = (changeType: string) => {
    switch (changeType) {
      case 'ADDED':
        return { stroke: '#10B981', fill: 'rgba(16, 185, 129, 0.18)', dash: undefined };
      case 'DELETED':
        return { stroke: '#F43F5E', fill: 'rgba(244, 63, 94, 0.18)', dash: '6 3' };
      default:
        return { stroke: '#F59E0B', fill: 'rgba(245, 158, 11, 0.18)', dash: undefined };
    }
  };

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none select-none z-10">
      {/* SVG Container with 1000x1000 viewBox matching normalized 0.0-1.0 coords */}
      <svg
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        className="w-full h-full overflow-visible pointer-events-none"
      >
        <defs>
          <filter id="glow-rose" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#F43F5E" floodOpacity="0.7" />
          </filter>
          <filter id="glow-indigo" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#6366F1" floodOpacity="0.9" />
          </filter>
          <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#06B6D4" floodOpacity="0.8" />
          </filter>
        </defs>

        {/* 1. EXTRACTED ENTITIES LAYER (Background) */}
        {activeLayers.entities &&
          entities.map((entity) => {
            if (
              entity.norm_x0 === undefined ||
              entity.norm_y0 === undefined ||
              entity.norm_x0 === null ||
              entity.norm_y0 === null
            )
              return null;

            const x = entity.norm_x0 * 1000;
            const y = entity.norm_y0 * 1000;
            const w = Math.max(10, ((entity.norm_x1 || entity.norm_x0 + 0.1) - entity.norm_x0) * 1000);
            const h = Math.max(10, ((entity.norm_y1 || entity.norm_y0 + 0.03) - entity.norm_y0) * 1000);
            const style = getEntityStyle(entity.confidence_state);

            return (
              <rect
                key={`entity-${entity.id}`}
                x={x}
                y={y}
                width={w}
                height={h}
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth="1.5"
                strokeDasharray={style.dash}
                vectorEffect="non-scaling-stroke"
                rx="2"
                className="pointer-events-auto cursor-help opacity-70 hover:opacity-100 transition-opacity"
                onMouseEnter={() =>
                  setHoverCard({
                    type: 'entity',
                    title: entity.field_label || entity.field_key,
                    badge: entity.confidence_state,
                    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                    subtitle: entity.category,
                    snippet: entity.normalized_value || entity.value || entity.raw_value,
                    normX: entity.norm_x0 || 0,
                    normY: entity.norm_y0 || 0,
                  })
                }
                onMouseLeave={() => setHoverCard(null)}
              />
            );
          })}

        {/* 2. REVISION DIFFS LAYER */}
        {activeLayers.diffs &&
          diffs.map((diff) => {
            const normX0 = role === 'revised' ? diff.revised_norm_x0 : diff.baseline_norm_x0;
            const normY0 = role === 'revised' ? diff.revised_norm_y0 : diff.baseline_norm_y0;
            const normX1 = role === 'revised' ? diff.revised_norm_x1 : diff.baseline_norm_x1;
            const normY1 = role === 'revised' ? diff.revised_norm_y1 : diff.baseline_norm_y1;

            if (normX0 === undefined || normY0 === undefined || normX0 === null || normY0 === null)
              return null;

            const x = normX0 * 1000;
            const y = normY0 * 1000;
            const w = Math.max(12, ((normX1 || normX0 + 0.1) - normX0) * 1000);
            const h = Math.max(12, ((normY1 || normY0 + 0.03) - normY0) * 1000);
            const style = getDiffStyle(diff.change_type);

            return (
              <rect
                key={`diff-${diff.id}`}
                x={x}
                y={y}
                width={w}
                height={h}
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth="2"
                strokeDasharray={style.dash}
                vectorEffect="non-scaling-stroke"
                rx="3"
                className="pointer-events-auto cursor-help opacity-80 hover:opacity-100 transition-opacity"
                onMouseEnter={() =>
                  setHoverCard({
                    type: 'diff',
                    title: `Diff: ${diff.change_type}`,
                    badge: diff.significance || 'Medium',
                    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
                    subtitle: diff.category,
                    snippet: role === 'revised' ? diff.revised_text : diff.baseline_text,
                    normX: normX0,
                    normY: normY0,
                  })
                }
                onMouseLeave={() => setHoverCard(null)}
              />
            );
          })}

        {/* 3. IN-DOCUMENT SEARCH HIGHLIGHTS (VIEW-05) */}
        {activeLayers.search &&
          searchMatches.map((block, idx) => {
            if (
              block.norm_x0 === undefined ||
              block.norm_y0 === undefined ||
              block.norm_x0 === null ||
              block.norm_y0 === null
            )
              return null;

            const isCurrent = idx === currentSearchMatchIndex;
            const x = block.norm_x0 * 1000;
            const y = block.norm_y0 * 1000;
            const w = Math.max(12, ((block.norm_x1 || block.norm_x0 + 0.1) - block.norm_x0) * 1000);
            const h = Math.max(12, ((block.norm_y1 || block.norm_y0 + 0.03) - block.norm_y0) * 1000);

            return (
              <rect
                key={`search-block-${block.id || idx}`}
                x={x}
                y={y}
                width={w}
                height={h}
                fill={isCurrent ? 'rgba(34, 211, 238, 0.45)' : 'rgba(6, 182, 212, 0.28)'}
                stroke="#06B6D4"
                strokeWidth={isCurrent ? '2.5' : '1.5'}
                filter={isCurrent ? 'url(#glow-cyan)' : undefined}
                vectorEffect="non-scaling-stroke"
                rx="2"
                className="pointer-events-auto cursor-pointer"
                onMouseEnter={() =>
                  setHoverCard({
                    type: 'search',
                    title: `Search Match #${idx + 1}`,
                    badge: `Block ${block.block_index}`,
                    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
                    snippet: block.text,
                    normX: block.norm_x0,
                    normY: block.norm_y0,
                  })
                }
                onMouseLeave={() => setHoverCard(null)}
              />
            );
          })}

        {/* 4. COMPLIANCE FINDINGS LAYER (Foremost & Interactive) */}
        {activeLayers.findings &&
          findings.map((finding) => {
            if (
              finding.norm_x0 === undefined ||
              finding.norm_y0 === undefined ||
              finding.norm_x0 === null ||
              finding.norm_y0 === null
            )
              return null;

            const isSelected = finding.id === selectedFindingId;
            const x = finding.norm_x0 * 1000;
            const y = finding.norm_y0 * 1000;
            const w = Math.max(14, ((finding.norm_x1 || finding.norm_x0 + 0.12) - finding.norm_x0) * 1000);
            const h = Math.max(14, ((finding.norm_y1 || finding.norm_y0 + 0.035) - finding.norm_y0) * 1000);
            const style = getSeverityStyle(finding.severity);

            return (
              <g
                key={`finding-${finding.id}`}
                className="pointer-events-auto cursor-pointer group"
                onClick={() => onSelectFinding(finding.id)}
                onMouseEnter={() =>
                  setHoverCard({
                    type: 'finding',
                    title: `${finding.rule_key}: ${finding.category}`,
                    badge: finding.severity,
                    badgeColor: style.bg,
                    subtitle: finding.status,
                    snippet: finding.explanation,
                    normX: finding.norm_x0 || 0,
                    normY: finding.norm_y0 || 0,
                  })
                }
                onMouseLeave={() => setHoverCard(null)}
              >
                {/* Active Focus Pulsating Outer Ring */}
                {isSelected && (
                  <rect
                    x={x - 4}
                    y={y - 4}
                    width={w + 8}
                    height={h + 8}
                    fill="none"
                    stroke="#818CF8"
                    strokeWidth="3"
                    strokeDasharray="6 3"
                    filter="url(#glow-indigo)"
                    vectorEffect="non-scaling-stroke"
                    rx="4"
                    className="animate-pulse"
                  />
                )}

                {/* Primary Finding Bounding Box */}
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill={style.fill}
                  stroke={style.stroke}
                  strokeWidth={isSelected ? '2.5' : '1.8'}
                  filter={finding.severity === 'Critical' ? 'url(#glow-rose)' : undefined}
                  vectorEffect="non-scaling-stroke"
                  rx="3"
                  className="transition-all duration-150 group-hover:stroke-width-[3]"
                />
              </g>
            );
          })}
      </svg>

      {/* Floating Hover Card (Rendered in HTML for rich typography & auto bounds) */}
      {hoverCard && (
        <div
          className="absolute pointer-events-none z-30 transition-all duration-100 ease-out"
          style={{
            left: `${Math.min(75, Math.max(2, hoverCard.normX * 100))}%`,
            top: `${Math.max(2, hoverCard.normY * 100 - 12)}%`,
          }}
        >
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-lg p-2.5 shadow-2xl max-w-xs text-xs space-y-1.5 ring-1 ring-white/10">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-white truncate max-w-[170px]" title={hoverCard.title}>
                {hoverCard.title}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase shrink-0 ${hoverCard.badgeColor}`}>
                {hoverCard.badge}
              </span>
            </div>

            {hoverCard.subtitle && (
              <p className="text-[10px] text-slate-400 font-mono">
                {hoverCard.subtitle}
              </p>
            )}

            {hoverCard.snippet && (
              <p className="text-[11px] text-slate-300 leading-snug line-clamp-3 bg-slate-950/60 p-1.5 rounded border border-slate-800/80 font-mono">
                {hoverCard.snippet}
              </p>
            )}

            {hoverCard.type === 'finding' && (
              <div className="flex items-center space-x-1 text-[10px] text-indigo-400 font-medium pt-0.5">
                <MapPin className="w-3 h-3" />
                <span>Click to inspect in action queue</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
