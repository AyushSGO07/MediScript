import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Shell } from './components/layout/Shell';
import { DashboardView } from './features/dashboard/DashboardView';
import { ProjectsView } from './features/projects/ProjectsView';
import { ReviewsView } from './features/reviews/ReviewsView';
import { RequirementsView } from './features/requirements/RequirementsView';
import { ReviewWorkspaceView } from './features/workspace/ReviewWorkspaceView';
import { FileText, History } from 'lucide-react';

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
      return (
        <div className="bg-[#1E293B] border border-slate-700/60 rounded-xl p-12 text-center max-w-lg mx-auto my-12">
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-white">Audit Reports Engine</h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Formal ReportLab PDF export and structured JSON audit generation will be connected in <strong>Phase 9</strong>.
          </p>
        </div>
      );
    case 'activity':
      return (
        <div className="bg-[#1E293B] border border-slate-700/60 rounded-xl p-12 text-center max-w-lg mx-auto my-12">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
            <History className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-white">Audit Activity Trail</h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Append-only decision and activity audit history explorer will be connected in <strong>Phase 8</strong>.
          </p>
        </div>
      );
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
