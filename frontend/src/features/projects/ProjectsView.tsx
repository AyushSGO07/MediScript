import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Project } from '../../types';
import { ProjectCard } from './ProjectCard';
import { CreateProjectModal } from './CreateProjectModal';
import { ArchiveConfirmModal } from './ArchiveConfirmModal';
import { FolderKanban, Plus, Search } from 'lucide-react';

export const ProjectsView: React.FC = () => {
  const { projects, setSelectedProjectId, setCurrentView } = useApp();
  const [search, setSearch] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Project | null>(null);

  const filtered = projects.filter((p) => {
    if (!includeArchived && p.status === 'archived') return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q));
    }
    return true;
  });

  const handleOpenProject = (project: Project) => {
    setSelectedProjectId(project.id);
    setCurrentView('reviews');
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Projects</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Organize label verification reviews, document versions, and audit scopes.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs shadow-md shadow-sky-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#1E293B] border border-slate-700/60 p-3 rounded-xl text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <label className="flex items-center space-x-2 text-slate-400 hover:text-slate-200 cursor-pointer select-none self-start sm:self-auto">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0"
          />
          <span className="text-[11px] font-mono">Show Archived Projects</span>
        </label>
      </div>

      {/* Projects Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={handleOpenProject}
              onArchive={setArchiveTarget}
            />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
          <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto mb-3">
            <FolderKanban className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-300">No Projects Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {search ? 'Try adjusting your search criteria.' : 'Create your first project to start organizing label reviews.'}
          </p>
          {!search && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="mt-4 px-4 py-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-semibold transition-colors"
            >
              Create Project
            </button>
          )}
        </div>
      )}

      {/* Modals */}
      <CreateProjectModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      <ArchiveConfirmModal project={archiveTarget} onClose={() => setArchiveTarget(null)} />
    </div>
  );
};
