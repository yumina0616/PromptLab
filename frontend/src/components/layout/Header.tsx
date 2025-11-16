import { Code2, User, LogOut, Settings, Users, Menu } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription, SheetHeader } from '@/components/ui/sheet';
import logoImage from '@/assets/logo.png';
import { useAppStore } from '@/store/useAppStore';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const logout = useAppStore((state) => state.logout);
  const setSelectedPrompt = useAppStore((state) => state.setSelectedPrompt);

  if (!isAuthenticated) return null;

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    logout();
    navigate('/auth', { replace: true });
  };

  const goToEditor = () => {
    setSelectedPrompt(undefined);
    handleNavigation('/editor');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="glass-strong sticky top-0 z-50 border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-4 sm:gap-8">
          <button
            onClick={() => handleNavigation('/')}
            className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity"
          >
            <img src={logoImage} alt="PromptLab" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
            <h1 className="text-base sm:text-lg">PromptLab</h1>
          </button>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            <button 
              onClick={() => handleNavigation('/')}
              className={`transition-colors ${
                isActive('/') 
                  ? 'text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Home
            </button>
            <button 
              onClick={() => handleNavigation('/playground')}
              className={`transition-colors ${
                isActive('/playground') 
                  ? 'text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Playground
            </button>
            <button 
              onClick={() => handleNavigation('/team')}
              className={`flex items-center gap-1.5 transition-colors ${
                isActive('/team') 
                  ? 'text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="w-4 h-4" />
              Team
            </button>
            <button 
              onClick={() => handleNavigation('/profile')}
              className={`transition-colors ${
                isActive('/profile') 
                  ? 'text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              My Prompts
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Desktop New Prompt Button */}
          <Button 
            onClick={goToEditor} 
            className="hidden sm:flex glow-primary bg-primary hover:bg-primary/90"
            size="sm"
          >
            <Code2 className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">새 프롬프트</span>
          </Button>

          {/* Mobile New Prompt Button */}
          <Button 
            onClick={goToEditor} 
            className="sm:hidden glow-primary bg-primary hover:bg-primary/90"
            size="icon"
          >
            <Code2 className="w-4 h-4" />
          </Button>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Avatar className="w-8 h-8 border-2 border-primary/20">
                  <AvatarFallback className="bg-primary text-white text-sm">
                    DM
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm">김개발</p>
                <p className="text-xs text-muted-foreground">@dev_master</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleNavigation('/profile')}>
                <User className="w-4 h-4 mr-2" />
                프로필
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNavigation('/settings')}>
                <Settings className="w-4 h-4 mr-2" />
                설정
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                로그아웃
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Button */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader className="sr-only">
                <SheetTitle>메뉴</SheetTitle>
                <SheetDescription>사이트 내비게이션 메뉴</SheetDescription>
              </SheetHeader>
              <nav className="flex flex-col gap-4 mt-8">
                <button 
                  onClick={() => handleNavigation('/')}
                  className={`text-left px-4 py-3 rounded-lg transition-colors ${
                    isActive('/') 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted'
                  }`}
                >
                  Home
                </button>
                <button 
                  onClick={() => handleNavigation('/playground')}
                  className={`text-left px-4 py-3 rounded-lg transition-colors ${
                    isActive('/playground') 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted'
                  }`}
                >
                  Playground
                </button>
                <button 
                  onClick={() => handleNavigation('/team')}
                  className={`text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-2 ${
                    isActive('/team') 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Team
                </button>
                <button 
                  onClick={() => handleNavigation('/profile')}
                  className={`text-left px-4 py-3 rounded-lg transition-colors ${
                    isActive('/profile') 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted'
                  }`}
                >
                  My Prompts
                </button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
