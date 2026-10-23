import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { Finding, FindingStatus } from '../../types';
import { FindingActionCard } from './FindingActionCard';

interface FindingActionQueueProps {
  findings: Finding[];
  selectedFindingId: string | null;
  onSelectFinding: (findingId: string) => void;
  onJumpToEvidence: (finding: Finding) => void;
  onUpdateFindingStatus: (findingId: string, status: FindingStatus) => Promise<void>;
}

export const FindingActionQueue: React.FC<FindingActionQueueProps> = ({
  findings,
  selectedFindingId,
  onSelectFinding,
  onJumpToEvidence,
  onUpdateFindingStatus,
}) => {
  const [filterTab, setFilterTab] = useState<'All' | 'Critical' | 'Major' | 'Minor' | 'Diffs'>('All');
  const [search, setSearch] = useState('');
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll selected finding into view
  useEffect(() => {
    if (!selectedFindingId || !listContainerRef.current) return;
    const el = listContainerRef.current.querySelector(`[data-finding-id="${selectedFindingId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedFindingId]);

  // Counts
  const criticalCount = useMemo(() => findings.filter((f) => f.severity === 'Critical').length, [findings]);
  const majorCount = useMemo(() => findings.filter((f) => f.severity === 'Major').length, [findings]);
  const minorCount = useMemo(() => findings.filter((f) => f.severity === 'Minor').length, [findings]);
  const diffsCount = useMemo(() => findings.filter((f) => !!f.diff_item_id).length, [findings]);

  // Filtered findings list
  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      // Tab filter
      if (filterTab === 'Critical' && f.severity !== 'Critical') return false;
      if (filterTab === 'Major' && f.severity !== 'Major') return false;
      if (filterTab === 'Minor' && f.severity !== 'Minor') return false;
      if (filterTab === 'Diffs' && !f.diff_item_id) return false;

      // Text search
      if (search.trim()) {
        const q = search.toLowerCase();
        const inKey = f.rule_key.toLowerCase().includes(q);
        const inExp = f.explanation.toLowerCase().includes(q);
        const inCat = (f.category || '').toLowerCase().includes(q);
        return inKey || inExp || inCat;
      }
      return true;
    });
  }, [findings, filterTab, search]);

  return (
    <aside className="w-96 h-full bg-[#1E293B] border-l border-slate-800 flex flex-col select-none shrink-0 overflow-hidden">
      {/* 1. Header Toolbar */}
      <div className="p-3.5 border-b border-slate-800/80 bg-slate-900/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <h2 className="text-xs font-bold text-white tracking-tight uppercase">
              Findings Action Queue
            </h2>
          </div>

          <div className="flex items-center space-x-1.5 font-mono text-[10px]">
            {criticalCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold" title="Critical Findings">
                {criticalCount} Critical
              </span>
            )}
            {majorCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold" title="Major Findings">
                {majorCount} Major
              </span>
            )}
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {findings.length} Total
            </span>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter findings by rule, text, or category..."
            className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Severity / Diff Filter Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto text-[11px] font-medium pt-0.5">
          <button
            onClick={() => setFilterTab('All')}
            className={`px-2 py-1 rounded-md transition-colors ${
              filterTab === 'All'
                ? 'bg-slate-700 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({findings.length})
          </button>

          <button
            onClick={() => setFilterTab('Critical')}
            className={`px-2 py-1 rounded-md transition-colors ${
              filterTab === 'Critical'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Critical ({criticalCount})
          </button>

          <button
            onClick={() => setFilterTab('Major')}
            className={`px-2 py-1 rounded-md transition-colors ${
              filterTab === 'Major'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Major ({majorCount})
          </button>

          <button
            onClick={() => setFilterTab('Minor')}
            className={`px-2 py-1 rounded-md transition-colors ${
              filterTab === 'Minor'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Minor ({minorCount})
          </button>

          {diffsCount > 0 && (
            <button
              onClick={() => setFilterTab('Diffs')}
              className={`px-2 py-1 rounded-md transition-colors ${
                filterTab === 'Diffs'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Diffs ({diffsCount})
            </button>
          )}
        </div>
      </div>

      {/* 2. Scrollable Findings Queue List */}
      <div
        ref={listContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-2.5"
      >
        {filteredFindings.length > 0 ? (
          filteredFindings.map((finding) => (
            <div key={finding.id} data-finding-id={finding.id}>
              <FindingActionCard
                finding={finding}
                isSelected={finding.id === selectedFindingId}
                onSelect={() => onSelectFinding(finding.id)}
                onJumpToEvidence={() => onJumpToEvidence(finding)}
                onUpdateStatus={onUpdateFindingStatus}
              />
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500">
            {findings.length === 0 ? (
              <>
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2" />
                <p className="text-xs font-semibold text-slate-300">Clean Compliance Record</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                  Zero non-compliant findings detected for this evaluation.
                </p>
              </>
            ) : (
              <>
                <Filter className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-xs font-semibold text-slate-300">No matching findings</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Adjust your search keyword or active severity filter tab.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* 3. Footer Summary */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between text-[11px] text-slate-400">
        <span>Assisted Copilot</span>
        <span className="font-mono text-[10px] text-emerald-400">Human-in-the-Loop</span>
      </div>
    </aside>
  );
};
