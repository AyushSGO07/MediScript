import React, { useState } from 'react';
import {
  Copy,
  Check,
  ShieldCheck,
  Eye,
  EyeOff,
  Layers,
} from 'lucide-react';
import { DocumentDetail, Finding, DiffItem } from '../../types';
import { WorkspaceLayers } from './useReviewWorkspace';

interface ReviewNavigationPanelProps {
  activeRole: 'revised' | 'baseline';
  activeDocument: DocumentDetail | null;
  activePage: number;
  totalPages: number;
  findings: Finding[];
  diffItems: DiffItem[];
  activeLayers: WorkspaceLayers;
  onPageChange: (page: number) => void;
  onToggleLayer: (layer: keyof WorkspaceLayers) => void;
}

export const ReviewNavigationPanel: React.FC<ReviewNavigationPanelProps> = ({
  activeRole,
  activeDocument,
  activePage,
  totalPages,
  findings,
  diffItems,
  activeLayers,
  onPageChange,
  onToggleLayer,
}) => {
  const [copiedHash, setCopiedHash] = useState(false);

  const handleCopyHash = () => {
    if (activeDocument?.sha256) {
      navigator.clipboard.writeText(activeDocument.sha256);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  // Compute page density counts
  const pageList = Array.from({ length: Math.max(1, totalPages) }, (_, i) => i + 1);

  return (
    <aside className="w-72 h-full bg-[#1E293B] border-r border-slate-800 flex flex-col select-none shrink-0 overflow-hidden">
      {/* Document Integrity Card */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/40 space-y-2.5">
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase ${
              activeRole === 'revised'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
            }`}
          >
            {activeRole === 'revised' ? 'Revised Document' : 'Baseline Document'}
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            {activeDocument?.page_count || 1} {activeDocument?.page_count === 1 ? 'Page' : 'Pages'}
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-200 truncate" title={activeDocument?.filename}>
            {activeDocument?.filename || 'No document attached'}
          </p>

          {activeDocument?.sha256 && (
            <div className="flex items-center justify-between text-[10px] font-mono bg-slate-950/60 px-2 py-1 rounded border border-slate-800 text-slate-400">
              <span className="truncate max-w-[170px]" title={activeDocument.sha256}>
                SHA-256: {activeDocument.sha256.substring(0, 8)}...{activeDocument.sha256.substring(activeDocument.sha256.length - 6)}
              </span>
              <button
                onClick={handleCopyHash}
                className="text-slate-400 hover:text-white transition-colors"
                title="Copy SHA-256 fingerprint"
              >
                {copiedHash ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Layer Visibility Toggles */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-800/20 space-y-1.5">
        <div className="flex items-center space-x-1.5 text-[11px] font-medium text-slate-400">
          <Layers className="w-3 h-3 text-slate-500" />
          <span>Active Overlays</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-[10px]">
          <button
            onClick={() => onToggleLayer('findings')}
            className={`py-1 px-1.5 rounded border font-medium flex items-center justify-center space-x-1 transition-colors ${
              activeLayers.findings
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                : 'bg-slate-800/40 text-slate-500 border-slate-800'
            }`}
          >
            {activeLayers.findings ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
            <span>Findings</span>
          </button>

          <button
            onClick={() => onToggleLayer('entities')}
            className={`py-1 px-1.5 rounded border font-medium flex items-center justify-center space-x-1 transition-colors ${
              activeLayers.entities
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-800/40 text-slate-500 border-slate-800'
            }`}
          >
            {activeLayers.entities ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
            <span>Entities</span>
          </button>

          <button
            onClick={() => onToggleLayer('diffs')}
            className={`py-1 px-1.5 rounded border font-medium flex items-center justify-center space-x-1 transition-colors ${
              activeLayers.diffs
                ? 'bg-teal-500/15 text-teal-300 border-teal-500/30'
                : 'bg-slate-800/40 text-slate-500 border-slate-800'
            }`}
          >
            {activeLayers.diffs ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
            <span>Diffs</span>
          </button>
        </div>
      </div>

      {/* Page Navigation & Density List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 px-1">
          Document Pages
        </span>

        <div className="space-y-1.5">
          {pageList.map((pageNum) => {
            const isSelected = pageNum === activePage;

            // Density count on this page
            const pageCriticals = findings.filter(
              (f) =>
                f.severity === 'Critical' &&
                (f.page_number === pageNum || (!f.page_number && pageNum === 1)) &&
                (f.document_role === activeRole || (!f.document_role && activeRole === 'revised'))
            ).length;

            const pageMajors = findings.filter(
              (f) =>
                f.severity === 'Major' &&
                (f.page_number === pageNum || (!f.page_number && pageNum === 1)) &&
                (f.document_role === activeRole || (!f.document_role && activeRole === 'revised'))
            ).length;

            const pageDiffCount = diffItems.filter((d) =>
              activeRole === 'revised' ? d.revised_page === pageNum : d.baseline_page === pageNum
            ).length;

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-slate-800 border-teal-500/80 text-white shadow-sm ring-1 ring-teal-500/30'
                    : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-7 h-7 rounded flex items-center justify-center text-xs font-mono font-semibold ${
                      isSelected
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                        : 'bg-slate-900/60 text-slate-400 border border-slate-700/60'
                    }`}
                  >
                    {pageNum}
                  </div>
                  <div>
                    <span className="text-xs font-medium">Page {pageNum}</span>
                    <p className="text-[10px] text-slate-400">
                      {pageCriticals + pageMajors === 0 && pageDiffCount === 0
                        ? 'Clean'
                        : `${pageCriticals + pageMajors} issues`}
                    </p>
                  </div>
                </div>

                {/* Density Badges */}
                <div className="flex items-center space-x-1">
                  {pageCriticals > 0 && (
                    <span
                      className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[9px] font-mono flex items-center justify-center font-bold"
                      title={`${pageCriticals} Critical Findings`}
                    >
                      {pageCriticals}
                    </span>
                  )}
                  {pageMajors > 0 && (
                    <span
                      className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[9px] font-mono flex items-center justify-center font-bold"
                      title={`${pageMajors} Major Findings`}
                    >
                      {pageMajors}
                    </span>
                  )}
                  {pageDiffCount > 0 && (
                    <span
                      className="w-4 h-4 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 text-[9px] font-mono flex items-center justify-center font-bold"
                      title={`${pageDiffCount} Revision Differences`}
                    >
                      {pageDiffCount}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center space-x-1">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
          <span>Verified Layout</span>
        </div>
        <span className="font-mono text-[10px]">PyMuPDF 2.0</span>
      </div>
    </aside>
  );
};
