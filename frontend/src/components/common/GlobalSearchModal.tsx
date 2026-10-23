import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, FolderKanban, FileCheck2, X, ArrowRight } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

export const GlobalSearchModal: React.FC = () => {
  const { searchOpen, setSearchOpen, projects, reviews, setCurrentView, setSelectedProjectId, setSelectedReviewId } = useApp();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [searchOpen]);

  if (!searchOpen) return null;

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(query.toLowerCase()))
  );

  const filteredReviews = reviews.filter((r) =>
    r.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setCurrentView('projects');
    setSearchOpen(false);
  };

  const handleSelectReview = (reviewId: string, projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedReviewId(reviewId);
    setCurrentView('reviews');
    setSearchOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-slate-800 bg-slate-900/90">
          <Search className="w-4 h-4 text-sky-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, reviews, documents, findings..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-500 hover:text-slate-300 mr-2">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 rounded">
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4">
          {/* Projects Section */}
          {filteredProjects.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 px-2 py-1">
                Projects ({filteredProjects.length})
              </div>
              <div className="space-y-1 mt-1">
                {filteredProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProject(p.id)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800/80 flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center space-x-2.5">
                      <FolderKanban className="w-4 h-4 text-sky-400" />
                      <div>
                        <div className="text-xs font-semibold text-slate-200 group-hover:text-white">{p.name}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{p.description || 'No description'}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <StatusBadge status={p.status} size="sm" />
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reviews Section */}
          {filteredReviews.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 px-2 py-1">
                Label Reviews ({filteredReviews.length})
              </div>
              <div className="space-y-1 mt-1">
                {filteredReviews.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleSelectReview(r.id, r.project_id)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800/80 flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center space-x-2.5">
                      <FileCheck2 className="w-4 h-4 text-teal-400" />
                      <div>
                        <div className="text-xs font-semibold text-slate-200 group-hover:text-white">{r.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">Status: {r.status}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <StatusBadge status={r.status} size="sm" />
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-teal-400" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredProjects.length === 0 && filteredReviews.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-500">
              No matching projects or reviews found for "{query}".
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
