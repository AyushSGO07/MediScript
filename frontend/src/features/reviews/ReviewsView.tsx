import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { CreateReviewModal } from './CreateReviewModal';
import {
  FileCheck2,
  Plus,
  Search,
  ArrowRight,
  FileText,
  GitCompare,
  ShieldAlert,
  AlertOctagon,
  AlertTriangle,
  Play,
} from 'lucide-react';
import { Document, Review } from '../../types';
import { api } from '../../lib/api';
import { DocumentPreviewModal } from '../documents/DocumentPreviewModal';
import { ReviewEntitiesComparisonView } from '../entities/ReviewEntitiesComparisonView';
import { ReviewFindingsModal } from '../findings/ReviewFindingsModal';
import { ReviewDiffModal } from '../diff/ReviewDiffModal';

export const ReviewsView: React.FC = () => {
  const { reviews, projects, selectedProjectId, setSelectedProjectId, setSelectedReviewId, refreshData } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);
  const [comparingReviewId, setComparingReviewId] = useState<string | null>(null);
  const [findingsReview, setFindingsReview] = useState<Review | null>(null);
  const [diffReview, setDiffReview] = useState<Review | null>(null);

  const STATUS_TABS = ['All', 'Draft', 'In Progress', 'Completed', 'Archived'];

  const filtered = reviews.filter((r) => {
    if (selectedProjectId && r.project_id !== selectedProjectId) return false;
    if (statusFilter !== 'All' && r.status !== statusFilter) return false;
    if (search.trim()) {
      return r.name.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  const getProjectName = (projectId: string) => {
    const p = projects.find((proj) => proj.id === projectId);
    return p ? p.name : 'Unknown Project';
  };

  const activeProject = projects.find((p) => p.id === selectedProjectId);

  const openDocumentPreview = async (docId: string) => {
    try {
      setLoadingDocId(docId);
      const doc = await api.getDocument(docId);
      setPreviewDoc(doc);
    } catch (err) {
      console.error('Failed to load document:', err);
    } finally {
      setLoadingDocId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Label Reviews</h2>
            {activeProject && (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-sky-500/15 text-sky-400 border border-sky-500/30">
                Filtered: {activeProject.name}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare approved baseline and revised labeling PDFs against regulatory checklists with PyMuPDF coordinate extraction.
          </p>
        </div>
        <div className="flex items-center space-x-3 self-start sm:self-auto">
          {selectedProjectId && (
            <button
              onClick={() => setSelectedProjectId(null)}
              className="text-xs text-slate-400 hover:text-slate-200 underline"
            >
              Clear Filter
            </button>
          )}
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs shadow-md shadow-teal-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Review</span>
          </button>
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#1E293B] border border-slate-700/60 p-3 rounded-xl text-xs">
        {/* Status Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto w-full md:w-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                statusFilter === tab
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reviews..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Reviews Table */}
      <div className="bg-[#1E293B] border border-slate-700/60 rounded-xl overflow-hidden shadow-sm">
        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-700/60">
                <tr>
                  <th className="py-3 px-4 font-semibold">Review Name</th>
                  <th className="py-3 px-4 font-semibold">Parent Project</th>
                  <th className="py-3 px-4 font-semibold">Label Documents (PDF)</th>
                  <th className="py-3 px-4 font-semibold">Checklist</th>
                  <th className="py-3 px-4 font-semibold">Compliance Findings</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((review) => (
                  <tr key={review.id} className="hover:bg-slate-800/50 transition-colors group">
                    <td className="py-3.5 px-4 font-medium text-slate-200">
                      <div className="flex items-center space-x-2">
                        <FileCheck2 className="w-4 h-4 text-teal-400 shrink-0" />
                        <span className="font-semibold">{review.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {getProjectName(review.project_id)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-1.5">
                        {review.baseline_document_id ? (
                          <button
                            onClick={() => openDocumentPreview(review.baseline_document_id!)}
                            disabled={loadingDocId === review.baseline_document_id}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-sky-500/15 text-sky-300 border border-sky-500/30 hover:bg-sky-500/25 transition-colors"
                            title="Inspect Baseline PDF Preview & Evidence Coordinates"
                          >
                            <FileText className="w-3 h-3 text-sky-400" />
                            <span>Baseline</span>
                          </button>
                        ) : (
                          <span className="text-slate-600 font-mono text-[10px]">—</span>
                        )}

                        {review.revised_document_id ? (
                          <button
                            onClick={() => openDocumentPreview(review.revised_document_id!)}
                            disabled={loadingDocId === review.revised_document_id}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-teal-500/15 text-teal-300 border border-teal-500/30 hover:bg-teal-500/25 transition-colors"
                            title="Inspect Revised PDF Preview & Evidence Coordinates"
                          >
                            <FileText className="w-3 h-3 text-teal-400" />
                            <span>Revised</span>
                          </button>
                        ) : (
                          <span className="text-slate-600 font-mono text-[10px]">—</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {review.checklist_version_id || 'Default'}
                    </td>
                    <td className="py-3.5 px-4">
                      {review.findings_count !== undefined && review.findings_count > 0 ? (
                        <button
                          onClick={() => setFindingsReview(review)}
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                            review.critical_findings_count && review.critical_findings_count > 0
                              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25'
                              : 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
                          }`}
                          title="View Findings Queue"
                        >
                          {review.critical_findings_count && review.critical_findings_count > 0 ? (
                            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          )}
                          <span>
                            {review.findings_count} {review.findings_count === 1 ? 'Finding' : 'Findings'}
                            {review.critical_findings_count ? ` (${review.critical_findings_count} Critical)` : ''}
                          </span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setFindingsReview(review)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition-colors"
                          title="Run Deterministic Evaluation"
                        >
                          <Play className="w-3 h-3 text-indigo-400" />
                          <span>Evaluate</span>
                        </button>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={review.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px] font-mono">
                      {new Date(review.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setFindingsReview(review)}
                          className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700/80 font-medium text-[11px] transition-colors"
                          title="Inspect Findings Queue & Run Evaluation"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Findings</span>
                        </button>
                        {review.baseline_document_id && review.revised_document_id && (
                          <button
                            onClick={() => setDiffReview(review)}
                            className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700/80 font-medium text-[11px] transition-colors"
                            title="Run Deterministic Revision Diff"
                          >
                            <GitCompare className="w-3.5 h-3.5" />
                            <span>Diff</span>
                            {review.diff_count !== undefined && review.diff_count > 0 && (
                              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-teal-500/20 text-teal-300 font-mono">
                                {review.diff_count}
                              </span>
                            )}
                          </button>
                        )}
                        {(review.baseline_document_id || review.revised_document_id) && (
                          <button
                            onClick={() => setComparingReviewId(review.id)}
                            className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 font-medium text-[11px] transition-colors"
                            title="Compare Extracted Entities Side-by-Side"
                          >
                            <GitCompare className="w-3.5 h-3.5" />
                            <span>Entities</span>
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedReviewId(review.id)}
                          className="inline-flex items-center text-teal-400 hover:text-teal-300 font-semibold space-x-1"
                        >
                          <span>Workspace</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400">
            <FileCheck2 className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p className="text-sm font-medium">No reviews match your filter criteria.</p>
            <p className="text-xs text-slate-500 mt-1">
              Create a new review or select another filter tab to view past evaluations.
            </p>
          </div>
        )}
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          document={previewDoc}
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}

      {/* Review Comparative Entity Analysis Modal */}
      {comparingReviewId && (
        <ReviewEntitiesComparisonView
          reviewId={comparingReviewId}
          isOpen={!!comparingReviewId}
          onClose={() => setComparingReviewId(null)}
        />
      )}

      {/* Review Findings & Evaluation Modal */}
      {findingsReview && (
        <ReviewFindingsModal
          review={findingsReview}
          isOpen={!!findingsReview}
          onClose={() => setFindingsReview(null)}
          onEvaluationCompleted={async () => {
            await refreshData();
          }}
        />
      )}

      {/* Review Revision Diff Modal */}
      {diffReview && (
        <ReviewDiffModal
          review={diffReview}
          isOpen={!!diffReview}
          onClose={() => setDiffReview(null)}
          onDiffUpdated={async () => {
            await refreshData();
          }}
        />
      )}

      {/* Create Review Modal */}
      <CreateReviewModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        defaultProjectId={selectedProjectId || undefined}
      />
    </div>
  );
};
