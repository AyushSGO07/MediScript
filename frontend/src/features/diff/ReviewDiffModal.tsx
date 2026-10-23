import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  RotateCw,
  Search,
  Filter,
  CheckCircle2,
  GitCompare,
  PlusCircle,
  MinusCircle,
  Edit3,
  Flag,
  Loader2,
  FileText,
  Layers,
} from 'lucide-react';
import { Review, DiffItem, DiffSummaryResponse, Finding } from '../../types';
import { api } from '../../lib/api';
import { DiffItemCard } from './DiffItemCard';
import { PromoteDiffModal } from './PromoteDiffModal';

interface ReviewDiffModalProps {
  review: Review;
  isOpen: boolean;
  onClose: () => void;
  onDiffUpdated?: (summary: DiffSummaryResponse) => void;
}

export const ReviewDiffModal: React.FC<ReviewDiffModalProps> = ({
  review,
  isOpen,
  onClose,
  onDiffUpdated,
}) => {
  const [diffItems, setDiffItems] = useState<DiffItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [runningDiff, setRunningDiff] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [pageFilter, setPageFilter] = useState<string>('all');

  // Promotion Dialog State
  const [promoteItem, setPromoteItem] = useState<DiffItem | null>(null);

  useEffect(() => {
    if (isOpen && review?.id) {
      loadDiffItems();
    }
  }, [isOpen, review?.id]);

  const loadDiffItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getReviewDiff(review.id);
      setDiffItems(data);
    } catch (err: any) {
      console.error('Failed to load review diff items:', err);
      setError(err.message || 'Failed to load diff items');
    } finally {
      setLoading(false);
    }
  };

  const handleRunDiff = async () => {
    try {
      setRunningDiff(true);
      setError(null);
      const res = await api.generateReviewDiff(review.id);
      setDiffItems(res.diff_items);
      if (onDiffUpdated) {
        onDiffUpdated(res);
      }
    } catch (err: any) {
      console.error('Diff generation failed:', err);
      setError(err.message || 'Failed to run revision diff comparison');
    } finally {
      setRunningDiff(false);
    }
  };

  const handleDiffPromoted = (_finding: Finding, updatedDiff: DiffItem) => {
    setDiffItems((prev) =>
      prev.map((item) => (item.id === updatedDiff.id ? updatedDiff : item))
    );
  };

  if (!isOpen) return null;

  // Counts
  const totalChanges = diffItems.length;
  const addedCount = diffItems.filter((d) => d.change_type === 'ADDED').length;
  const deletedCount = diffItems.filter((d) => d.change_type === 'DELETED').length;
  const modifiedCount = diffItems.filter((d) => d.change_type === 'MODIFIED').length;
  const promotedCount = diffItems.filter((d) => d.is_promoted).length;

  // Filter items
  const filtered = diffItems.filter((item) => {
    if (typeFilter !== 'all' && item.change_type !== typeFilter) {
      return false;
    }
    if (categoryFilter !== 'all' && item.category !== categoryFilter) {
      return false;
    }
    if (pageFilter !== 'all') {
      const p = parseInt(pageFilter, 10);
      if (item.baseline_page !== p && item.revised_page !== p) {
        return false;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchBase = item.baseline_text?.toLowerCase().includes(q) || false;
      const matchRev = item.revised_text?.toLowerCase().includes(q) || false;
      const matchCat = item.category?.toLowerCase().includes(q) || false;
      return matchBase || matchRev || matchCat;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/90">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <GitCompare className="w-5 h-5 text-teal-400" />
              <h2 className="text-lg font-semibold text-white tracking-tight">
                Deterministic Revision Diff
              </h2>
              <span className="px-2 py-0.5 text-xs font-mono rounded bg-teal-500/10 text-teal-300 border border-teal-500/20">
                Word & Block Sequences
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Review: <span className="text-slate-200 font-medium">{review.name}</span>
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleRunDiff}
              disabled={runningDiff}
              className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-sm shadow-teal-500/20 transition-all disabled:opacity-50"
            >
              {runningDiff ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Comparing Documents...</span>
                </>
              ) : diffItems.length > 0 ? (
                <>
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Re-run Revision Diff</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Run Revision Diff</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notice Bar */}
        <div className="bg-teal-950/25 border-b border-teal-500/20 px-5 py-2 flex items-center justify-between text-xs text-teal-200">
          <div className="flex items-center space-x-2">
            <Layers className="w-3.5 h-3.5 text-teal-400" />
            <span>
              100% Deterministic Text Diff • SequenceMatcher with whitespace normalization and bounding box alignment.
            </span>
          </div>
          <div className="flex items-center space-x-3 font-mono text-[11px] text-teal-300">
            <span className="flex items-center space-x-1">
              <FileText className="w-3 h-3 text-sky-400" />
              <span>Base PDF Attached</span>
            </span>
            <span className="flex items-center space-x-1">
              <FileText className="w-3 h-3 text-purple-400" />
              <span>Rev PDF Attached</span>
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-5 mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* KPI Summary Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-5 border-b border-slate-800/80 bg-slate-800/30">
          <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50 flex flex-col">
            <span className="text-[11px] text-slate-400 font-medium">Total Differences</span>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-xl font-bold text-white">{totalChanges}</span>
              <span className="text-xs text-slate-400">changes</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex flex-col">
            <div className="flex items-center space-x-1.5 text-[11px] text-emerald-400 font-medium">
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Additions</span>
            </div>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-xl font-bold text-emerald-400">{addedCount}</span>
              <span className="text-xs text-emerald-300/70">added</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/20 flex flex-col">
            <div className="flex items-center space-x-1.5 text-[11px] text-rose-400 font-medium">
              <MinusCircle className="w-3.5 h-3.5" />
              <span>Deletions</span>
            </div>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-xl font-bold text-rose-400">{deletedCount}</span>
              <span className="text-xs text-rose-300/70">removed</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 flex flex-col">
            <div className="flex items-center space-x-1.5 text-[11px] text-amber-400 font-medium">
              <Edit3 className="w-3.5 h-3.5" />
              <span>Modifications</span>
            </div>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-xl font-bold text-amber-400">{modifiedCount}</span>
              <span className="text-xs text-amber-300/70">altered</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20 flex flex-col">
            <div className="flex items-center space-x-1.5 text-[11px] text-indigo-400 font-medium">
              <Flag className="w-3.5 h-3.5" />
              <span>Promoted Findings</span>
            </div>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-xl font-bold text-indigo-400">{promotedCount}</span>
              <span className="text-xs text-indigo-300/70">findings</span>
            </div>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search changed words or categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
              <Filter className="w-3.5 h-3.5" />
              <span>Type:</span>
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              <option value="all">All Types</option>
              <option value="MODIFIED">Modified Only</option>
              <option value="ADDED">Added Only</option>
              <option value="DELETED">Deleted Only</option>
            </select>

            <div className="flex items-center space-x-1.5 text-xs text-slate-400 ml-2">
              <span>Category:</span>
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              <option value="all">All Categories</option>
              <option value="Safety">Safety</option>
              <option value="Identifiers">Identifiers</option>
              <option value="Dates">Dates</option>
              <option value="Regulatory">Regulatory</option>
              <option value="Manufacturer">Manufacturer</option>
              <option value="General">General</option>
            </select>

            <div className="flex items-center space-x-1.5 text-xs text-slate-400 ml-2">
              <span>Page:</span>
            </div>
            <select
              value={pageFilter}
              onChange={(e) => setPageFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              <option value="all">All Pages</option>
              <option value="1">Page 1</option>
              <option value="2">Page 2</option>
              <option value="3">Page 3</option>
            </select>
          </div>
        </div>

        {/* Scrollable Diff List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
              <p className="text-sm">Loading revision diff items...</p>
            </div>
          ) : filtered.length > 0 ? (
            filtered.map((item) => (
              <DiffItemCard
                key={item.id}
                diffItem={item}
                onPromote={(it) => setPromoteItem(it)}
              />
            ))
          ) : diffItems.length > 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
              <Filter className="w-8 h-8 text-slate-400" />
              <p className="text-sm">No revision differences match the current filter selection.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setTypeFilter('all');
                  setCategoryFilter('all');
                  setPageFilter('all');
                }}
                className="text-xs text-teal-400 hover:text-teal-300 font-medium"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                <CheckCircle2 className="w-6 h-6 text-teal-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-200">
                  No revision diff generated yet
                </p>
                <p className="text-xs text-slate-400 max-w-sm">
                  Click the <strong>Run Revision Diff</strong> button above to perform deterministic
                  sequence matching between baseline and revised PDF labels.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing {filtered.length} of {diffItems.length} revision changes
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Promotion Modal */}
      {promoteItem && (
        <PromoteDiffModal
          reviewId={review.id}
          diffItem={promoteItem}
          isOpen={!!promoteItem}
          onClose={() => setPromoteItem(null)}
          onPromoted={handleDiffPromoted}
        />
      )}
    </div>
  );
};
