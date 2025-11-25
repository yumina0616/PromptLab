import { useState } from 'react';
import { Mail, Lock, User, ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import logoImage from '@/assets/logo.png';
import { useAppStore } from '@/store/useAppStore';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    userid: '',
    displayName: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const loginAction = useAppStore((state) => state.login);
  const registerAction = useAppStore((state) => state.register);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isLogin) {
        // 로그인
        await loginAction(formData.email, formData.password);
      } else {
        // 회원가입 필드 검증
        if (!formData.userid || !formData.displayName) {
          setError('모든 필드를 입력해주세요.');
          setIsLoading(false);
          return;
        }
        await registerAction(formData.email, formData.password, formData.userid, formData.displayName);
      }

      // 성공 시 홈으로 이동
      navigate('/', { replace: true });
    } catch (err) {
      // 에러 처리
      console.error('Auth error:', err);

      const error = err as { response?: { data?: { error?: { code?: string; message?: string } } } };
      const errorCode = error.response?.data?.error?.code;
      const errorMessage = error.response?.data?.error?.message;

      if (errorCode === 'EMAIL_TAKEN') {
        setError('이미 사용 중인 이메일입니다.');
      } else if (errorCode === 'USERID_TAKEN') {
        setError('이미 사용 중인 사용자명입니다.');
      } else if (errorCode === 'WEAK_PASSWORD') {
        setError('비밀번호가 너무 약합니다. 더 강력한 비밀번호를 사용해주세요.');
      } else if (errorCode === 'INVALID_CREDENTIALS') {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else if (errorMessage) {
        setError(errorMessage);
      } else {
        setError('인증에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-dark-bg gradient-overlay pb-20">
      {/* Header */}
      <header className="border-b glass-strong sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>뒤로</span>
          </button>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-8">
        <Card className="border-border">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center mx-auto mb-4">
              <img src={logoImage} alt="PromptLab" className="w-24 h-24 object-contain" />
            </div>
            <CardTitle className="text-2xl">
              {isLogin ? '다시 오신 것을 환영합니다' : '계정 만들기'}
            </CardTitle>
            <CardDescription>
              {isLogin ? '프롬프트 세상으로 돌아오신 것을 환영합니다' : '새로운 프롬프트 여정을 시작하세요'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {}
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {}
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="userid">사용자명 (userid)</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="userid"
                        type="text"
                        placeholder="your_userid"
                        className="pl-10"
                        value={formData.userid}
                        onChange={(e) => setFormData({...formData, userid: e.target.value})}
                        required={!isLogin}
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="displayName">표시 이름</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="displayName"
                        type="text"
                        placeholder="홍길동"
                        className="pl-10"
                        value={formData.displayName}
                        onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                        required={!isLogin}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  isLogin ? '로그인' : '계정 만들기'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                }}
                className="text-sm text-muted-foreground"
                disabled={isLoading}
              >
                {isLogin ? '계정이 없으신가요? ' : '이미 계정이 있으신가요? '}
                <span className="text-primary hover:underline">
                  {isLogin ? '가입하기' : '로그인'}
                </span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
