import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Check, Copy, Eye, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import { Document } from '../../types';
import { api } from '../../lib/api';

interface DocumentUploadDropzoneProps {
  role: 'baseline' | 'revised';
  reviewId?: string;
  projectId?: string;
  currentDocument?: Document | null;
  onDocumentUploaded: (document: Document) => void;
  onPreviewRequest?: (document: Document) => void;
}

export const DocumentUploadDropzone: React.FC<DocumentUploadDropzoneProps> = ({
  role,
  reviewId,
  projectId,
  currentDocument,
  onDocumentUploaded,
  onPreviewRequest,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const roleLabel = role === 'baseline' ? 'Approved Baseline Label' : 'Revised Candidate Label';
  const roleColor = role === 'baseline' ? 'text-sky-400 border-sky-500/30 bg-sky-500/10' : 'text-teal-400 border-teal-500/30 bg-teal-500/10';

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleFile = async (file: File) => {
    setError(null);
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Invalid file type. Only .pdf files are accepted.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('File size exceeds the 50MB limit.');
      return;
    }

    try {
      setIsUploading(true);
      const doc = await api.uploadDocument(file, role, reviewId, projectId);
      onDocumentUploaded(doc);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = () => {
    setIsDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  if (currentDocument) {
    return (
      <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-xs text-white truncate">
                  {currentDocument.original_filename}
                </span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono border ${roleColor}`}>
                  {role === 'baseline' ? 'Baseline' : 'Revised'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {formatFileSize(currentDocument.file_size_bytes)} • {currentDocument.page_count} {currentDocument.page_count === 1 ? 'page' : 'pages'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            {onPreviewRequest && (
              <button
                type="button"
                onClick={() => onPreviewRequest(currentDocument)}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 text-[11px] font-medium border border-slate-700 transition-colors"
                title="Inspect Page Previews & Evidence Coordinates"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Replace PDF File"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={onFileSelect}
              className="hidden"
            />
          </div>
        </div>

        {/* SHA-256 Checksum Provenance Badge */}
        <div className="flex items-center justify-between bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800/80 text-[11px]">
          <div className="flex items-center space-x-1.5 font-mono text-slate-400 truncate mr-2">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">SHA-256:</span>
            <span className="truncate text-slate-300" title={currentDocument.sha256}>
              {currentDocument.sha256.slice(0, 10)}...{currentDocument.sha256.slice(-10)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(currentDocument.sha256)}
            className="flex items-center space-x-1 text-[10px] text-slate-400 hover:text-sky-400 transition-colors shrink-0"
          >
            {copiedHash ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Extraction status and warning states */}
        {!currentDocument.has_text_layer && (
          <div className="flex items-start space-x-2 bg-amber-950/40 border border-amber-500/30 text-amber-300 p-2 rounded-lg text-[11px]">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Text Layer Missing:</span> Scanned raster PDF detected (0 text blocks). Rule evaluation requires digital text layer or OCR.
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
          isDragOver
            ? 'border-sky-400 bg-sky-950/20'
            : 'border-slate-700/80 hover:border-slate-600 bg-slate-900/40 hover:bg-slate-900/70'
        } ${isUploading ? 'opacity-70 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={onFileSelect}
          className="hidden"
        />

        {isUploading ? (
          <div className="py-2 flex flex-col items-center justify-center space-y-2">
            <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
            <p className="text-xs text-slate-300 font-medium">
              Computing SHA-256 & extracting text layers...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-1.5">
            <div className="p-2 rounded-full bg-slate-800 text-slate-400 group-hover:text-sky-400">
              <UploadCloud className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">
                Upload {roleLabel}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Drag and drop PDF, or click to browse (up to 50MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-[11px] text-rose-400 font-medium px-1 flex items-center space-x-1">
          <span>•</span>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};
