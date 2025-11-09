import { ArrowLeft, TrendingUp, Clock, Star } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockPrompts, categoryInfo } from '@/lib/mock-data';
import type { NavigateHandler, PromptCategory } from '@/types/navigation';

interface CategoryPageProps {
  category: PromptCategory;
  onNavigate: NavigateHandler;
}

export function CategoryPage({ category, onNavigate }: CategoryPageProps) {
  const categoryData = categoryInfo[category];
  const categoryPrompts = mockPrompts.filter(p => p.category === category);

  return (
    <div className="min-h-screen gradient-dark-bg gradient-overlay">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-3 sm:mb-4"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-base">Back to Explore</span>
          </button>
          
          <div className="flex items-center gap-3 sm:gap-4">
            <div className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 ${categoryData.color} rounded-xl flex items-center justify-center shadow-lg flex-shrink-0`}>
              <span className="text-2xl sm:text-3xl">
                {category === 'Dev' && '💻'}
                {category === 'Marketing' && '📢'}
                {category === 'Design' && '🎨'}
                {category === 'Edu' && '🎓'}
                {category === 'Data' && '📊'}
              </span>
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl lg:text-2xl">{categoryData.name}</h2>
              <p className="text-muted-foreground mt-1 text-xs sm:text-sm">{categoryData.description}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Tabs defaultValue="trending" className="space-y-4 sm:space-y-6">
          <TabsList className="grid grid-cols-3 w-full sm:w-auto">
            <TabsTrigger value="trending" className="text-xs sm:text-sm">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Trending</span>
            </TabsTrigger>
            <TabsTrigger value="recent" className="text-xs sm:text-sm">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Recent</span>
            </TabsTrigger>
            <TabsTrigger value="popular" className="text-xs sm:text-sm">
              <Star className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Most Popular</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trending" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {categoryPrompts.map((prompt) => (
                <Card 
                  key={prompt.id}
                  className="card-hover cursor-pointer border-border hover:border-primary"
                  onClick={() => onNavigate('repository', prompt)}
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
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">by {prompt.author.name}</span>
                      <div className="flex gap-2">
                        {prompt.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="recent" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[...categoryPrompts].reverse().map((prompt) => (
                <Card 
                  key={prompt.id}
                  className="card-hover cursor-pointer border-border hover:border-primary"
                  onClick={() => onNavigate('repository', prompt)}
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
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">by {prompt.author.name}</span>
                      <span className="text-xs text-muted-foreground">{prompt.updatedAt}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="popular" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...categoryPrompts].sort((a, b) => b.stars - a.stars).map((prompt) => (
                <Card 
                  key={prompt.id}
                  className="card-hover cursor-pointer border-border hover:border-primary"
                  onClick={() => onNavigate('repository', prompt)}
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
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">by {prompt.author.name}</span>
                      <Badge className="bg-primary">#{categoryPrompts.findIndex(p => p.id === prompt.id) + 1}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
