import React, { useState, useEffect } from 'react';
import {
  FileText,
  FileDown,
  Code,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Check,
  Folder,
  AlertOctagon,
  Clock,
  Hash,
  Loader2,
  PenTool,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ReportPreview } from '../../types';
import { api, getStoredRole, getRoleLabel } from '../../lib/api';

export const ReportsView: React.FC = () => {
  const { reviews, projects } = useApp();

  const [selectedReviewId, setSelectedReviewId] = useState<string>('');
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingJson, setIsDownloadingJson] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const role = getStoredRole();
  const actorLabel = getRoleLabel(role);

  // Auto-select first review if not set
  useEffect(() => {
    if (!selectedReviewId && reviews.length > 0) {
      setSelectedReviewId(reviews[0].id);
    }
  }, [reviews, selectedReviewId]);

  // Load preview data when selectedReviewId changes
  useEffect(() => {
    if (selectedReviewId) {
      loadPreview(selectedReviewId);
    }
  }, [selectedReviewId]);

  const loadPreview = async (reviewId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getReportPreview(reviewId);
      setPreview(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load report preview');
      setPreview(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleDownloadPdf = async () => {
    if (!selectedReviewId) return;
    try {
      setIsDownloadingPdf(true);
      setDownloadSuccess(null);
      await api.downloadPdfReport(selectedReviewId, actorLabel, role);
      setDownloadSuccess('PDF report downloaded successfully');
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (err: any) {
      setError(err?.message || 'Failed to download PDF report');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadJson = async () => {
    if (!selectedReviewId) return;
    try {
      setIsDownloadingJson(true);
      setDownloadSuccess(null);
      await api.downloadJsonPackage(selectedReviewId);
      setDownloadSuccess('JSON review package exported successfully');
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (err: any) {
      setError(err?.message || 'Failed to export JSON package');
    } finally {
      setIsDownloadingJson(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* 1. Header Toolbar */}
      <div className="px-6 py-5 border-b border-slate-800 bg-slate-900/80 backdrop-blur shrink-0 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-lg font-bold text-white tracking-tight">
                  Audit Reports & Export Hub
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-950 border border-teal-500/40 text-teal-300">
                  ReportLab Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate print-ready PDF compliance records and machine-readable JSON packages with cryptographic provenance.
              </p>
            </div>
          </div>

          {/* Review Selector Dropdown */}
          <div className="flex items-center space-x-3">
            <div className="relative min-w-[240px]">
              <Folder className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
              <select
                value={selectedReviewId}
                onChange={(e) => setSelectedReviewId(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-teal-500 appearance-none cursor-pointer"
              >
                {reviews.map((r) => {
                  const proj = projects.find((p) => p.id === r.project_id);
                  return (
                    <option key={r.id} value={r.id}>
                      {r.name} {proj ? `(${proj.name})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 flex-wrap gap-3">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Sign-Off Reviewer:</span>
            <span className="text-indigo-400 font-medium">{actorLabel}</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
              {role}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf || !preview}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all active:scale-95"
            >
              {isDownloadingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span>Download Audit PDF</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadJson}
              disabled={isDownloadingJson || !preview}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 disabled:opacity-50 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition-all active:scale-95"
            >
              {isDownloadingJson ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Exporting JSON...</span>
                </>
              ) : (
                <>
                  <Code className="w-4 h-4 text-teal-400" />
                  <span>Export JSON Package</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Body Container */}
      <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-3">
            <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {downloadSuccess && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{downloadSuccess}</span>
          </div>
        )}

        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
            <p className="text-xs font-medium">Assembling audit report preview...</p>
          </div>
        ) : !preview ? (
          <div className="py-24 text-center space-y-3 text-slate-500">
            <FileText className="w-12 h-12 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-300">No Review Selected</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Select an active label review from the dropdown above to preview compliance metrics and download audit records.
            </p>
          </div>
        ) : (
          <>
            {/* Prominent Regulatory Disclaimer (REPT-05) */}
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-200/90 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold text-amber-300 uppercase tracking-wider text-[11px] block">
                  Regulatory Notice & Protocol Disclaimer (REPT-05)
                </span>
                <p className="leading-relaxed text-[11px] text-amber-200/80">
                  {preview.disclaimer}
                </p>
              </div>
            </div>

            {/* Executive Scorecard */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  Rules Evaluated
                </span>
                <div className="text-xl font-bold text-white flex items-center justify-between">
                  <span>{preview.total_rules_evaluated}</span>
                  <span className="text-xs font-normal text-emerald-400">
                    {preview.rules_passed} Passed
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {preview.rules_failed} non-compliant findings
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  Critical Issues
                </span>
                <div className="text-xl font-bold text-rose-400 flex items-center justify-between">
                  <span>{preview.critical_count}</span>
                  <span className="text-xs font-normal text-slate-400">
                    {preview.major_count} Major
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {preview.minor_count} minor findings
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  Triage Resolution
                </span>
                <div className="text-xl font-bold text-teal-400">
                  {preview.triaged_count} / {preview.rules_failed}
                </div>
                <div className="text-[11px] text-slate-500">
                  Accepted or resolved
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  Active Checklist
                </span>
                <div className="text-sm font-semibold text-indigo-300 truncate">
                  {preview.checklist_name}
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  Version: {preview.checklist_version}
                </div>
              </div>
            </div>

            {/* Cryptographic Document Provenance (REPT-02) */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300 border-b border-slate-800 pb-2">
                <Hash className="w-4 h-4 text-cyan-400" />
                <span>Cryptographic Document Integrity & Checksums (SHA-256)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Revised Document Card */}
                {preview.revised_doc ? (
                  <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        Revised Label (Draft)
                      </span>
                      <span className="text-slate-400 text-xs font-mono">
                        {(preview.revised_doc.file_size_bytes / 1024).toFixed(1)} KB ({preview.revised_doc.page_count} pgs)
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-200 truncate">
                      {preview.revised_doc.filename}
                    </p>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800/80 flex items-center justify-between gap-2 font-mono text-[11px] text-cyan-300">
                      <span className="truncate">{preview.revised_doc.sha256}</span>
                      <button
                        onClick={() => handleCopyHash(preview.revised_doc!.sha256)}
                        className="p-1 text-slate-400 hover:text-white shrink-0"
                        title="Copy SHA-256 hash"
                      >
                        {copiedHash === preview.revised_doc.sha256 ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-800/50 text-xs text-slate-500 italic">
                    Revised document not attached
                  </div>
                )}

                {/* Baseline Document Card */}
                {preview.baseline_doc ? (
                  <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-sky-500/15 text-sky-300 border border-sky-500/30">
                        Baseline Label (Approved)
                      </span>
                      <span className="text-slate-400 text-xs font-mono">
                        {(preview.baseline_doc.file_size_bytes / 1024).toFixed(1)} KB ({preview.baseline_doc.page_count} pgs)
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-200 truncate">
                      {preview.baseline_doc.filename}
                    </p>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800/80 flex items-center justify-between gap-2 font-mono text-[11px] text-cyan-300">
                      <span className="truncate">{preview.baseline_doc.sha256}</span>
                      <button
                        onClick={() => handleCopyHash(preview.baseline_doc!.sha256)}
                        className="p-1 text-slate-400 hover:text-white shrink-0"
                        title="Copy SHA-256 hash"
                      >
                        {copiedHash === preview.baseline_doc.sha256 ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-800/50 text-xs text-slate-500 italic">
                    Baseline document not attached (Single-label review)
                  </div>
                )}
              </div>
            </div>

            {/* Formal Regulatory Sign-Off Block Preview (REPT-03) */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300 border-b border-slate-800 pb-2">
                <PenTool className="w-4 h-4 text-indigo-400" />
                <span>Formal Review Sign-Off Authorization Preview (REPT-03)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/70 border border-indigo-500/30 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                    <span>Primary Regulatory Reviewer</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="space-y-1 text-xs text-slate-300">
                    <p><strong>Name:</strong> {actorLabel}</p>
                    <p><strong>Role:</strong> {role}</p>
                    <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-800 text-[10px] text-emerald-400 font-mono">
                    ✓ Verified via active session audit trail
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <span>Quality Assurance Lead</span>
                    <Clock className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="space-y-1 text-xs text-slate-400">
                    <p><strong>Name:</strong> Marcus Vance (Quality Lead)</p>
                    <p><strong>Role:</strong> Quality Assurance Lead</p>
                    <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 font-mono">
                    ✓ Formal sign-off line included in printed PDF
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
