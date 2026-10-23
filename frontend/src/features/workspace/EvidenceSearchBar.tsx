import React, { useMemo, useEffect } from 'react';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { TextBlock } from '../../types';

interface EvidenceSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  textBlocks: TextBlock[];
  activePage: number;
  currentMatchIndex: number;
  onMatchIndexChange: (index: number) => void;
  onMatchesFound?: (matches: TextBlock[]) => void;
}

export const EvidenceSearchBar: React.FC<EvidenceSearchBarProps> = ({
  searchQuery,
  onSearchChange,
  textBlocks,
  activePage,
  currentMatchIndex,
  onMatchIndexChange,
  onMatchesFound,
}) => {
  // Filter matching blocks on the current page
  const pageMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return textBlocks.filter(
      (b) =>
        (b.page_number === activePage || (!b.page_number && activePage === 1)) &&
        b.text &&
        b.text.toLowerCase().includes(q)
    );
  }, [searchQuery, textBlocks, activePage]);

  // Notify parent of matches for SVG rendering
  useEffect(() => {
    if (onMatchesFound) {
      onMatchesFound(pageMatches);
    }
  }, [pageMatches, onMatchesFound]);

  const handlePrev = () => {
    if (pageMatches.length === 0) return;
    const nextIdx = currentMatchIndex <= 0 ? pageMatches.length - 1 : currentMatchIndex - 1;
    onMatchIndexChange(nextIdx);
  };

  const handleNext = () => {
    if (pageMatches.length === 0) return;
    const nextIdx = currentMatchIndex >= pageMatches.length - 1 ? 0 : currentMatchIndex + 1;
    onMatchIndexChange(nextIdx);
  };

  return (
    <div className="relative flex items-center w-full">
      <div className="relative flex-1 flex items-center">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            onSearchChange(e.target.value);
            onMatchIndexChange(0);
          }}
          placeholder="Search document text..."
          className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg pl-8 pr-16 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
        />

        {searchQuery && (
          <button
            onClick={() => {
              onSearchChange('');
              onMatchIndexChange(0);
            }}
            className="absolute right-2 text-slate-400 hover:text-white p-0.5"
            title="Clear search"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Match indicator and cycling arrows */}
      {searchQuery.trim() && (
        <div className="flex items-center space-x-1 ml-2 shrink-0">
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
              pageMatches.length > 0
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {pageMatches.length > 0
              ? `${currentMatchIndex + 1} of ${pageMatches.length}`
              : '0 matches'}
          </span>

          {pageMatches.length > 0 && (
            <div className="flex items-center bg-slate-800 rounded border border-slate-700 p-0.5">
              <button
                onClick={handlePrev}
                className="p-0.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
                title="Previous match"
              >
                <ChevronUp className="w-3 h-3" />
              </button>
              <button
                onClick={handleNext}
                className="p-0.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
                title="Next match"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
