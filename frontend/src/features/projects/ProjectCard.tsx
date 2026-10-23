import React from 'react';
import { Project } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { FolderKanban, FileCheck2, Archive, ArrowRight } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  onOpen: (project: Project) => void;
  onArchive: (project: Project) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onOpen, onArchive }) => {
  return (
    <div className="bg-[#1E293B] border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between shadow-sm hover:border-slate-600 transition-all group">
      <div>
        <div className="flex items-start justify-between">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <FolderKanban className="w-5 h-5" />
          </div>
          <StatusBadge status={project.status} size="sm" />
        </div>

        <h3 className="text-sm font-bold text-slate-100 mt-3 group-hover:text-white transition-colors">
          {project.name}
        </h3>
        <p className="text-xs text-slate-400 mt-1 line-clamp-2 min-h-[32px]">
          {project.description || 'No description provided.'}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
        <span className="flex items-center space-x-1.5 text-slate-400 font-mono text-[11px]">
          <FileCheck2 className="w-3.5 h-3.5 text-slate-400" />
          <span>{project.review_count} {project.review_count === 1 ? 'Review' : 'Reviews'}</span>
        </span>

        <div className="flex items-center space-x-2">
          {project.status !== 'archived' && (
            <button
              onClick={() => onArchive(project)}
              className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
              title="Archive Project"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => onOpen(project)}
            className="flex items-center space-x-1 text-sky-400 hover:text-sky-300 font-semibold"
          >
            <span>Open</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
