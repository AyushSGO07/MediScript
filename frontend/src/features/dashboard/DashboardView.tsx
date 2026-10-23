import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { DashboardStats } from '../../types';
import { MetricCard } from './MetricCard';
import { RecentReviewsTable } from './RecentReviewsTable';
import { CreateReviewModal } from '../reviews/CreateReviewModal';
import { CreateProjectModal } from '../projects/CreateProjectModal';
import { DemoReviewBanner } from '../demo/DemoReviewBanner';
import {
  FileCheck2,
  Clock,
  CheckCircle2,
  Plus,
  FolderPlus,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { projects, reviews, setCurrentView } = useApp();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  useEffect(() => {
    api.getStats().then(setStats).catch(console.error);
  }, [projects, reviews]);

  const isEmpty = projects.length === 0 && reviews.length === 0;

  return (
    <div className="space-y-6">
      {/* Dashboard Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-700/60 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-sky-400 text-xs font-semibold uppercase tracking-wider font-mono">
            <Sparkles className="w-4 h-4" />
            <span>Review Intelligence & Verification</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Medical Device Label Verification</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Deterministic, evidence-linked comparison of approved baseline and revised label PDFs against versioned regulatory checklists.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => setIsProjectModalOpen(true)}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition-colors"
          >
            <FolderPlus className="w-4 h-4 text-sky-400" />
            <span>Create Project</span>
          </button>
          <button
            onClick={() => setIsReviewModalOpen(true)}
            disabled={projects.length === 0}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-md shadow-sky-500/20 transition-all disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>New Label Review</span>
          </button>
        </div>
      </div>

      {/* 1-Click Synthetic Demo Showcase Banner (DEMO-03) */}
      <DemoReviewBanner />

      {/* Real Application Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Projects"
          value={stats ? stats.total_projects : projects.length}
          subtitle="Managed workspaces"
          icon={FolderPlus}
          accentColor="sky"
        />
        <MetricCard
          title="Draft Reviews"
          value={stats ? stats.draft_reviews : 0}
          subtitle="Awaiting extraction"
          icon={Clock}
          accentColor="amber"
        />
        <MetricCard
          title="In Progress"
          value={stats ? stats.in_progress_reviews : 0}
          subtitle="Under reviewer audit"
          icon={FileCheck2}
          accentColor="teal"
        />
        <MetricCard
          title="Completed"
          value={stats ? stats.completed_reviews : 0}
          subtitle="Report generated"
          icon={CheckCircle2}
          accentColor="emerald"
        />
      </div>

      {/* First-Run Actionable Empty State */}
      {isEmpty && (
        <div className="bg-[#1E293B]/60 border border-dashed border-slate-700 rounded-2xl p-10 text-center max-w-xl mx-auto my-8">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-white">No Label Reviews Yet</h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Create a project and upload approved and revised label PDFs to begin automated verification, deterministic diffing, and audit report generation.
          </p>
          <div className="mt-6 flex items-center justify-center space-x-3">
            <button
              onClick={() => setIsProjectModalOpen(true)}
              className="px-4 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/20 transition-all flex items-center space-x-2"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Create First Project</span>
            </button>
          </div>
        </div>
      )}

      {/* Recent Reviews Table */}
      {!isEmpty && (
        <div className="bg-[#1E293B] border border-slate-700/60 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-700/60 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100">Recent Label Reviews</h3>
              <p className="text-[11px] text-slate-400">Latest labeling verification pipelines</p>
            </div>
            <button
              onClick={() => setCurrentView('reviews')}
              className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <RecentReviewsTable reviews={reviews} projects={projects} />
        </div>
      )}

      {/* Modals */}
      <CreateProjectModal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} />
      <CreateReviewModal isOpen={isReviewModalOpen} onClose={() => setIsReviewModalOpen(false)} />
    </div>
  );
};
