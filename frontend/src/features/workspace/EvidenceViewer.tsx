import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Move,
  FileQuestion,
  Loader2,
} from 'lucide-react';
import { DocumentDetail } from '../../types';
import { api } from '../../lib/api';

interface EvidenceViewerProps {
  document: DocumentDetail | null;
  role: 'revised' | 'baseline';
  pageNumber: number;
  totalPages: number;
  zoom: number;
  pan: { x: number; y: number };
  onPageChange: (page: number) => void;
  onZoomChange: (zoom: number | ((prev: number) => number)) => void;
  onPanChange: (pan: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
  onResetZoomAndPan: () => void;
  searchBarSlot?: React.ReactNode;
  children?: React.ReactNode;
  // Dual/Split view support
  viewMode?: 'single' | 'split';
  baselineDocument?: DocumentDetail | null;
  revisedDocument?: DocumentDetail | null;
  baselineChildren?: React.ReactNode;
  revisedChildren?: React.ReactNode;
}

export const EvidenceViewer: React.FC<EvidenceViewerProps> = ({
  document,
  role,
  pageNumber,
  totalPages,
  zoom,
  pan,
  onPageChange,
  onZoomChange,
  onPanChange,
  onResetZoomAndPan,
  searchBarSlot,
  children,
  viewMode = 'single',
  baselineDocument,
  revisedDocument,
  baselineChildren,
  revisedChildren,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [pageInput, setPageInput] = useState(pageNumber.toString());

  // Synchronize local page input with active page
  useEffect(() => {
    setPageInput(pageNumber.toString());
    setImgLoaded(false);
    setImgError(false);
  }, [pageNumber, document?.id, role, viewMode]);

  // Handle Mouse Drag Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag with left mouse click (button 0)
    if (e.button !== 0) return;
    setIsPanning(true);
    setDragStart({
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      onPanChange({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isPanning, dragStart, onPanChange]
  );

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Wheel zoom (Ctrl + Wheel or standard wheel zoom)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.15 : -0.15;
    onZoomChange((prev) => Math.min(3.0, Math.max(0.5, Math.round((prev + zoomFactor) * 100) / 100)));
  };

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      onPageChange(p);
    } else {
      setPageInput(pageNumber.toString());
    }
  };

  // Preset zoom values
  const handleZoomPreset = (val: number) => {
    onZoomChange(val);
  };

  const renderSingleCanvas = (
    doc: DocumentDetail | null,
    docRole: 'revised' | 'baseline',
    childSlot: React.ReactNode
  ) => {
    if (!doc) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500">
          <FileQuestion className="w-12 h-12 mb-3 text-slate-600" />
          <p className="text-sm font-medium text-slate-400">
            No {docRole === 'revised' ? 'Revised' : 'Baseline'} PDF Attached
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-xs text-center">
            Upload a {docRole} document to inspect evidence and run verification rules.
          </p>
        </div>
      );
    }

    const previewUrl = api.getPagePreviewUrl(doc.id, pageNumber, 200);

    return (
      <div
        className="w-full h-full relative flex items-center justify-center select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: isPanning ? 'grabbing' : 'grab',
        }}
      >
        {/* Hardware-accelerated transformation canvas */}
        <div
          className="relative transition-transform duration-75 ease-out shadow-2xl rounded-sm will-change-transform"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          {/* Loading indicator */}
          {!imgLoaded && !imgError && (
            <div className="absolute inset-0 min-w-[500px] min-h-[650px] bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center space-y-2 z-10 text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin text-teal-400" />
              <span className="text-xs font-mono">Rendering Page {pageNumber}...</span>
            </div>
          )}

          {imgError ? (
            <div className="w-[500px] h-[650px] bg-slate-900 border border-slate-800 rounded flex flex-col items-center justify-center p-6 text-center text-slate-400">
              <AlertTriangle className="w-8 h-8 text-rose-400 mb-2" />
              <p className="text-sm font-semibold text-rose-300">Failed to render page preview</p>
              <p className="text-xs text-slate-500 mt-1">
                Unable to generate PNG render for Page {pageNumber}. Check PyMuPDF engine logs.
              </p>
            </div>
          ) : (
            <>
              {/* Document Page Image */}
              <img
                src={previewUrl}
                alt={`${doc.filename} - Page ${pageNumber}`}
                className="max-w-none block select-none pointer-events-none rounded shadow-2xl bg-white"
                onLoad={() => setImgLoaded(true)}
                onError={() => {
                  setImgLoaded(true);
                  setImgError(true);
                }}
                draggable={false}
              />

              {/* Resolution-independent SVG Overlay Layer */}
              {imgLoaded && childSlot}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col min-w-0 h-full bg-[#0B0F17] relative overflow-hidden select-none"
      onWheel={handleWheel}
    >
      {/* 1. Evidence Canvas Toolbar */}
      <div className="h-12 px-4 bg-slate-900/90 backdrop-blur-sm border-b border-slate-800 flex items-center justify-between gap-3 shrink-0 z-20">
        {/* Left: Page Navigation */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-slate-800/80 rounded-lg border border-slate-700/80 p-0.5 text-xs text-slate-300">
            <button
              onClick={() => onPageChange(Math.max(1, pageNumber - 1))}
              disabled={pageNumber <= 1}
              className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <form onSubmit={handlePageSubmit} className="flex items-center px-1 font-mono text-[11px]">
              <span>Page</span>
              <input
                type="text"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onBlur={handlePageSubmit}
                className="w-8 mx-1 text-center bg-slate-900 border border-slate-700 rounded py-0.5 text-white font-semibold focus:outline-none focus:border-teal-500"
              />
              <span className="text-slate-400">of {totalPages}</span>
            </form>

            <button
              onClick={() => onPageChange(Math.min(totalPages, pageNumber + 1))}
              disabled={pageNumber >= totalPages}
              className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Active Document Role Badge */}
          {viewMode === 'single' && (
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border ${
                role === 'revised'
                  ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                  : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
              }`}
            >
              {role === 'revised' ? 'Revised Document' : 'Baseline Document'}
            </span>
          )}

          {viewMode === 'split' && (
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-teal-500/15 text-teal-300 border border-teal-500/30">
              Side-by-Side Split View
            </span>
          )}
        </div>

        {/* Center: Search Bar Slot (Plan 07-03) */}
        <div className="flex-1 max-w-md mx-2">{searchBarSlot}</div>

        {/* Right: Zoom & Canvas Presets */}
        <div className="flex items-center space-x-2">
          {/* Pan cursor indicator */}
          <div
            className="hidden sm:flex items-center space-x-1 px-2 py-1 rounded bg-slate-800/40 text-slate-400 text-[10px] font-mono border border-slate-800"
            title="Click and drag anywhere to pan the document"
          >
            <Move className="w-2.5 h-2.5" />
            <span>Pan</span>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center bg-slate-800/80 rounded-lg border border-slate-700/80 p-0.5 text-xs text-slate-300">
            <button
              onClick={() => onZoomChange((prev) => Math.max(0.5, Math.round((prev - 0.25) * 100) / 100))}
              disabled={zoom <= 0.5}
              className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 transition-colors"
              title="Zoom Out (-25%)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => handleZoomPreset(1.0)}
              className="px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-200 hover:text-white"
              title="Reset to 100%"
            >
              {Math.round(zoom * 100)}%
            </button>

            <button
              onClick={() => onZoomChange((prev) => Math.min(3.0, Math.round((prev + 0.25) * 100) / 100))}
              disabled={zoom >= 3.0}
              className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 transition-colors"
              title="Zoom In (+25%)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Fit Presets */}
          <button
            onClick={() => {
              onResetZoomAndPan();
            }}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-slate-300 hover:text-white transition-colors"
            title="Reset Pan & Zoom (1:1 Native)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              onZoomChange(1.15);
              onPanChange({ x: 0, y: 0 });
            }}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-slate-300 hover:text-white transition-colors"
            title="Fit to Screen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Scanned / Raster Warning Banner */}
      {document && !document.has_text_layer && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 flex items-center space-x-2 text-xs text-amber-300 shrink-0 z-10">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          <span>
            <strong>Scanned / Raster PDF:</strong> No native text layer found. Bounding boxes are derived from heuristics or OCR.
          </span>
        </div>
      )}

      {/* 3. Interactive Viewport Canvas */}
      <div className="flex-1 w-full h-full relative overflow-hidden">
        {viewMode === 'single' ? (
          renderSingleCanvas(document, role, children)
        ) : (
          /* Side-by-Side Dual Viewport Mode */
          <div className="w-full h-full grid grid-cols-2 divide-x divide-slate-800">
            {/* Left: Baseline Document */}
            <div className="flex flex-col h-full overflow-hidden">
              <div className="h-7 px-3 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  <strong className="text-slate-300">Baseline:</strong> {baselineDocument?.filename || 'None'}
                </span>
                <span>Page {pageNumber}</span>
              </div>
              <div className="flex-1 relative overflow-hidden">
                {renderSingleCanvas(baselineDocument || null, 'baseline', baselineChildren)}
              </div>
            </div>

            {/* Right: Revised Document */}
            <div className="flex flex-col h-full overflow-hidden">
              <div className="h-7 px-3 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  <strong className="text-slate-300">Revised:</strong> {revisedDocument?.filename || 'None'}
                </span>
                <span>Page {pageNumber}</span>
              </div>
              <div className="flex-1 relative overflow-hidden">
                {renderSingleCanvas(revisedDocument || null, 'revised', revisedChildren)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
