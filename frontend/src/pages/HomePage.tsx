import { Search, TrendingUp, Sparkles, Heart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import logoImage from '@/assets/logo.png';
import { useAppStore } from '@/store/useAppStore';
import { listPrompts } from '@/lib/api/k/prompts';
import type { PromptSummary } from '@/types/prompt';
import { getCategoryVisual } from '@/lib/category-visuals';
import { DEFAULT_PROMPT_CATEGORIES } from '@/constants/categories';

export function HomePage() {
  const [searchInput, setSearchInput] = useState('');
  const [trendingPrompts, setTrendingPrompts] = useState<PromptSummary[]>([]);
  const [recentPrompts, setRecentPrompts] = useState<PromptSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const setSelectedPromptId = useAppStore((state) => state.setSelectedPromptId);
  const setSelectedCategoryCode = useAppStore((state) => state.setSelectedCategoryCode);
  const setSearchQuery = useAppStore((state) => state.setSearchQuery);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const promptResponse = await listPrompts({ limit: 12 }, { publicAccess: true });
        const items = promptResponse.items || [];
        const sortedByStars = [...items].sort(
          (a, b) => (b.star_count ?? 0) - (a.star_count ?? 0)
        );
        setTrendingPrompts(sortedByStars.slice(0, 6));
        setRecentPrompts(items.slice(0, 6));
      } catch (error) {
        console.error('홈 데이터를 불러오지 못했습니다.', error);
        setErrorMessage('프롬프트 목록을 불러오는 중 문제가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchQuery(searchInput);
      navigate(`/search?q=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  const openPrompt = (prompt: PromptSummary) => {
    setSelectedPromptId(prompt.id);
    navigate(`/repository?id=${prompt.id}`);
  };

  const openCategory = (code: string) => {
    setSelectedCategoryCode(code);
    navigate(`/category?code=${encodeURIComponent(code)}`);
  };

  const renderPromptCard = (prompt: PromptSummary) => (
    <Card
      key={prompt.id}
      className="card-hover cursor-pointer border-border hover:border-primary"
      onClick={() => openPrompt(prompt)}
    >
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <Badge variant="secondary">{prompt.visibility}</Badge>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              {prompt.star_count ?? 0}
            </span>
            {prompt.latest_version && (
              <span>v{prompt.latest_version.version_number}</span>
            )}
          </div>
        </div>
        <CardTitle>{prompt.name}</CardTitle>
        <CardDescription>{prompt.description || '설명이 없습니다.'}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {prompt.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              #{tag}
            </Badge>
          ))}
          {prompt.tags.length === 0 && <span>태그 없음</span>}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen gradient-dark-bg gradient-overlay">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4 sm:mb-6">
            <img src={logoImage} alt="PromptLab" className="w-20 h-20 sm:w-28 sm:h-28 lg:w-32 lg:h-32 object-contain" />
          </div>
          <h2 className="mb-3 sm:mb-4 text-xl sm:text-2xl lg:text-3xl px-4">프롬프트를 코드처럼 관리하세요</h2>
          <p className="text-muted-foreground mb-6 sm:mb-8 text-sm sm:text-base px-4">
            GitHub처럼 버전 관리하고, Notion처럼 협업하며, ChatGPT처럼 실행하는 프롬프트 플랫폼
          </p>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative px-4">
            <Search className="absolute left-7 sm:left-8 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 sm:w-5 sm:h-5" />
            <Input 
              placeholder="프롬프트, 주제, 작성자 검색..."
              className="pl-10 sm:pl-12 h-10 sm:h-12 bg-card border-border text-sm sm:text-base"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </form>
        </div>

        {/* Trending Section */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <h3 className="text-lg sm:text-xl">인기 프롬프트</h3>
          </div>
          {errorMessage ? (
            <p className="text-sm text-destructive">{errorMessage}</p>
          ) : isLoading ? (
            <p className="text-sm text-muted-foreground">로딩 중...</p>
          ) : trendingPrompts.length === 0 ? (
            <p className="text-sm text-muted-foreground">표시할 프롬프트가 없습니다.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {trendingPrompts.map((prompt) => renderPromptCard(prompt))}
            </div>
          )}
        </div>

        {/* New Prompts */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
            <h3 className="text-lg sm:text-xl">최신 프롬프트</h3>
          </div>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">로딩 중...</p>
          ) : recentPrompts.length === 0 ? (
            <p className="text-sm text-muted-foreground">표시할 프롬프트가 없습니다.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {recentPrompts.map((prompt) => renderPromptCard(prompt))}
            </div>
          )}
        </div>

        {/* Category Grid */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl">카테고리별 탐색</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {DEFAULT_PROMPT_CATEGORIES.map((category) => {
              const visual = getCategoryVisual(category.code);
              const IconComponent = visual.icon;
              return (
                <Card
                  key={category.code}
                  className="card-hover cursor-pointer border-border hover:border-accent"
                  onClick={() => openCategory(category.code)}
                >
                  <CardHeader className="text-center">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3 shadow-lg"
                      style={{
                        backgroundColor: `${visual.accent}33`,
                        boxShadow: `0 0 0 2px ${visual.accent}80`,
                      }}
                    >
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-base">{category.name_kr || category.name_en}</CardTitle>
                    <CardDescription className="text-xs">
                      {visual.description || '프롬프트 탐색'}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
