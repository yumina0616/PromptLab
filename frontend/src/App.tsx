import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { PromptRepository } from '@/pages/PromptRepository';
import { PromptEditor } from '@/components/shared/PromptEditor';
import { Playground } from '@/pages/Playground';
import { UserProfile } from '@/pages/UserProfile';
import { AuthPage } from '@/pages/AuthPage';
import { Header } from '@/components/layout/Header';
import { Settings } from '@/pages/Settings';
import { CategoryPage } from '@/pages/CategoryPage';
import { SearchResults } from '@/pages/SearchResults';
import { TeamPage } from '@/pages/TeamPage';
import { useAppStore } from '@/store/useAppStore';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <BrowserRouter>
      {isAuthenticated && <Header />}
      <Routes>
        <Route
          path="/auth"
          element={isAuthenticated ? <Navigate to="/" replace /> : <AuthPage />}
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/repository"
          element={
            <ProtectedRoute>
              <PromptRepository />
            </ProtectedRoute>
          }
        />
        <Route
          path="/editor"
          element={
            <ProtectedRoute>
              <PromptEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/playground"
          element={
            <ProtectedRoute>
              <Playground />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/category"
          element={
            <ProtectedRoute>
              <CategoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <SearchResults />
            </ProtectedRoute>
          }
        />
        <Route
          path="/team"
          element={
            <ProtectedRoute>
              <TeamPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? '/' : '/auth'} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
