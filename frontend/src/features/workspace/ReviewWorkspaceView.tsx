import React, { useState } from 'react';
import { useReviewWorkspace } from './useReviewWorkspace';
import { ReviewWorkspaceHeader } from './ReviewWorkspaceHeader';
import { ReviewNavigationPanel } from './ReviewNavigationPanel';
import { EvidenceViewer } from './EvidenceViewer';
import { EvidenceSvgOverlay } from './EvidenceSvgOverlay';
import { EvidenceSearchBar } from './EvidenceSearchBar';
import { FindingActionQueue } from './FindingActionQueue';
import { ReviewFindingsModal } from '../findings/ReviewFindingsModal';
import { ReviewDiffModal } from '../diff/ReviewDiffModal';
import { useApp } from '../../context/AppContext';
import { FindingStatus } from '../../types';
import { api } from '../../lib/api';
import { Loader2 } from 'lucide-react';

interface ReviewWorkspaceViewProps {
  reviewId: string;
  onBack: () => void;
}

export const ReviewWorkspaceView: React.FC<ReviewWorkspaceViewProps> = ({
  reviewId,
  onBack,
}) => {
  const { projects } = useApp();
  const workspace = useReviewWorkspace(reviewId);

  // Modals for evaluation and diff from header
  const [isEvaluationOpen, setIsEvaluationOpen] = useState(false);
  const [isDiffOpen, setIsDiffOpen] = useState(false);

  const parentProject = projects.find((p) => p.id === workspace.review?.project_id);

  const handleUpdateFindingStatus = async (findingId: string, status: FindingStatus) => {
    try {
      await api.updateFindingStatus(findingId, status);
      await workspace.refreshAll();
    } catch (err) {
      console.error('Failed to update finding status:', err);
    }
  };

  const searchBar = (
    <EvidenceSearchBar
      searchQuery={workspace.searchQuery}
      onSearchChange={workspace.setSearchQuery}
      textBlocks={workspace.activeDocument?.text_blocks || []}
      activePage={workspace.activePage}
      currentMatchIndex={workspace.currentSearchMatchIndex}
      onMatchIndexChange={workspace.setCurrentSearchMatchIndex}
      onMatchesFound={workspace.setSearchMatches}
    />
  );

  const singleOverlay = (
    <EvidenceSvgOverlay
      findings={workspace.pageFindings}
      entities={workspace.pageEntities}
      diffs={workspace.pageDiffs}
      searchMatches={workspace.searchMatches}
      currentSearchMatchIndex={workspace.currentSearchMatchIndex}
      selectedFindingId={workspace.selectedFindingId}
      activeLayers={workspace.activeLayers}
      onSelectFinding={workspace.focusFinding}
      role={workspace.activeRole}
    />
  );

  const baselineOverlay = (
    <EvidenceSvgOverlay
      findings={workspace.baselinePageFindings}
      entities={workspace.baselinePageEntities}
      diffs={workspace.baselinePageDiffs}
      selectedFindingId={workspace.selectedFindingId}
      activeLayers={workspace.activeLayers}
      onSelectFinding={workspace.focusFinding}
      role="baseline"
    />
  );

  const revisedOverlay = (
    <EvidenceSvgOverlay
      findings={workspace.revisedPageFindings}
      entities={workspace.revisedPageEntities}
      diffs={workspace.revisedPageDiffs}
      searchMatches={workspace.searchMatches}
      currentSearchMatchIndex={workspace.currentSearchMatchIndex}
      selectedFindingId={workspace.selectedFindingId}
      activeLayers={workspace.activeLayers}
      onSelectFinding={workspace.focusFinding}
      role="revised"
    />
  );

  if (workspace.loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-3 text-slate-400 bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        <p className="text-sm font-medium">Loading review workspace...</p>
      </div>
    );
  }

  if (workspace.error || !workspace.review) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-3 text-slate-400 bg-slate-950 p-6 text-center">
        <p className="text-sm text-rose-400 font-medium">
          {workspace.error || 'Failed to load review workspace'}
        </p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700"
        >
          Return to Reviews
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-950">
      {/* 1. Workspace Header */}
      <ReviewWorkspaceHeader
        review={workspace.review}
        projectName={parentProject?.name}
        activeRole={workspace.activeRole}
        viewMode={workspace.viewMode}
        onRoleChange={workspace.setActiveRole}
        onViewModeChange={workspace.setViewMode}
        onBack={onBack}
        onRunEvaluation={() => setIsEvaluationOpen(true)}
        onRunDiff={() => setIsDiffOpen(true)}
      />

      {/* 2. Three-Panel Layout Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Navigation & Page Density */}
        <ReviewNavigationPanel
          activeRole={workspace.activeRole}
          activeDocument={workspace.activeDocument}
          activePage={workspace.activePage}
          totalPages={workspace.totalPages}
          findings={workspace.findings}
          diffItems={workspace.diffItems}
          activeLayers={workspace.activeLayers}
          onPageChange={workspace.setActivePage}
          onToggleLayer={workspace.toggleLayer}
        />

        {/* Center Panel: Interactive Evidence Viewer */}
        <EvidenceViewer
          document={workspace.activeDocument}
          role={workspace.activeRole}
          pageNumber={workspace.activePage}
          totalPages={workspace.totalPages}
          zoom={workspace.zoom}
          pan={workspace.pan}
          onPageChange={workspace.setActivePage}
          onZoomChange={workspace.setZoom}
          onPanChange={workspace.setPan}
          onResetZoomAndPan={workspace.resetZoomAndPan}
          viewMode={workspace.viewMode}
          baselineDocument={workspace.baselineDoc}
          revisedDocument={workspace.revisedDoc}
          searchBarSlot={searchBar}
          baselineChildren={baselineOverlay}
          revisedChildren={revisedOverlay}
        >
          {singleOverlay}
        </EvidenceViewer>

        {/* Right Panel: Findings Action Queue */}
        <FindingActionQueue
          findings={workspace.findings}
          selectedFindingId={workspace.selectedFindingId}
          onSelectFinding={workspace.focusFinding}
          onJumpToEvidence={(f) => workspace.focusFinding(f.id)}
          onUpdateFindingStatus={handleUpdateFindingStatus}
        />
      </div>

      {/* Evaluation Runner Modal */}
      {isEvaluationOpen && workspace.review && (
        <ReviewFindingsModal
          review={workspace.review}
          isOpen={isEvaluationOpen}
          onClose={() => setIsEvaluationOpen(false)}
          onEvaluationCompleted={() => workspace.refreshAll()}
        />
      )}

      {/* Revision Diff Runner Modal */}
      {isDiffOpen && workspace.review && (
        <ReviewDiffModal
          review={workspace.review}
          isOpen={isDiffOpen}
          onClose={() => setIsDiffOpen(false)}
          onDiffUpdated={() => workspace.refreshAll()}
        />
      )}
    </div>
  );
};
