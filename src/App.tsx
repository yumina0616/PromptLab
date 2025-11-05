import { useState, useEffect } from 'react';
// 🟢 여기가 전부 새 주소로 바뀌었습니다 🟢
import { HomePage } from '@/pages/HomePage';
import { PromptRepository } from '@/pages/PromptRepository';
import { PromptEditor } from '@/components/shared/PromptEditor'; // <- 이건 shared로 갔죠
import { Playground } from '@/pages/Playground';
import { UserProfile } from '@/pages/UserProfile';
import { AuthPage } from '@/pages/AuthPage';
import { Header } from '@/components/layout/Header'; // <- 이건 layout으로 갔죠
import { Settings } from '@/pages/Settings';
import { CategoryPage } from '@/pages/CategoryPage';
import { SearchResults } from '@/pages/SearchResults';
import { TeamPage } from '@/pages/TeamPage';
import type { Prompt } from '@/lib/mock-data'; // <- 이것도 @/lib로!
import { PROMPT_CATEGORIES } from '@/types/navigation';
import type { AppPage, NavigateHandler, PromptCategory } from '@/types/navigation';

export default function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>('auth');
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | undefined>();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<PromptCategory>('Dev');
  const [searchQuery, setSearchQuery] = useState('');

  // Enable dark mode
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const handleNavigate: NavigateHandler = (page, data) => {
    setCurrentPage(page);

    if (page === 'repository' && isPrompt(data)) {
      setSelectedPrompt(data);
    } else if (page === 'category' && isPromptCategory(data)) {
      setSelectedCategory(data);
    } else if (page === 'search' && typeof data === 'string') {
      setSearchQuery(data);
    } else {
      setSelectedPrompt(undefined);
    }
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setCurrentPage('home');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentPage('auth');
  };

  // If not authenticated, show auth page
  if (!isAuthenticated) {
    return <AuthPage onNavigate={handleNavigate} onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <>
      <Header 
        currentPage={currentPage} 
        onNavigate={handleNavigate} 
        onLogout={handleLogout}
        isAuthenticated={isAuthenticated}
      />
      
      {currentPage === 'home' && <HomePage onNavigate={handleNavigate} />}
      {currentPage === 'repository' && selectedPrompt && (
        <PromptRepository prompt={selectedPrompt} onNavigate={handleNavigate} />
      )}
      {currentPage === 'editor' && (
        <PromptEditor prompt={selectedPrompt} onNavigate={handleNavigate} />
      )}
      {currentPage === 'playground' && <Playground onNavigate={handleNavigate} />}
      {currentPage === 'profile' && <UserProfile onNavigate={handleNavigate} onLogout={handleLogout} />}
      {currentPage === 'settings' && <Settings onNavigate={handleNavigate} />}
      {currentPage === 'category' && <CategoryPage category={selectedCategory} onNavigate={handleNavigate} />}
      {currentPage === 'search' && <SearchResults query={searchQuery} onNavigate={handleNavigate} />}
      {currentPage === 'team' && <TeamPage onNavigate={handleNavigate} />}
    </>
  );
}

const isPrompt = (value: unknown): value is Prompt => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'title' in value &&
    'content' in value
  );
};

const isPromptCategory = (value: unknown): value is PromptCategory =>
  typeof value === 'string' && (PROMPT_CATEGORIES as readonly string[]).includes(value);
