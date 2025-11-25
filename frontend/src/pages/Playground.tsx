import { Fragment, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Save, Sparkles, Settings, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAppStore } from '@/store/useAppStore';
import { getPlaygroundHistory, listPlaygroundHistory, runPlayground } from '@/lib/api/k/playground';
import { fetchModels } from '@/lib/api/k/models';
import { requestPromptTips } from '@/lib/api/k/rag';
import type { PlaygroundHistorySummary } from '@/types/playground';
import type { ModelSummary } from '@/types/model';
import type { RagGuideline } from '@/types/rag';

const ALLOWED_MODEL_IDS = [1, 17];
const MODEL_LABEL_OVERRIDES: Record<number, string> = {
  1: 'ChatGPT',
  17: 'Gemini',
};
const FALLBACK_MODELS: ModelSummary[] = [
  { id: 1, provider: 'openai', model_code: 'gpt', display_name: 'ChatGPT', is_active: true },
  { id: 17, provider: 'google', model_code: 'gemini', display_name: 'Gemini', is_active: true },
];

export function Playground() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [models, setModels] = useState<ModelSummary[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [history, setHistory] = useState<PlaygroundHistorySummary[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTipsLoading, setIsTipsLoading] = useState(false);
  const [tipsError, setTipsError] = useState<string | null>(null);
  const [tipsText, setTipsText] = useState('');
  const [tipsGuidelines, setTipsGuidelines] = useState<RagGuideline[]>([]);
  const [tipsSuggestedPrompt, setTipsSuggestedPrompt] = useState('');

  const extractSuggestedPrompt = (text: string) => {
    const regex = /수정\s*프롬프트[^`]*```([\s\S]*?)```/i;
    const match = text.match(regex);
    if (!match) {
      return { body: text.trim(), prompt: '' };
    }
    const prompt = match[1].trim();
    const body = text.replace(match[0], '').trim();
    return { body, prompt };
  };

  const renderTipsBody = (body: string) => {
    const renderInline = (line: string) => {
      const segments = line.split(/(\*\*[^*]+\*\*|"[^"]+"|“[^”]+”|”[^“]+“)/g).filter(Boolean);
      return segments.map((segment, idx) => {
        if (segment.startsWith('**') && segment.endsWith('**')) {
          return (
            <span key={idx} className="font-semibold">
              {segment.slice(2, -2)}
            </span>
          );
        }
        const normalized = segment.trim();
        if (
          (normalized.startsWith('"') && normalized.endsWith('"')) ||
          (normalized.startsWith('“') && normalized.endsWith('”'))
        ) {
          const content = normalized.slice(1, normalized.length - 1);
          return (
            <span key={idx} className="px-1 py-0.5 rounded-sm bg-muted font-medium">
              “{content}”
            </span>
          );
        }
        return <Fragment key={idx}>{segment}</Fragment>;
      });
    };

    return body
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line, idx) => {
        const cleaned = line.trim().startsWith('*') ? line.trim().replace(/^\*\s*/, '') : line;
        return (
          <p key={idx} className="mb-2 last:mb-0">
            {renderInline(cleaned)}
          </p>
        );
      });
  };

  const loadModels = useCallback(async () => {
    try {
      const response = await fetchModels({ active: true, limit: 50 });
      const available = response.items.filter((item) => ALLOWED_MODEL_IDS.includes(item.id));
      const usable = available.length > 0 ? available : FALLBACK_MODELS;
      setModels(usable);

      if (usable.length === 0) {
        setSelectedModelId(null);
        return;
      }

      if (!selectedModelId || !usable.some((item) => item.id === selectedModelId)) {
        setSelectedModelId(usable[0].id);
      }
    } catch (error) {
      console.error('모델 목록을 불러오지 못했습니다.', error);
      setErrorMessage('모델 목록을 불러오는 중 오류가 발생했습니다.');
    }
  }, [selectedModelId]);

  const loadHistory = useCallback(async () => {
    try {
      const response = await listPlaygroundHistory({ limit: 10 });
      setHistory(response.items);
    } catch (error) {
      console.error('히스토리를 불러오지 못했습니다.', error);
      setErrorMessage('히스토리를 불러오는 중 오류가 발생했습니다.');
    }
  }, []);

  useEffect(() => {
    loadModels();
    loadHistory();
  }, [loadModels, loadHistory]);

  const handleRun = async () => {
    if (!input.trim() || !selectedModelId) return;

    setIsRunning(true);
    setOutput('');
    setErrorMessage(null);

    try {
      const response = await runPlayground({
        prompt_text: input,
        model_id: selectedModelId,
        model_params: {
          temperature,
          max_token: maxTokens,
        },
        analyzer: {
          enabled: true,
        },
      });

      setOutput(response.output);
      await loadHistory();
    } catch (error) {
      console.error('Playground 실행 실패:', error);
      setErrorMessage('실행 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleGenerateTips = async () => {
    if (!input.trim()) {
      setTipsError('프롬프트를 입력한 후 Tips 버튼을 눌러주세요.');
      return;
    }

    setIsTipsLoading(true);
    setTipsError(null);
    setTipsSuggestedPrompt('');

    try {
      const result = await requestPromptTips({
        prompt: input,
        limit: 4,
        temperature,
        maxOutputTokens: 512,
      });
      const { body, prompt } = extractSuggestedPrompt(result.text || '');
      setTipsText(body);
      setTipsSuggestedPrompt(prompt);
      setTipsGuidelines(result.guidelines || []);
    } catch (error) {
      console.error('Tips 생성 실패:', error);
      setTipsError('프롬프트 팁을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsTipsLoading(false);
    }
  };

  const handleLoadHistory = async (historyId: number) => {
    try {
      const detail = await getPlaygroundHistory(historyId);
      setInput(detail.test_content);
      setOutput(detail.output);
      if (detail.model_id) {
        setSelectedModelId(detail.model_id);
      }
    } catch (error) {
      console.error('히스토리를 불러오지 못했습니다.', error);
      setErrorMessage('선택한 실행 기록을 불러오지 못했습니다.');
    }
  };

  const navigate = useNavigate();
  const setSelectedPromptId = useAppStore((state) => state.setSelectedPromptId);
  const setDraftPromptContent = useAppStore((state) => state.setDraftPromptContent);

  const handleSaveAsPrompt = () => {
    if (!input.trim()) return;
    setDraftPromptContent(input);
    setSelectedPromptId(null);
    navigate('/editor');
  };

  const renderSummaryText = (
    preview?: string | null,
    length?: number,
    fallback?: string
  ) => {
    const source = preview ?? fallback;
    if (source && source.trim().length > 0) {
      return source.length > 160 ? `${source.slice(0, 160)}…` : source;
    }
    if (typeof length === 'number') {
      return `${length} chars`;
    }
    return '내용 없음';
  };

  return (
    <div className="min-h-screen gradient-dark-bg gradient-overlay">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-0">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                <h1 className="text-base sm:text-lg lg:text-xl">Playground</h1>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Select
                value={selectedModelId ? String(selectedModelId) : ''}
                onValueChange={(value) => {
                  setSelectedModelId(Number(value));
                }}
              >
                <SelectTrigger className="w-24 sm:w-32 lg:w-40 text-xs sm:text-sm">
                  <SelectValue placeholder="모델 선택" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {MODEL_LABEL_OVERRIDES[item.id] ?? item.display_name ?? `Model ${item.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleRun}
                disabled={isRunning || !input.trim() || !selectedModelId}
                className="glow-primary bg-primary hover:bg-primary/90"
                size="sm"
              >
                <Play className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{isRunning ? 'Running...' : 'Run'}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Left Column - Input */}
          <div className="space-y-4">
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Prompt Input</CardTitle>
                <Collapsible open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-4 space-y-4 pt-4 border-t border-border">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label htmlFor="temp">Temperature</Label>
                          <span className="text-sm text-muted-foreground">{temperature}</span>
                        </div>
                        <Slider
                          id="temp"
                          min={0}
                          max={1}
                          step={0.1}
                          value={[temperature]}
                          onValueChange={(value) => setTemperature(value[0])}
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label htmlFor="tokens">Max Tokens</Label>
                          <span className="text-sm text-muted-foreground">{maxTokens}</span>
                        </div>
                        <Slider
                          id="tokens"
                          min={100}
                          max={4000}
                          step={100}
                          value={[maxTokens]}
                          onValueChange={(value) => setMaxTokens(value[0])}
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your prompt here... Try describing what you want the AI to do."
                  className="min-h-[500px] font-mono text-sm resize-none"
                />
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleGenerateTips}
                    disabled={!input.trim() || isTipsLoading}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {isTipsLoading ? 'Generating...' : 'Prompt Tips'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveAsPrompt}
                    disabled={!input.trim()}
                    className="sm:ml-auto"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save as Prompt
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Output */}
          <div className="space-y-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Output</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 rounded-lg p-4 min-h-[500px] max-h-[600px] overflow-y-auto">
                  {errorMessage && (
                    <div className="mb-4 text-sm text-red-400">
                      {errorMessage}
                    </div>
                  )}
                  {output ? (
                    <div className="whitespace-pre-wrap text-sm">
                      {output}
                      {isRunning && (
                        <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse"></span>
                      )}
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-sm text-center py-12">
                      <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p>Enter a prompt and click "Run" to see the output</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  Prompt Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tipsError && <p className="text-sm text-destructive mb-3">{tipsError}</p>}
                {tipsText ? (
                  <div className="space-y-4">
                    <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1">
                      {renderTipsBody(tipsText)}
                    </div>
                    {tipsSuggestedPrompt && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          수정 프롬프트
                        </p>
                        <pre className="bg-card border border-border rounded-md p-3 text-xs whitespace-pre-wrap">
                          {tipsSuggestedPrompt}
                        </pre>
                      </div>
                    )}
                    {tipsGuidelines.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          참고한 가이드라인
                        </p>
                        <div className="space-y-2">
                          {tipsGuidelines.map((item) => {
                            const snippet =
                              item.content.length > 160
                                ? `${item.content.slice(0, 160)}…`
                                : item.content;
                            return (
                              <div
                                key={item.id}
                                className="p-2 rounded-md border border-border bg-card text-sm"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium">{item.title}</span>
                                  {typeof item.similarity === 'number' && (
                                    <Badge variant="outline">
                                      {(item.similarity * 100).toFixed(0)}%
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {snippet}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {isTipsLoading
                      ? '프롬프트 팁을 불러오는 중입니다...'
                      : '왼쪽 Prompt Input 영역에서 프롬프트를 입력한 뒤 "Prompt Tips" 버튼을 눌러보세요.'}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* History Section */}
        <Card className="mt-8 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Executions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {history.length > 0 ? (
              <div className="space-y-4">
                {history.map((item) => (
                  <div key={item.id} className="p-4 bg-muted/50 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">Model #{item.model_id}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.tested_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Input</p>
                        <div className="bg-card p-2 rounded text-sm max-h-24 overflow-hidden">
                          {renderSummaryText(
                            item.summary?.input_preview,
                            item.summary?.input_len,
                            item.test_content
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Output</p>
                        <div className="bg-card p-2 rounded text-sm max-h-24 overflow-hidden">
                          {renderSummaryText(
                            item.summary?.output_preview,
                            item.summary?.output_len,
                            item.output
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleLoadHistory(item.id)}>
                        Load
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-sm text-muted-foreground py-8">
                최근 실행 기록이 없습니다. 프롬프트를 실행하면 이곳에 기록이 표시됩니다.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
