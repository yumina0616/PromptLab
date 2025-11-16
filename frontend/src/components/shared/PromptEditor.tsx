import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Eye, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { Prompt } from '@/lib/mock-data';
import { useAppStore } from '@/store/useAppStore';

export function PromptEditor() {
  const prompt = useAppStore((state) => state.selectedPrompt);
  const setSelectedPrompt = useAppStore((state) => state.setSelectedPrompt);
  const navigate = useNavigate();
  const [title, setTitle] = useState(prompt?.title || '');
  const [description, setDescription] = useState(prompt?.description || '');
  const [content, setContent] = useState(prompt?.content || '');
  const [category, setCategory] = useState<Prompt['category']>(prompt?.category ?? 'Dev');
  const [model, setModel] = useState(prompt?.model || 'GPT-4');
  const [temperature, setTemperature] = useState(prompt?.temperature || 0.7);
  const [maxTokens, setMaxTokens] = useState(prompt?.maxTokens || 2000);
  const [tags, setTags] = useState(prompt?.tags.join(', ') || '');
  const [commitMessage, setCommitMessage] = useState('');
  const [previewOutput, setPreviewOutput] = useState('');
  const [isPreviewRunning, setIsPreviewRunning] = useState(false);

  const handleSave = () => {
    // Mock save functionality
    alert('Prompt saved successfully!');
    setSelectedPrompt(undefined);
    navigate('/');
  };

  const handleBack = () => {
    setSelectedPrompt(undefined);
    navigate('/');
  };

  const handlePreview = async () => {
    setIsPreviewRunning(true);
    setPreviewOutput('');

    const mockOutput = `# Preview Output

This is a preview of how your prompt will execute with the current settings.

**Model:** ${model}
**Temperature:** ${temperature}
**Max Tokens:** ${maxTokens}

## Sample Response
Your prompt structure looks good! The AI will respond according to the instructions you've provided.`;

    const words = mockOutput.split(' ');
    for (let i = 0; i < words.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 40));
      setPreviewOutput(prev => prev + (i === 0 ? '' : ' ') + words[i]);
    }

    setIsPreviewRunning(false);
  };

  return (
    <div className="min-h-screen gradient-dark-bg gradient-overlay">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <h1 className="text-base sm:text-lg lg:text-xl">{prompt ? 'Edit Prompt' : 'New Prompt'}</h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="outline" onClick={handlePreview} size="sm" className="hidden sm:flex">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button variant="outline" onClick={handlePreview} size="icon" className="sm:hidden">
              <Eye className="w-4 h-4" />
            </Button>
            <Button onClick={handleSave} size="sm" className="hidden sm:flex">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button onClick={handleSave} size="icon" className="sm:hidden">
              <Save className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Left Column - Editor */}
          <div className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Prompt Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Code Review Assistant"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of what this prompt does..."
                    className="mt-2"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={category} onValueChange={(value) => setCategory(value as Prompt['category'])}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Dev">개발</SelectItem>
                        <SelectItem value="Marketing">마케팅</SelectItem>
                        <SelectItem value="Design">디자인</SelectItem>
                        <SelectItem value="Edu">HR/교육</SelectItem>
                        <SelectItem value="Data">데이터</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="tags">Tags</Label>
                    <Input
                      id="tags"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="tag1, tag2, tag3"
                      className="mt-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Prompt Content</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your prompt here... Use {variable_name} for placeholders."
                  className="font-mono text-sm min-h-[400px]"
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setContent(content + ' {variable}')}>
                    + Variable
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setContent(content + '\n\n## Section\n')}>
                    + Section
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setContent(content + '\n- Item\n')}>
                    + List
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="w-5 h-5" />
                  Model Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="model">Model</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="mt-2">
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

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="temperature">Temperature</Label>
                    <span className="text-sm text-muted-foreground">{temperature}</span>
                  </div>
                  <Slider
                    id="temperature"
                    min={0}
                    max={1}
                    step={0.1}
                    value={[temperature]}
                    onValueChange={(value) => setTemperature(value[0])}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Higher values make output more random, lower values more focused
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="maxTokens">Max Tokens</Label>
                    <span className="text-sm text-muted-foreground">{maxTokens}</span>
                  </div>
                  <Slider
                    id="maxTokens"
                    min={100}
                    max={4000}
                    step={100}
                    value={[maxTokens]}
                    onValueChange={(value) => setMaxTokens(value[0])}
                    className="mt-2"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Commit Message</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="e.g., Added improved prompt for summarization"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Describe what changed in this version
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Preview */}
          <div className="space-y-6">
            <Card className="border-border sticky top-24">
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="preview" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                    <TabsTrigger value="output">Test Output</TabsTrigger>
                  </TabsList>
                  <TabsContent value="preview" className="space-y-4">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <h4 className="mb-2">{title || 'Untitled Prompt'}</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        {description || 'No description provided'}
                      </p>
                      <div className="flex gap-2 mb-4">
                        <Badge>{category}</Badge>
                        {tags.split(',').filter(t => t.trim()).map((tag, i) => (
                          <Badge key={i} variant="outline">{tag.trim()}</Badge>
                        ))}
                      </div>
                      <div className="bg-card rounded-lg p-3 font-mono text-sm border border-border">
                        <pre className="whitespace-pre-wrap">{content || 'No content yet...'}</pre>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Model:</span>
                        <span>{model}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Temperature:</span>
                        <span>{temperature}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Max Tokens:</span>
                        <span>{maxTokens}</span>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="output" className="space-y-4">
                    <Button 
                      onClick={handlePreview} 
                      disabled={isPreviewRunning || !content}
                      className="w-full glow-primary bg-primary hover:bg-primary/90"
                    >
                      {isPreviewRunning ? 'Running...' : 'Test Run'}
                    </Button>
                    <div className="bg-muted/50 rounded-lg p-4 min-h-[300px] max-h-[500px] overflow-y-auto">
                      {previewOutput ? (
                        <pre className="whitespace-pre-wrap text-sm">{previewOutput}</pre>
                      ) : (
                        <div className="text-muted-foreground text-sm text-center py-12">
                          Click "Test Run" to preview the output
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
