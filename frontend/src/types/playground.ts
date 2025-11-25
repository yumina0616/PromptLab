export interface PlaygroundModelParams {
  temperature?: number;
  max_token?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface PlaygroundRunRequest {
  prompt_text: string;
  model_id: number;
  model_params?: PlaygroundModelParams;
  variables?: Record<string, string>;
  source?: {
    prompt_id?: number;
    prompt_version_id?: number;
  };
  analyzer?: {
    enabled: boolean;
    rules?: string[];
  };
}

export interface PlaygroundAnalyzerIssue {
  type: string;
  message: string;
  range?: {
    start: number;
    end: number;
  };
}

export interface PlaygroundAnalyzerSuggestion {
  title: string;
  example: string;
}

export interface PlaygroundAnalyzerResult {
  enabled: boolean;
  score?: number;
  issues?: PlaygroundAnalyzerIssue[];
  suggestions?: PlaygroundAnalyzerSuggestion[];
  checks?: Record<string, number>;
}

export interface PlaygroundRunResponse {
  output: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  model: {
    id: number;
    temperature?: number;
    max_token?: number | null;
    top_p?: number | null;
  };
  analyzer: PlaygroundAnalyzerResult;
  history_id: number | null;
  status: string;
}

export interface PlaygroundGrammarCheckResponse {
  score: number;
  issues: PlaygroundAnalyzerIssue[];
  suggestions: PlaygroundAnalyzerSuggestion[];
  checks: Record<string, number>;
}

export interface PlaygroundGrammarCheckRequest {
  prompt_text: string;
  rules?: string[];
}

export interface PlaygroundHistorySummary {
  id: number;
  prompt_version_id: number | null;
  model_id: number;
  tested_at: string;
  test_content?: string;
  output?: string;
  summary: {
    input_preview?: string | null;
    output_preview?: string | null;
    input_len: number;
    output_len: number;
    analyzer_score: number | null;
    status: string;
  };
}

export interface PlaygroundHistoryListResponse {
  items: PlaygroundHistorySummary[];
  page: number;
  limit: number;
  total: number;
}

export interface PlaygroundHistoryDetail {
  id: number;
  prompt_version_id: number | null;
  model_id: number;
  user_id: number;
  test_content: string;
  model_setting: PlaygroundModelParams & { ai_model_id?: number };
  output: string;
  tested_at: string;
  analyzer: PlaygroundAnalyzerResult;
}

export interface PlaygroundHistoryQuery {
  page?: number;
  limit?: number;
  model_id?: number;
  from?: string;
  to?: string;
}

export type PlaygroundSaveMode = 'new_prompt' | 'new_version';

export interface PlaygroundSaveRequest {
  mode: PlaygroundSaveMode;
  prompt?: {
    name: string;
    description?: string;
    visibility?: string;
    tags?: string[];
  };
  version?: {
    content?: string;
    model_setting?: PlaygroundModelParams & { ai_model_id: number };
    commit_message?: string;
    category_code?: string;
    is_draft?: boolean;
  };
  target_prompt_id?: number;
  source_history_id?: number;
}

export interface PlaygroundSaveResponse {
  prompt_id: number;
  prompt_version_id: number | null;
  latest_version_updated: boolean;
}

export interface PlaygroundSettings {
  analyzer_default_enabled: boolean;
  default_model_id: number;
  default_params: {
    temperature: number;
    max_token: number;
    top_p: number;
  };
}

export interface PlaygroundSettingsUpdateResponse {
  updated: boolean;
}

export type PlaygroundSettingsPatch = Partial<PlaygroundSettings>;
