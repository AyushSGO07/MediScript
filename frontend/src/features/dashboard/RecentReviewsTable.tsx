import React from 'react';
import { Review, Project } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { FileCheck2, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface RecentReviewsTableProps {
  reviews: Review[];
  projects: Project[];
}

export const RecentReviewsTable: React.FC<RecentReviewsTableProps> = ({ reviews, projects }) => {
  const { setSelectedProjectId, setSelectedReviewId, setCurrentView } = useApp();

  const getProjectName = (projectId: string) => {
    const p = projects.find((proj) => proj.id === projectId);
    return p ? p.name : 'Unknown Project';
  };

  const handleOpenReview = (review: Review) => {
    setSelectedProjectId(review.project_id);
    setSelectedReviewId(review.id);
    setCurrentView('reviews');
  };

  if (reviews.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-500 font-mono">
        No recent reviews found in database.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-900/60 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-700/60">
          <tr>
            <th className="py-2.5 px-4 font-semibold">Review Name</th>
            <th className="py-2.5 px-4 font-semibold">Project</th>
            <th className="py-2.5 px-4 font-semibold">Checklist</th>
            <th className="py-2.5 px-4 font-semibold">Status</th>
            <th className="py-2.5 px-4 font-semibold">Updated</th>
            <th className="py-2.5 px-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {reviews.slice(0, 5).map((r) => (
            <tr key={r.id} className="hover:bg-slate-800/50 transition-colors group">
              <td className="py-3 px-4 font-medium text-slate-200 flex items-center space-x-2">
                <FileCheck2 className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="truncate max-w-[200px]">{r.name}</span>
              </td>
              <td className="py-3 px-4 text-slate-400 truncate max-w-[150px]">
                {getProjectName(r.project_id)}
              </td>
              <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                {r.checklist_version_id || 'Default'}
              </td>
              <td className="py-3 px-4">
                <StatusBadge status={r.status} size="sm" />
              </td>
              <td className="py-3 px-4 text-slate-400 text-[11px] font-mono">
                {new Date(r.updated_at).toLocaleDateString()}
              </td>
              <td className="py-3 px-4 text-right">
                <button
                  onClick={() => handleOpenReview(r)}
                  className="inline-flex items-center text-sky-400 hover:text-sky-300 font-semibold space-x-1"
                >
                  <span>Open</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
