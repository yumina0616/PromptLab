import { Search, TrendingUp, Sparkles, Code2, Megaphone, Palette, GraduationCap, BarChart } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trendingPrompts, newPrompts, categoryInfo } from '@/lib/mock-data';
import logoImage from '@/assets/logo.png';
import type { Prompt } from '@/lib/mock-data';
import type { PromptCategory } from '@/types/navigation';
import { useAppStore } from '@/store/useAppStore';

export function HomePage() {
  const [searchInput, setSearchInput] = useState('');
  const navigate = useNavigate();
  const setSelectedPrompt = useAppStore((state) => state.setSelectedPrompt);
  const setSelectedCategory = useAppStore((state) => state.setSelectedCategory);
  const setSearchQuery = useAppStore((state) => state.setSearchQuery);
  const categoryIcons: Record<string, LucideIcon> = {
    'Code2': Code2,
    'Megaphone': Megaphone,
    'Palette': Palette,
    'GraduationCap': GraduationCap,
    'BarChart': BarChart
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchQuery(searchInput);
      navigate('/search');
    }
  };

  const openPrompt = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    navigate('/repository');
  };

  const openCategory = (category: PromptCategory) => {
    setSelectedCategory(category);
    navigate('/category');
  };

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {trendingPrompts.map((prompt) => (
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
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>by {prompt.author.name}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* New Prompts */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
            <h3 className="text-lg sm:text-xl">최신 프롬프트</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {newPrompts.map((prompt) => (
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
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>by {prompt.author.name}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Category Grid */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl">카테고리별 탐색</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {Object.entries(categoryInfo).map(([key, info]) => {
              const IconComponent = categoryIcons[info.icon];
              if (!IconComponent) return null;
              return (
                <Card 
                  key={key}
                  className="card-hover cursor-pointer border-border hover:border-accent"
                  onClick={() => openCategory(key as PromptCategory)}
                >
                  <CardHeader className="text-center">
                    <div className={`w-12 h-12 ${info.color} rounded-lg flex items-center justify-center mx-auto mb-3 shadow-lg`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-base">{info.name}</CardTitle>
                    <CardDescription className="text-xs">{info.description}</CardDescription>
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
