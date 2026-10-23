import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  FileText,
  AlertTriangle,
  Layers,
  Loader2,
  Hash,
  Eye,
} from 'lucide-react';
import { Document, PageText, TextBlock, ExtractedField } from '../../types';
import { api } from '../../lib/api';
import { BoundingBoxOverlay } from './BoundingBoxOverlay';
import { ExtractedFieldsTable } from '../entities/ExtractedFieldsTable';

interface DocumentPreviewModalProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'entities'>('preview');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [pageData, setPageData] = useState<PageText | null>(null);
  const [blocks, setBlocks] = useState<TextBlock[]>([]);
  const [fields, setFields] = useState<ExtractedField[]>([]);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (isOpen && document) {
      setCurrentPage(1);
      setActiveTab('preview');
      loadFields();
    }
  }, [isOpen, document?.id]);

  const loadFields = async () => {
    if (!document) return;
    try {
      const f = await api.getDocumentFields(document.id);
      setFields(f);
    } catch (err) {
      console.error('Failed to load fields:', err);
    }
  };

  useEffect(() => {
    if (!isOpen || !document || activeTab !== 'preview') return;

    let isCurrent = true;
    const fetchPageInfo = async () => {
      try {
        setLoading(true);
        const data = await api.getPageDetails(document.id, currentPage);
        if (isCurrent) {
          setPageData(data.page);
          setBlocks(data.blocks);
        }
      } catch (err) {
        console.error('Failed to load page details:', err);
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    fetchPageInfo();
    return () => {
      isCurrent = false;
    };
  }, [isOpen, document?.id, currentPage, activeTab]);

  const updateDimensions = () => {
    if (imgRef.current) {
      setImageDimensions({
        width: imgRef.current.clientWidth,
        height: imgRef.current.clientHeight,
      });
    }
  };

  useEffect(() => {
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  if (!isOpen || !document) return null;

  const totalPages = Math.max(1, document.page_count);

  const copyHash = () => {
    navigator.clipboard.writeText(document.sha256);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const roleLabel = document.role === 'baseline' ? 'Approved Baseline Label' : 'Revised Candidate Label';
  const roleColor =
    document.role === 'baseline'
      ? 'text-sky-400 border-sky-500/30 bg-sky-500/10'
      : 'text-teal-400 border-teal-500/30 bg-teal-500/10';

  const handleInspectFieldEvidence = (field: ExtractedField) => {
    if (field.evidence_page) {
      setCurrentPage(field.evidence_page);
    }
    setShowBoundingBoxes(true);
    setActiveTab('preview');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#0F172A] border border-slate-700/80 rounded-xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-700/80 bg-slate-900/90 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm text-white truncate">{document.original_filename}</h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${roleColor}`}>
                  {roleLabel}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5 font-mono">
                <span className="text-slate-500">SHA-256:</span>
                <span className="truncate max-w-[280px] sm:max-w-md text-slate-300">
                  {document.sha256}
                </span>
                <button
                  onClick={copyHash}
                  className="hover:text-sky-400 p-0.5 transition-colors shrink-0"
                  title="Copy Full SHA-256 Hash"
                >
                  {copiedHash ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* View Mode Tab Switcher */}
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-md font-medium transition-colors ${
                  activeTab === 'preview'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-sky-400" />
                <span>Page Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('entities')}
                className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-md font-medium transition-colors ${
                  activeTab === 'entities'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Hash className="w-3.5 h-3.5 text-teal-400" />
                <span>Extracted Entities ({fields.length})</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Warning Banner if Text Layer is Missing (Scanned PDF) */}
        {!document.has_text_layer && (
          <div className="px-5 py-2.5 bg-amber-950/50 border-b border-amber-500/40 text-amber-200 flex items-center space-x-3 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Text Layer Missing / Scanned Raster PDF:</strong> PyMuPDF detected 0 digital text
              blocks. Automated checklist rules and entity extraction require digital text layers or OCR.
            </span>
          </div>
        )}

        {/* Tab 1: Visual Document Canvas */}
        {activeTab === 'preview' ? (
          <>
            <div className="flex-1 min-h-[460px] overflow-auto bg-slate-950/90 p-4 flex items-center justify-center relative select-none">
              {loading && (
                <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] z-20 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
                </div>
              )}

              <div className="relative inline-block shadow-2xl border border-slate-800 rounded bg-white max-w-full">
                <img
                  ref={imgRef}
                  src={api.getPagePreviewUrl(document.id, currentPage, 150)}
                  alt={`Page ${currentPage}`}
                  onLoad={updateDimensions}
                  className="max-h-[60vh] max-w-full object-contain block mx-auto"
                />
                {document.has_text_layer && (
                  <BoundingBoxOverlay
                    blocks={blocks}
                    containerWidth={imageDimensions.width}
                    containerHeight={imageDimensions.height}
                    visible={showBoundingBoxes}
                  />
                )}
              </div>
            </div>

            {/* Footer & Controls */}
            <div className="px-5 py-3 border-t border-slate-700/80 bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-slate-200 border border-slate-700 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono text-slate-300 px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-slate-200 border border-slate-700 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {document.has_text_layer ? (
                <label className="flex items-center space-x-2 text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showBoundingBoxes}
                    onChange={(e) => setShowBoundingBoxes(e.target.checked)}
                    className="rounded border-slate-700 text-sky-500 focus:ring-sky-500 bg-slate-950"
                  />
                  <span className="flex items-center space-x-1.5 text-xs">
                    <Layers className="w-3.5 h-3.5 text-sky-400" />
                    <span>Show Text Bounding Boxes ({blocks.length} blocks)</span>
                  </span>
                </label>
              ) : (
                <span className="text-slate-500 text-[11px] italic">No bounding boxes (scanned image)</span>
              )}

              {pageData && (
                <div className="text-[11px] font-mono text-slate-400">
                  <span>{pageData.char_count} chars</span>
                  <span className="mx-1.5">•</span>
                  <span>{pageData.word_count} words</span>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Tab 2: Extracted Label Entities */
          <div className="flex-1 overflow-auto p-5 bg-slate-950">
            <ExtractedFieldsTable
              fields={fields}
              onInspectEvidence={handleInspectFieldEvidence}
              onFieldUpdated={loadFields}
            />
          </div>
        )}
      </div>
    </div>
  );
};
