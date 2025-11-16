import { ArrowLeft, Settings, Star, GitFork, Code2, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { mockPrompts } from '@/lib/mock-data';
import type { Prompt } from '@/lib/mock-data';
import { useAppStore } from '@/store/useAppStore';

export function UserProfile() {
  const navigate = useNavigate();
  const logout = useAppStore((state) => state.logout);
  const setSelectedPrompt = useAppStore((state) => state.setSelectedPrompt);
  const user = {
    username: 'dev_master',
    name: '김개발',
    bio: '풀스택 개발자 | AI 프롬프트 엔지니어 | 오픈소스 기여자',
    avatar: 'DM',
    stats: {
      prompts: 12,
      stars: 3247,
      forks: 456
    }
  };

  const myPrompts = mockPrompts.slice(0, 3);
  const starredPrompts = mockPrompts.slice(2, 5);
  const forkedPrompts = mockPrompts.slice(1, 4);

  const openPrompt = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    navigate('/repository');
  };

  const renderPromptCard = (prompt: Prompt) => (
    <Card 
      key={prompt.id}
      className="card-hover cursor-pointer border-border hover:border-primary active:scale-[0.98]"
      onClick={() => openPrompt(prompt)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between mb-2">
          <Badge variant="secondary" className="text-xs">{prompt.category}</Badge>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              {prompt.stars}
            </span>
            <span className="flex items-center gap-1">
              <GitFork className="w-3 h-3" />
              {prompt.forks}
            </span>
          </div>
        </div>
        <CardTitle className="text-base">{prompt.title}</CardTitle>
        <CardDescription className="text-sm line-clamp-2">{prompt.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{prompt.updatedAt} 업데이트</span>
          <span className="text-xs text-accent">보기 →</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen gradient-dark-bg gradient-overlay">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <h1 className="text-base sm:text-lg lg:text-xl">프로필</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Profile Header */}
        <Card className="mb-6 sm:mb-8 border-border">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
              <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-primary/20 glow-primary">
                <AvatarFallback className="bg-primary text-white text-xl sm:text-2xl">
                  {user.avatar}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 w-full sm:w-auto">
                <h2 className="mb-1 text-xl sm:text-2xl">{user.name}</h2>
                <p className="text-muted-foreground mb-2 sm:mb-3 text-sm sm:text-base">@{user.username}</p>
                <p className="text-xs sm:text-sm mb-3 sm:mb-4">{user.bio}</p>
                
                <div className="flex items-center gap-4 sm:gap-6">
                  <div>
                    <span className="text-xl sm:text-2xl">{user.stats.prompts}</span>
                    <p className="text-xs text-muted-foreground">Prompts</p>
                  </div>
                  <div className="w-px h-8 sm:h-10 bg-border"></div>
                  <div>
                    <span className="text-xl sm:text-2xl">{user.stats.stars}</span>
                    <p className="text-xs text-muted-foreground">Stars</p>
                  </div>
                  <div className="w-px h-8 sm:h-10 bg-border"></div>
                  <div>
                    <span className="text-xl sm:text-2xl">{user.stats.forks}</span>
                    <p className="text-xs text-muted-foreground">Forks</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" onClick={() => navigate('/settings')} size="sm" className="flex-1 sm:flex-none">
                  <Settings className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">설정</span>
                </Button>
                <Button
                  onClick={() => {
                    setSelectedPrompt(undefined);
                    navigate('/editor');
                  }}
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  <Code2 className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">새 프롬프트</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="my-prompts" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4 sm:mb-6">
            <TabsTrigger value="my-prompts" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">내 프롬프트</span>
              <span className="sm:hidden">내 것</span> ({myPrompts.length})
            </TabsTrigger>
            <TabsTrigger value="starred" className="text-xs sm:text-sm">
              스타 ({starredPrompts.length})
            </TabsTrigger>
            <TabsTrigger value="forked" className="text-xs sm:text-sm">
              포크 ({forkedPrompts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-prompts" className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myPrompts.map(renderPromptCard)}
            </div>
          </TabsContent>

          <TabsContent value="starred" className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {starredPrompts.map(renderPromptCard)}
            </div>
          </TabsContent>

          <TabsContent value="forked" className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {forkedPrompts.map(renderPromptCard)}
            </div>
          </TabsContent>
        </Tabs>

        {/* Activity Section */}
        <Card className="mt-6 border-border">
          <CardHeader>
            <CardTitle>최근 활동</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { action: '생성', prompt: '코드 리뷰 어시스턴트', time: '2시간 전' },
                { action: '스타', prompt: '마케팅 카피 생성기', time: '1일 전' },
                { action: '포크', prompt: '디자인 시스템 문서화', time: '3일 전' },
                { action: '업데이트', prompt: 'API 문서 작성기', time: '5일 전' }
              ].map((activity, i) => (
                <div key={i} className="flex items-center gap-4 pb-4 border-b border-border last:border-0 last:pb-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Code2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="text-muted-foreground">{activity.action}</span>{' '}
                      <span className="font-medium">{activity.prompt}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Logout Button */}
        <Button 
          variant="outline" 
          className="w-full mt-6 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
          onClick={() => {
            logout();
            navigate('/auth', { replace: true });
          }}
        >
          <LogOut className="w-4 h-4 mr-2" />
          로그아웃
        </Button>
      </div>
    </div>
  );
}
