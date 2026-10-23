import React from 'react';
import { TextBlock } from '../../types';

interface BoundingBoxOverlayProps {
  blocks: TextBlock[];
  containerWidth: number;
  containerHeight: number;
  visible: boolean;
}

export const BoundingBoxOverlay: React.FC<BoundingBoxOverlayProps> = ({
  blocks,
  containerWidth,
  containerHeight,
  visible,
}) => {
  if (!visible || !containerWidth || !containerHeight) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ width: containerWidth, height: containerHeight }}
    >
      {blocks.map((b) => {
        const left = Math.round(b.norm_x0 * containerWidth);
        const top = Math.round(b.norm_y0 * containerHeight);
        const width = Math.max(4, Math.round((b.norm_x1 - b.norm_x0) * containerWidth));
        const height = Math.max(4, Math.round((b.norm_y1 - b.norm_y0) * containerHeight));

        return (
          <div
            key={b.id || `${b.page_number}-${b.block_index}`}
            style={{ left, top, width, height }}
            className={`absolute pointer-events-auto border rounded-[2px] transition-all cursor-pointer group ${
              b.is_heading
                ? 'border-teal-400/80 bg-teal-500/15 hover:bg-teal-500/30'
                : 'border-sky-400/60 bg-sky-500/10 hover:bg-sky-500/25'
            }`}
            title={`[Block ${b.block_index + 1}] "${b.text}"\nFont: ${b.font_name || 'unknown'} (${b.font_size || 'N/A'}pt)\nBBox: [${b.norm_x0}, ${b.norm_y0}, ${b.norm_x1}, ${b.norm_y1}]`}
          >
            {/* Minimal label tag for heading blocks */}
            {b.is_heading && (
              <span className="absolute -top-3.5 left-0 px-1 py-0.2 rounded text-[8px] font-mono bg-teal-900/90 text-teal-200 border border-teal-500/50 pointer-events-none whitespace-nowrap shadow-sm">
                Heading
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
