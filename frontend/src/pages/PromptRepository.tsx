import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, GitFork, Play, Clock, MessageSquare, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/store/useAppStore';

export function PromptRepository() {
  const prompt = useAppStore((state) => state.selectedPrompt);
  const setSelectedPrompt = useAppStore((state) => state.setSelectedPrompt);
  const navigate = useNavigate();

  if (!prompt) {
    return (
      <div className="min-h-screen gradient-dark-bg gradient-overlay flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-2xl font-semibold">선택된 프롬프트가 없습니다</h2>
          <p className="text-muted-foreground">
            홈에서 프롬프트를 선택하거나 검색 결과에서 다시 시도해주세요.
          </p>
          <Button onClick={() => navigate('/')}>홈으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState(prompt.model);
  const goHome = () => {
    setSelectedPrompt(undefined);
    navigate('/');
  };

  // Get current version data
  const getCurrentVersionData = () => {
    if (!selectedVersion) {
      // Return the main prompt data
      return {
        content: prompt.content,
        model: prompt.model,
        temperature: prompt.temperature,
        maxTokens: prompt.maxTokens,
        updatedAt: prompt.updatedAt,
        description: prompt.description
      };
    }
    
    // Find the selected version
    const version = prompt.versions.find(v => v.version === selectedVersion);
    if (version) {
      return {
        content: version.content,
        model: version.model || prompt.model,
        temperature: version.temperature !== undefined ? version.temperature : prompt.temperature,
        maxTokens: version.maxTokens || prompt.maxTokens,
        updatedAt: version.createdAt,
        description: version.description || version.commitMessage
      };
    }
    
    // Fallback to main prompt data
    return {
      content: prompt.content,
      model: prompt.model,
      temperature: prompt.temperature,
      maxTokens: prompt.maxTokens,
      updatedAt: prompt.updatedAt,
      description: prompt.description
    };
  };

  const currentData = getCurrentVersionData();

  const handleRun = async () => {
    setIsRunning(true);
    setOutput('');
    
    // Simulate streaming output
    const mockOutput = `# Analysis Results

Based on the prompt configuration, here are the key insights:

## Summary
The prompt is well-structured and provides clear instructions for the AI model to follow.

## Strengths
- Clear objective and scope
- Structured output format
- Specific requirements

## Recommendations
1. Consider adding more context about edge cases
2. Include examples for better consistency
3. Specify output length constraints

## Output Quality: 9/10
The prompt should produce high-quality, consistent results.`;

    const words = mockOutput.split(' ');
    for (let i = 0; i < words.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      setOutput(prev => prev + (i === 0 ? '' : ' ') + words[i]);
    }
    
    setIsRunning(false);
  };

  return (
    <div className="min-h-screen gradient-dark-bg gradient-overlay">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-0">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Button variant="ghost" size="icon" onClick={goHome} className="flex-shrink-0">
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-lg lg:text-xl truncate">{prompt.title}</h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">by @{prompt.author.username}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" className="hidden sm:flex">
                <Star className="w-4 h-4 mr-2" />
                Star {prompt.stars}
              </Button>
              <Button variant="outline" size="icon" className="sm:hidden">
                <Star className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" className="hidden lg:flex">
                <GitFork className="w-4 h-4 mr-2" />
                Fork {prompt.forks}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedPrompt(prompt);
                  navigate('/editor');
                }}
                className="hidden sm:flex"
              >
                + New Version
              </Button>
              <Button
                size="icon"
                onClick={() => {
                  setSelectedPrompt(prompt);
                  navigate('/editor');
                }}
                className="sm:hidden"
              >
                +
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Left Column - Prompt Content */}
          <div className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <CardTitle>Prompt Content</CardTitle>
                    {selectedVersion && (
                      <Badge variant="default" className="bg-primary">
                        {selectedVersion}
                      </Badge>
                    )}
                  </div>
                  <Badge variant="secondary">{prompt.category}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {prompt.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                {selectedVersion && (
                  <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {currentData.description}
                    </p>
                  </div>
                )}
                <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                  <pre className="whitespace-pre-wrap">{currentData.content}</pre>
                </div>
                <div className="mt-4 pt-4 border-t border-border space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Model:</span>
                    <span>{currentData.model}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Temperature:</span>
                    <span>{currentData.temperature}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Max Tokens:</span>
                    <span>{currentData.maxTokens}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Updated:</span>
                    <span>{currentData.updatedAt}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Version History */}
            {prompt.versions.length > 0 && (
              <Card className="border-border">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Version History</CardTitle>
                  {selectedVersion && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedVersion(null)}
                      className="text-xs"
                    >
                      현재 버전 보기
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Current version indicator */}
                    {!selectedVersion && (
                      <div className="flex items-start gap-3 pb-3 border-b border-border bg-primary/5 -mx-3 px-3 py-3 rounded-lg mb-3">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <Code2 className="w-4 h-4 text-primary-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm">Current</span>
                            <Badge variant="default" className="text-xs">Latest</Badge>
                            <span className="text-xs text-muted-foreground">{prompt.updatedAt}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{prompt.description}</p>
                        </div>
                      </div>
                    )}
                    
                    {prompt.versions.map((version) => (
                      <div 
                        key={version.version} 
                        className={`flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0 cursor-pointer hover:bg-muted/50 -mx-3 px-3 py-2 rounded-lg transition-colors ${
                          selectedVersion === version.version ? 'bg-primary/5 border-primary/20' : ''
                        }`}
                        onClick={() => setSelectedVersion(version.version)}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          selectedVersion === version.version ? 'bg-primary' : 'bg-primary/20'
                        }`}>
                          <Code2 className={`w-4 h-4 ${
                            selectedVersion === version.version ? 'text-primary-foreground' : 'text-primary'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm">{version.version}</span>
                            {selectedVersion === version.version && (
                              <Badge variant="default" className="text-xs">Viewing</Badge>
                            )}
                            <span className="text-xs text-muted-foreground">{version.createdAt}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{version.commitMessage}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Execution & Results */}
          <div className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Run & Test</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm mb-2 block">Select Model</label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GPT-4">GPT-4</SelectItem>
                      <SelectItem value="GPT-3.5">GPT-3.5 Turbo</SelectItem>
                      <SelectItem value="Claude">Claude 3</SelectItem>
                      <SelectItem value="Ollama">Ollama (Local)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  className="w-full glow-primary bg-primary hover:bg-primary/90" 
                  onClick={handleRun}
                  disabled={isRunning}
                >
                  <Play className="w-4 h-4 mr-2" />
                  {isRunning ? 'Running...' : 'Run Prompt'}
                </Button>

                <Tabs defaultValue="output" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="output">Output</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                  </TabsList>
                  <TabsContent value="output" className="space-y-4">
                    <div className="bg-muted/50 rounded-lg p-4 min-h-[300px] max-h-[500px] overflow-y-auto">
                      {output ? (
                        <pre className="whitespace-pre-wrap text-sm">{output}</pre>
                      ) : (
                        <div className="text-muted-foreground text-sm text-center py-12">
                          Click "Run Prompt" to see the output
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="history" className="space-y-4">
                    <div className="space-y-3">
                      {[
                        { time: '2 hours ago', model: 'GPT-4', duration: '2.3s' },
                        { time: '1 day ago', model: 'Claude', duration: '1.8s' },
                        { time: '3 days ago', model: 'GPT-4', duration: '2.1s' }
                      ].map((exec, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm">{exec.model}</p>
                              <p className="text-xs text-muted-foreground">{exec.time}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">{exec.duration}</Badge>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Comments Section */}
        <Card className="mt-8 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Discussion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea 
              placeholder="프롬프트에 대한 피드백이나 질문을 남겨주세요..." 
              className="mb-4"
            />
            <Button size="sm">Comment</Button>
            
            <div className="mt-6 space-y-4">
              <div className="text-sm text-muted-foreground text-center py-8">
                아직 댓글이 없습니다. 첫 번째 댓글을 남겨보세요!
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
