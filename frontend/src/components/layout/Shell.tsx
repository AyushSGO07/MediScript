import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { GlobalSearchModal } from '../common/GlobalSearchModal';
import { useApp } from '../../context/AppContext';

export const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { selectedReviewId } = useApp();

  if (selectedReviewId) {
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-[#0F172A] text-slate-100">
        {/* Sidebar Navigation */}
        <Sidebar />

        {/* Full-width Workspace without standard Header/margins */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {children}
        </div>

        {/* Global Command Palette Search */}
        <GlobalSearchModal />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0F172A] text-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 bg-[#0F172A]">
          {children}
        </main>
      </div>

      {/* Global Command Palette Search */}
      <GlobalSearchModal />
    </div>
  );
};
