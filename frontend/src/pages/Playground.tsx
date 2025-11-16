import { useState } from 'react';
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

export function Playground() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [model, setModel] = useState('GPT-4');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [history, setHistory] = useState<Array<{input: string; output: string; timestamp: string; model: string}>>([]);

  const handleRun = async () => {
    if (!input.trim()) return;

    setIsRunning(true);
    setOutput('');

    const mockOutput = `Based on your input, here's a comprehensive response:

## Analysis

Your prompt is clear and well-structured. Here are some key observations:

1. **Clarity**: The instructions are easy to follow
2. **Specificity**: The requirements are well-defined
3. **Structure**: Good organization of information

## Recommendations

- Consider adding more context for edge cases
- Specify the desired output format
- Include examples for consistency

## Output

The AI model will generate responses according to your specifications. This playground allows you to test different configurations and see how they affect the results.

**Configuration Used:**
- Model: ${model}
- Temperature: ${temperature}
- Max Tokens: ${maxTokens}

Feel free to adjust the parameters and run again to see different results!`;

    const words = mockOutput.split(' ');
    for (let i = 0; i < words.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 30));
      setOutput(prev => prev + (i === 0 ? '' : ' ') + words[i]);
    }

    setIsRunning(false);

    // Add to history
    setHistory(prev => [{
      input: input,
      output: mockOutput,
      timestamp: new Date().toLocaleTimeString(),
      model: model
    }, ...prev]);
  };

  const navigate = useNavigate();
  const setSelectedPrompt = useAppStore((state) => state.setSelectedPrompt);

  const handleSaveAsPrompt = () => {
    setSelectedPrompt(undefined);
    navigate('/editor');
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
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="w-24 sm:w-32 lg:w-40 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GPT-4">GPT-4</SelectItem>
                  <SelectItem value="GPT-3.5">GPT-3.5 Turbo</SelectItem>
                  <SelectItem value="Claude">Claude 3</SelectItem>
                  <SelectItem value="Ollama">Ollama (Local)</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleRun} disabled={isRunning || !input.trim()} className="glow-primary bg-primary hover:bg-primary/90" size="sm">
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
                <div className="mt-4 flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleSaveAsPrompt}
                    disabled={!input.trim()}
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
          </div>
        </div>

        {/* History Section */}
        {history.length > 0 && (
          <Card className="mt-8 border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recent Executions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {history.map((item, index) => (
                  <div key={index} className="p-4 bg-muted/50 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">{item.model}</Badge>
                      <span className="text-xs text-muted-foreground">{item.timestamp}</span>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Input</p>
                        <div className="bg-card p-2 rounded text-sm font-mono max-h-20 overflow-hidden">
                          {item.input.substring(0, 100)}...
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Output</p>
                        <div className="bg-card p-2 rounded text-sm max-h-20 overflow-hidden">
                          {item.output.substring(0, 100)}...
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setInput(item.input);
                          setOutput(item.output);
                        }}
                      >
                        Load
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
