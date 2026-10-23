import React, { createContext, useContext, useState, useEffect } from 'react';
import { NavigationView, DemoRole, Project, Review } from '../types';
import { getStoredRole, setStoredRole, api } from '../lib/api';

interface AppContextType {
  currentView: NavigationView;
  setCurrentView: (view: NavigationView) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  selectedReviewId: string | null;
  setSelectedReviewId: (id: string | null) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  demoRole: DemoRole;
  setDemoRole: (role: DemoRole) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  projects: Project[];
  reviews: Review[];
  refreshData: () => Promise<void>;
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<NavigationView>('overview');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [demoRole, setDemoRoleState] = useState<DemoRole>(getStoredRole());
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const setDemoRole = (role: DemoRole) => {
    setStoredRole(role);
    setDemoRoleState(role);
  };

  const refreshData = async () => {
    try {
      const [projs, revs] = await Promise.all([
        api.getProjects(true),
        api.getReviews(),
      ]);
      setProjects(projs);
      setReviews(revs);
    } catch (err) {
      console.error('Failed to refresh data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [demoRole]);

  // Global Ctrl+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView,
        selectedProjectId,
        setSelectedProjectId,
        selectedReviewId,
        setSelectedReviewId,
        sidebarCollapsed,
        setSidebarCollapsed,
        demoRole,
        setDemoRole,
        searchOpen,
        setSearchOpen,
        projects,
        reviews,
        refreshData,
        loading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
