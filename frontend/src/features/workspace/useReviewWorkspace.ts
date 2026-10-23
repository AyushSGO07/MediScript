import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Review,
  Finding,
  DiffItem,
  ReviewFieldsResponse,
  DocumentDetail,
  ExtractedField,
  TextBlock,
} from '../../types';
import { api } from '../../lib/api';

export interface WorkspaceLayers {
  findings: boolean;
  entities: boolean;
  diffs: boolean;
  search: boolean;
}

export function useReviewWorkspace(reviewId: string) {
  // Core data
  const [review, setReview] = useState<Review | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [diffItems, setDiffItems] = useState<DiffItem[]>([]);
  const [fieldsResponse, setFieldsResponse] = useState<ReviewFieldsResponse | null>(null);
  const [baselineDoc, setBaselineDoc] = useState<DocumentDetail | null>(null);
  const [revisedDoc, setRevisedDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // View state
  const [activeRole, setActiveRole] = useState<'revised' | 'baseline'>('revised');
  const [viewMode, setViewMode] = useState<'single' | 'split'>('single');
  const [activePage, setActivePage] = useState<number>(1);
  const [zoom, setZoomState] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchMatches, setSearchMatches] = useState<TextBlock[]>([]);
  const [currentSearchMatchIndex, setCurrentSearchMatchIndex] = useState<number>(0);
  const [activeLayers, setActiveLayers] = useState<WorkspaceLayers>({
    findings: true,
    entities: true,
    diffs: true,
    search: true,
  });

  const loadData = useCallback(async () => {
    if (!reviewId) return;
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch Review
      const rev = await api.getReview(reviewId);
      setReview(rev);

      // 2. Parallel fetch findings, diffs, fields
      const [fData, dData, fieldsData] = await Promise.all([
        api.getReviewFindings(reviewId).catch(() => [] as Finding[]),
        api.getReviewDiff(reviewId).catch(() => [] as DiffItem[]),
        api.getReviewFields(reviewId).catch(() => null),
      ]);
      setFindings(fData);
      setDiffItems(dData);
      setFieldsResponse(fieldsData);

      // 3. Fetch Document details
      if (rev.baseline_document_id) {
        api.getDocumentDetail(rev.baseline_document_id)
          .then((d) => setBaselineDoc(d))
          .catch((err) => console.error('Failed to load baseline doc:', err));
      } else {
        setBaselineDoc(null);
      }

      if (rev.revised_document_id) {
        api.getDocumentDetail(rev.revised_document_id)
          .then((d) => setRevisedDoc(d))
          .catch((err) => console.error('Failed to load revised doc:', err));
      } else {
        setRevisedDoc(null);
      }
    } catch (err: any) {
      console.error('Failed to load review workspace:', err);
      setError(err.message || 'Failed to load workspace data');
    } finally {
      setLoading(false);
    }
  }, [reviewId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived properties
  const activeDocument = useMemo(() => {
    return activeRole === 'revised' ? revisedDoc : baselineDoc;
  }, [activeRole, revisedDoc, baselineDoc]);

  const totalPages = useMemo(() => {
    return activeDocument?.page_count || 1;
  }, [activeDocument]);

  const activeFinding = useMemo(() => {
    if (!selectedFindingId) return null;
    return findings.find((f) => f.id === selectedFindingId) || null;
  }, [findings, selectedFindingId]);

  const pageFindings = useMemo(() => {
    return findings.filter((f) => {
      const matchRole =
        f.document_role === activeRole || (!f.document_role && activeRole === 'revised');
      const matchPage =
        f.page_number === activePage || (!f.page_number && activePage === 1);
      return matchRole && matchPage;
    });
  }, [findings, activeRole, activePage]);

  const pageDiffs = useMemo(() => {
    return diffItems.filter((d) => {
      if (activeRole === 'revised') {
        return d.revised_page === activePage;
      }
      return d.baseline_page === activePage;
    });
  }, [diffItems, activeRole, activePage]);

  const pageEntities = useMemo<ExtractedField[]>(() => {
    const list =
      activeRole === 'revised'
        ? fieldsResponse?.revised_fields
        : fieldsResponse?.baseline_fields;
    if (!list) return [];
    return list.filter((e) => e.evidence_page === activePage || (!e.evidence_page && activePage === 1));
  }, [fieldsResponse, activeRole, activePage]);

  // Split view specific selectors
  const baselinePageFindings = useMemo(() => {
    return findings.filter(
      (f) =>
        f.document_role === 'baseline' &&
        (f.page_number === activePage || (!f.page_number && activePage === 1))
    );
  }, [findings, activePage]);

  const revisedPageFindings = useMemo(() => {
    return findings.filter(
      (f) =>
        (f.document_role === 'revised' || !f.document_role) &&
        (f.page_number === activePage || (!f.page_number && activePage === 1))
    );
  }, [findings, activePage]);

  const baselinePageDiffs = useMemo(() => {
    return diffItems.filter((d) => d.baseline_page === activePage);
  }, [diffItems, activePage]);

  const revisedPageDiffs = useMemo(() => {
    return diffItems.filter((d) => d.revised_page === activePage);
  }, [diffItems, activePage]);

  const baselinePageEntities = useMemo<ExtractedField[]>(() => {
    const list = fieldsResponse?.baseline_fields || [];
    return list.filter((e) => e.evidence_page === activePage || (!e.evidence_page && activePage === 1));
  }, [fieldsResponse, activePage]);

  const revisedPageEntities = useMemo<ExtractedField[]>(() => {
    const list = fieldsResponse?.revised_fields || [];
    return list.filter((e) => e.evidence_page === activePage || (!e.evidence_page && activePage === 1));
  }, [fieldsResponse, activePage]);

  // Actions
  const setZoom = useCallback((newZoom: number | ((prev: number) => number)) => {
    setZoomState((prev) => {
      const val = typeof newZoom === 'function' ? newZoom(prev) : newZoom;
      return Math.min(3.0, Math.max(0.5, Math.round(val * 100) / 100));
    });
  }, []);

  const resetZoomAndPan = useCallback(() => {
    setZoomState(1.0);
    setPan({ x: 0, y: 0 });
  }, []);

  const toggleLayer = useCallback((layer: keyof WorkspaceLayers) => {
    setActiveLayers((prev) => ({
      ...prev,
      [layer]: !prev[layer],
    }));
  }, []);

  const focusFinding = useCallback(
    (findingId: string) => {
      const target = findings.find((f) => f.id === findingId);
      if (!target) return;

      setSelectedFindingId(findingId);

      // Switch document role if needed
      if (target.document_role && target.document_role !== activeRole) {
        if (target.document_role === 'baseline' || target.document_role === 'revised') {
          setActiveRole(target.document_role);
        }
      }

      // Switch page if needed
      if (target.page_number && target.page_number !== activePage) {
        setActivePage(target.page_number);
      }

      // Calculate centering offset if coordinates exist
      if (
        target.norm_x0 !== null &&
        target.norm_x0 !== undefined &&
        target.norm_y0 !== null &&
        target.norm_y0 !== undefined
      ) {
        const cx = (target.norm_x0 + (target.norm_x1 || target.norm_x0)) / 2;
        const cy = (target.norm_y0 + (target.norm_y1 || target.norm_y0)) / 2;
        // Shift pan relative to container center (500x700 assumed default aspect)
        const targetZoom = 1.35;
        setZoomState(targetZoom);
        setPan({
          x: Math.round(-(cx - 0.5) * 500 * targetZoom),
          y: Math.round(-(cy - 0.5) * 700 * targetZoom),
        });
      }
    },
    [findings, activeRole, activePage]
  );

  return {
    review,
    findings,
    diffItems,
    fieldsResponse,
    baselineDoc,
    revisedDoc,
    activeDocument,
    loading,
    error,
    activeRole,
    setActiveRole,
    viewMode,
    setViewMode,
    activePage,
    setActivePage,
    totalPages,
    zoom,
    setZoom,
    pan,
    setPan,
    resetZoomAndPan,
    selectedFindingId,
    setSelectedFindingId,
    activeFinding,
    searchQuery,
    setSearchQuery,
    searchMatches,
    setSearchMatches,
    currentSearchMatchIndex,
    setCurrentSearchMatchIndex,
    activeLayers,
    toggleLayer,
    pageFindings,
    pageDiffs,
    pageEntities,
    baselinePageFindings,
    revisedPageFindings,
    baselinePageDiffs,
    revisedPageDiffs,
    baselinePageEntities,
    revisedPageEntities,
    focusFinding,
    refreshAll: loadData,
  };
}
