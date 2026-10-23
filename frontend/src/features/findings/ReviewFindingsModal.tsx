import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  RotateCw,
  Search,
  Filter,
  CheckCircle2,
  ShieldCheck,
  AlertOctagon,
  AlertTriangle,
  Info,
  Loader2,
  Layers,
} from 'lucide-react';
import { Review, Finding, ReviewEvaluationResponse } from '../../types';
import { api } from '../../lib/api';
import { FindingCard } from './FindingCard';

interface ReviewFindingsModalProps {
  review: Review;
  isOpen: boolean;
  onClose: () => void;
  onEvaluationCompleted?: (result: ReviewEvaluationResponse) => void;
}

export const ReviewFindingsModal: React.FC<ReviewFindingsModalProps> = ({
  review,
  isOpen,
  onClose,
  onEvaluationCompleted,
}) => {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Stats
  const [evaluationResult, setEvaluationResult] = useState<ReviewEvaluationResponse | null>(null);

  useEffect(() => {
    if (isOpen && review?.id) {
      loadFindings();
    }
  }, [isOpen, review?.id]);

  const loadFindings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getReviewFindings(review.id);
      setFindings(data);
    } catch (err: any) {
      console.error('Failed to load review findings:', err);
      setError(err.message || 'Failed to load findings');
    } finally {
      setLoading(false);
    }
  };

  const handleRunEvaluation = async () => {
    try {
      setEvaluating(true);
      setError(null);
      const res = await api.evaluateReview(review.id);
      setEvaluationResult(res);
      setFindings(res.findings);
      if (onEvaluationCompleted) {
        onEvaluationCompleted(res);
      }
    } catch (err: any) {
      console.error('Evaluation failed:', err);
      setError(err.message || 'Failed to run deterministic evaluation');
    } finally {
      setEvaluating(false);
    }
  };

  if (!isOpen) return null;

  // Compute metrics
  const totalFindings = findings.length;
  const criticalCount = findings.filter((f) => f.severity === 'Critical').length;
  const majorCount = findings.filter((f) => f.severity === 'Major').length;
  const minorCount = findings.filter((f) => f.severity === 'Minor').length;

  // Filtered findings list
  const filteredFindings = findings.filter((f) => {
    if (severityFilter !== 'all' && f.severity !== severityFilter) {
      return false;
    }
    if (statusFilter !== 'all' && f.status !== statusFilter) {
      return false;
    }
    if (categoryFilter !== 'all' && f.category !== categoryFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchKey = f.rule_key.toLowerCase().includes(q);
      const matchExp = f.explanation.toLowerCase().includes(q);
      const matchExpected = f.expected_value?.toLowerCase().includes(q) || false;
      const matchObserved = f.observed_value?.toLowerCase().includes(q) || false;
      return matchKey || matchExp || matchExpected || matchObserved;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/90">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-semibold text-white tracking-tight">
                Compliance Findings Queue
              </h2>
              <span className="px-2 py-0.5 text-xs font-mono rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                Deterministic Engine
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Review: <span className="text-slate-200 font-medium">{review.name}</span>
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleRunEvaluation}
              disabled={evaluating}
              className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              {evaluating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Evaluating Rules...</span>
                </>
              ) : findings.length > 0 ? (
                <>
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Re-evaluate Review</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Run Evaluation</span>
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
        <div className="bg-indigo-950/30 border-b border-indigo-500/20 px-5 py-2 flex items-center justify-between text-xs text-indigo-200">
          <div className="flex items-center space-x-2">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              100% Offline Rule Execution • Extracted label entities evaluated against checklist standards.
            </span>
          </div>
          {evaluationResult && (
            <span className="font-mono text-[11px] text-indigo-300">
              Evaluated {evaluationResult.total_rules_evaluated} rules • {evaluationResult.rules_passed} passed
            </span>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-5 mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <AlertOctagon className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* KPI Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 border-b border-slate-800/80 bg-slate-800/30">
          <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50 flex flex-col">
            <span className="text-[11px] text-slate-400 font-medium">Total Findings</span>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-xl font-bold text-white">{totalFindings}</span>
              <span className="text-xs text-slate-400">issues</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/20 flex flex-col">
            <div className="flex items-center space-x-1.5 text-[11px] text-rose-400 font-medium">
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>Critical Severity</span>
            </div>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-xl font-bold text-rose-400">{criticalCount}</span>
              <span className="text-xs text-rose-300/70">blocking</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 flex flex-col">
            <div className="flex items-center space-x-1.5 text-[11px] text-amber-400 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Major Severity</span>
            </div>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-xl font-bold text-amber-400">{majorCount}</span>
              <span className="text-xs text-amber-300/70">warnings</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-sky-500/5 border border-sky-500/20 flex flex-col">
            <div className="flex items-center space-x-1.5 text-[11px] text-sky-400 font-medium">
              <Info className="w-3.5 h-3.5" />
              <span>Minor Severity</span>
            </div>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-xl font-bold text-sky-300">{minorCount}</span>
              <span className="text-xs text-sky-300/70">advisories</span>
            </div>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by rule key, explanation, value..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
              <Filter className="w-3.5 h-3.5" />
              <span>Severity:</span>
            </div>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Severities</option>
              <option value="Critical">Critical Only</option>
              <option value="Major">Major Only</option>
              <option value="Minor">Minor Only</option>
            </select>

            <div className="flex items-center space-x-1.5 text-xs text-slate-400 ml-2">
              <span>Status:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Accepted">Accepted</option>
              <option value="Resolved">Resolved</option>
              <option value="Under Investigation">Under Investigation</option>
            </select>

            <div className="flex items-center space-x-1.5 text-xs text-slate-400 ml-2">
              <span>Category:</span>
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Categories</option>
              <option value="Identifiers">Identifiers</option>
              <option value="Dates">Dates</option>
              <option value="Manufacturer">Manufacturer</option>
              <option value="Regulatory">Regulatory</option>
              <option value="Safety">Safety</option>
              <option value="General">General</option>
            </select>
          </div>
        </div>

        {/* Scrollable Findings List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
              <p className="text-sm">Loading findings...</p>
            </div>
          ) : filteredFindings.length > 0 ? (
            filteredFindings.map((finding) => (
              <FindingCard key={finding.id} finding={finding} />
            ))
          ) : findings.length > 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
              <Filter className="w-8 h-8 text-slate-400" />
              <p className="text-sm">No findings match the current filter selection.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSeverityFilter('all');
                  setStatusFilter('all');
                  setCategoryFilter('all');
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-200">
                  No compliance findings generated yet
                </p>
                <p className="text-xs text-slate-400 max-w-sm">
                  Click the <strong>Run Evaluation</strong> button above to evaluate extracted label
                  fields against the active regulatory checklist.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing {filteredFindings.length} of {findings.length} findings
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
