import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { X, FileCheck2 } from 'lucide-react';
import { Document } from '../../types';
import { DocumentUploadDropzone } from '../documents/DocumentUploadDropzone';
import { DocumentPreviewModal } from '../documents/DocumentPreviewModal';

interface CreateReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId?: string;
}

export const CreateReviewModal: React.FC<CreateReviewModalProps> = ({
  isOpen,
  onClose,
  defaultProjectId,
}) => {
  const { projects, refreshData, setSelectedProjectId, setSelectedReviewId, setCurrentView } = useApp();
  const [projectId, setProjectId] = useState(defaultProjectId || (projects[0]?.id || ''));
  const [name, setName] = useState('');
  const [checklistVersion, setChecklistVersion] = useState('');
  const [checklistOptions, setChecklistOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [baselineDoc, setBaselineDoc] = useState<Document | null>(null);
  const [revisedDoc, setRevisedDoc] = useState<Document | null>(null);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getChecklists().then(async (lists) => {
        const options: Array<{ id: string; label: string }> = [];
        for (const chk of lists) {
          try {
            const detail = await api.getChecklist(chk.id);
            if (detail.versions) {
              for (const v of detail.versions) {
                options.push({
                  id: v.id,
                  label: `${chk.name} (${v.version})`,
                });
              }
            }
          } catch {}
        }
        setChecklistOptions(options);
        if (options.length > 0 && (!checklistVersion || !options.some((o) => o.id === checklistVersion))) {
          setChecklistVersion(options[0].id);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activeProjects = projects.filter((p) => p.status !== 'archived');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !projectId) return;

    setLoading(true);
    setError(null);

    try {
      const review = await api.createReview({
        project_id: projectId,
        name: name.trim(),
        checklist_version_id: checklistVersion,
        baseline_document_id: baselineDoc?.id,
        revised_document_id: revisedDoc?.id,
      });

      // If documents were uploaded before review creation, attach them
      if (baselineDoc && !baselineDoc.review_id) {
        await api.attachDocument(baselineDoc.id, review.id, 'baseline');
      }
      if (revisedDoc && !revisedDoc.review_id) {
        await api.attachDocument(revisedDoc.id, review.id, 'revised');
      }

      await refreshData();
      setSelectedProjectId(projectId);
      setSelectedReviewId(review.id);
      setName('');
      setBaselineDoc(null);
      setRevisedDoc(null);
      onClose();
      setCurrentView('reviews');
    } catch (err: any) {
      setError(err.message || 'Failed to create review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
        <div className="w-full max-w-2xl bg-[#0F172A] border border-slate-700/80 rounded-xl shadow-2xl p-6 my-8">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2.5 text-white font-bold text-base">
              <div className="p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <span>Create Label Review</span>
                <p className="text-[11px] font-normal text-slate-400">
                  Configure review metadata and upload baseline & revised labeling PDFs
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mt-3 p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Target Project *</label>
                <select
                  required
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500"
                >
                  {activeProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Requirements Checklist</label>
                <select
                  value={checklistVersion}
                  onChange={(e) => setChecklistVersion(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500 font-mono text-[11px]"
                >
                  {checklistOptions.length === 0 ? (
                    <option value="">Loading checklists...</option>
                  ) : (
                    checklistOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Review Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Model-X Label Revision Delta (Batch 2026-A)"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Label PDFs Ingestion Dropzones */}
            <div className="pt-2 border-t border-slate-800/80">
              <label className="block text-slate-300 font-semibold mb-2">
                Label Document Ingestion (PyMuPDF Extraction & SHA-256 Provenance)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <span className="block text-[11px] font-medium text-sky-400 mb-1.5">
                    1. Approved Baseline Label (PDF)
                  </span>
                  <DocumentUploadDropzone
                    role="baseline"
                    projectId={projectId}
                    currentDocument={baselineDoc}
                    onDocumentUploaded={(doc) => setBaselineDoc(doc)}
                    onPreviewRequest={(doc) => setPreviewDoc(doc)}
                  />
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-teal-400 mb-1.5">
                    2. Revised Candidate Label (PDF)
                  </span>
                  <DocumentUploadDropzone
                    role="revised"
                    projectId={projectId}
                    currentDocument={revisedDoc}
                    onDocumentUploaded={(doc) => setRevisedDoc(doc)}
                    onPreviewRequest={(doc) => setPreviewDoc(doc)}
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-800/80">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim() || !projectId}
                className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold transition-colors disabled:opacity-50 shadow-md shadow-teal-500/20"
              >
                {loading ? 'Creating Review...' : 'Start Review'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {previewDoc && (
        <DocumentPreviewModal
          document={previewDoc}
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </>
  );
};
