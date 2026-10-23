import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Shell } from './components/layout/Shell';
import { DashboardView } from './features/dashboard/DashboardView';
import { ProjectsView } from './features/projects/ProjectsView';
import { ReviewsView } from './features/reviews/ReviewsView';
import { RequirementsView } from './features/requirements/RequirementsView';
import { ReviewWorkspaceView } from './features/workspace/ReviewWorkspaceView';
import { ActivityTrailView } from './features/activity/ActivityTrailView';
import { ReportsView } from './features/reports/ReportsView';

const ViewContainer: React.FC = () => {
  const { currentView, selectedReviewId, setSelectedReviewId } = useApp();

  if (selectedReviewId) {
    return (
      <ReviewWorkspaceView
        reviewId={selectedReviewId}
        onBack={() => setSelectedReviewId(null)}
      />
    );
  }

  switch (currentView) {
    case 'overview':
      return <DashboardView />;
    case 'projects':
      return <ProjectsView />;
    case 'reviews':
      return <ReviewsView />;
    case 'requirements':
      return <RequirementsView />;
    case 'reports':
      return <ReportsView />;
    case 'activity':
      return <ActivityTrailView />;
    case 'settings':
      return (
        <div className="bg-[#1E293B] border border-slate-700/60 rounded-xl p-8 max-w-2xl mx-auto space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white">Application Settings & Diagnostics</h2>
            <p className="text-xs text-slate-400 mt-1">Local workstation environment configuration and compliance boundaries.</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-800">
              <span className="text-slate-400">Persistence Engine</span>
              <span className="font-mono text-emerald-400 font-semibold">SQLite 3 (WAL Mode)</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800">
              <span className="text-slate-400">PDF Extraction Engine</span>
              <span className="font-mono text-sky-400 font-semibold">PyMuPDF 2.0 (fitz)</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800">
              <span className="text-slate-400">Compliance Stance</span>
              <span className="font-mono text-amber-400 font-semibold">Assistive Copilot (Human-in-the-Loop)</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400">Offline Fallback</span>
              <span className="font-mono text-emerald-400 font-semibold">100% Deterministic (No-Key Ready)</span>
            </div>
          </div>
        </div>
      );
    default:
      return <DashboardView />;
  }
};

export default function App() {
  return (
    <AppProvider>
      <Shell>
        <ViewContainer />
      </Shell>
    </AppProvider>
  );
}
