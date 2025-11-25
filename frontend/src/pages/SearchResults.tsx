import { ArrowLeft, Search as SearchIcon, Filter, SlidersHorizontal, Loader2, Heart } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/store/useAppStore';
import { getPromptVersion, listPrompts } from '@/lib/api/k/prompts';
import type { PromptSummary, PromptVersion } from '@/types/prompt';
import { DEFAULT_PROMPT_CATEGORIES } from '@/constants/categories';

interface SearchPrompt {
  summary: PromptSummary;
  version: PromptVersion | null;
}

export function SearchResults() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const globalSearchQuery = useAppStore((state) => state.searchQuery);
  const setGlobalSearchQuery = useAppStore((state) => state.setSearchQuery);
  const setSelectedPromptId = useAppStore((state) => state.setSelectedPromptId);

  const initialQuery = searchParams.get('q') || globalSearchQuery;

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [results, setResults] = useState<SearchPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setGlobalSearchQuery(searchQuery);
    setSearchParams({ q: searchQuery });
  }, [searchQuery, setGlobalSearchQuery, setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    const handler = setTimeout(async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await listPrompts(
          {
            q: searchQuery || undefined,
            limit: 40,
          },
          { publicAccess: true }
        );
        const enriched = await Promise.all(
          response.items.map(async (item) => {
            try {
              const version = item.latest_version
                ? await getPromptVersion(item.id, item.latest_version.id)
                : null;
              return { summary: item, version };
            } catch (error) {
              console.error('버전 정보를 가져오지 못했습니다.', error);
              return { summary: item, version: null };
            }
          })
        );
        if (!cancelled) {
          setResults(enriched);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('검색 실패', error);
          setErrorMessage('검색 중 문제가 발생했습니다.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const filteredResults = useMemo(() => {
    let items = results;
    if (filterCategory !== 'all') {
      items = items.filter(
        (item) => item.version?.category_code?.toLowerCase() === filterCategory.toLowerCase()
      );
    }
    if (sortBy === 'name') {
      items = [...items].sort((a, b) => a.summary.name.localeCompare(b.summary.name));
    } else {
      items = [...items].sort((a, b) => {
        const aTime = a.version?.created_at ? new Date(a.version.created_at).getTime() : 0;
        const bTime = b.version?.created_at ? new Date(b.version.created_at).getTime() : 0;
        return bTime - aTime;
      });
    }
    return items;
  }, [results, filterCategory, sortBy]);

  const openPrompt = (promptId: number) => {
    setSelectedPromptId(promptId);
    navigate(`/repository?id=${promptId}`);
  };

  return (
    <div className="min-h-screen gradient-dark-bg gradient-overlay">
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>탐색으로 돌아가기</span>
          </button>

          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                placeholder="프롬프트, 작성자, 태그 검색..."
                className="pl-12 h-12 bg-background border-border"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" className="h-12 w-12">
              <SlidersHorizontal className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 카테고리</SelectItem>
                  {DEFAULT_PROMPT_CATEGORIES.map((category) => (
                    <SelectItem key={category.code} value={category.code}>
                      {category.name_kr || category.name_en || category.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">정렬:</span>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'recent' | 'name')}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">최신 순</SelectItem>
                <SelectItem value="name">이름 순</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-muted-foreground">
            Found <span className="text-foreground">{filteredResults.length}</span> result
            {filteredResults.length !== 1 && 's'}
            {searchQuery && (
              <>
                {' '}
                for "<span className="text-foreground">{searchQuery}</span>"
              </>
            )}
          </p>
        </div>

        {errorMessage && (
          <Card className="border-destructive bg-destructive/10 mb-4">
            <CardContent className="py-4 text-sm text-destructive">{errorMessage}</CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            검색 중입니다...
          </div>
        ) : filteredResults.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResults.map((item) => (
              <Card
                key={item.summary.id}
                className="card-hover cursor-pointer border-border hover:border-primary"
                onClick={() => openPrompt(item.summary.id)}
              >
                <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="secondary">
                        {item.version?.category_code || '카테고리 없음'}
                      </Badge>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {item.summary.star_count ?? 0}
                        </span>
                        {item.version && (
                          <span>v{item.version.version_number}</span>
                        )}
                      </div>
                    </div>
                  <CardTitle>{item.summary.name}</CardTitle>
                  <CardDescription>{item.summary.description || '설명이 없습니다.'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {item.summary.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                      {item.summary.tags.length === 0 && (
                        <span className="text-xs text-muted-foreground">태그 없음</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <SearchIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2">결과를 찾을 수 없습니다</h3>
            <p className="text-muted-foreground">검색어나 필터를 조정해보세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
