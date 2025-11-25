export type ModelProvider = 'google' | 'openai' | 'anthropic' | 'ollama' | string;

export interface ModelSummary {
  id: number;
  provider: ModelProvider;
  model_code: string;
  display_name: string;
  is_active: boolean;
}

export interface ModelListResponse {
  total: number;
  page: number;
  limit: number;
  items: ModelSummary[];
}

export interface ModelDetail extends ModelSummary {
  capabilities: {
    max_tokens: number | null;
    supports_vision: boolean;
    supports_tool_call: boolean;
  };
  default_params: {
    temperature: number;
    top_p: number;
  };
}

export interface ModelListQuery {
  provider?: ModelProvider;
  active?: boolean;
  sort?: string | string[];
  page?: number;
  limit?: number;
}

export interface ModelTestRequest {
  model_id: number;
  prompt_text: string;
  params?: {
    temperature?: number;
    max_token?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
  };
}

export interface ModelTestResponse {
  output: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  model: {
    id: number;
    applied_params: {
      temperature: number;
      max_token: number;
      top_p: number;
      frequency_penalty: number;
      presence_penalty: number;
    };
  };
}
