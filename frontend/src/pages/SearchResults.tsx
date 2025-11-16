import { ArrowLeft, Search as SearchIcon, Filter, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockPrompts } from '@/lib/mock-data';
import { useAppStore } from '@/store/useAppStore';

export function SearchResults() {
  const initialQuery = useAppStore((state) => state.searchQuery);
  const setGlobalSearchQuery = useAppStore((state) => state.setSearchQuery);
  const setSelectedPrompt = useAppStore((state) => state.setSelectedPrompt);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [sortBy, setSortBy] = useState('relevance');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    setGlobalSearchQuery(searchQuery);
  }, [searchQuery, setGlobalSearchQuery]);

  const openPrompt = (prompt: (typeof mockPrompts)[number]) => {
    setSelectedPrompt(prompt);
    navigate('/repository');
  };

  // Filter and search logic
  let results = mockPrompts;
  
  if (searchQuery) {
    results = results.filter(prompt => 
      prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }

  if (filterCategory !== 'all') {
    results = results.filter(prompt => prompt.category === filterCategory);
  }

  // Sort logic
  if (sortBy === 'stars') {
    results = [...results].sort((a, b) => b.stars - a.stars);
  } else if (sortBy === 'recent') {
    results = [...results].sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  return (
    <div className="min-h-screen gradient-dark-bg gradient-overlay">
      {/* Header */}
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
        {/* Filters and Sort */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 카테고리</SelectItem>
                  <SelectItem value="Dev">개발</SelectItem>
                  <SelectItem value="Marketing">마케팅</SelectItem>
                  <SelectItem value="Design">디자인</SelectItem>
                  <SelectItem value="Edu">HR/교육</SelectItem>
                  <SelectItem value="Data">데이터</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">정렬:</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">관련성</SelectItem>
                <SelectItem value="stars">스타 많은 순</SelectItem>
                <SelectItem value="recent">최신 순</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-muted-foreground">
            Found <span className="text-foreground">{results.length}</span> result{results.length !== 1 && 's'}
            {searchQuery && <> for "<span className="text-foreground">{searchQuery}</span>"</>}
          </p>
        </div>

        {/* Results Grid */}
        {results.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((prompt) => (
              <Card 
                key={prompt.id}
                className="card-hover cursor-pointer border-border hover:border-primary"
                onClick={() => openPrompt(prompt)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="secondary">{prompt.category}</Badge>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">⭐ {prompt.stars}</span>
                      <span className="flex items-center gap-1">🔁 {prompt.forks}</span>
                    </div>
                  </div>
                  <CardTitle>{prompt.title}</CardTitle>
                  <CardDescription>{prompt.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>by {prompt.author.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {prompt.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
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
            <p className="text-muted-foreground">
              검색어나 필터를 조정해보세요
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
