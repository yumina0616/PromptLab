export interface RagGuideline {
  id: number;
  title: string;
  content: string;
  similarity?: number;
}

export interface PromptTipResponse {
  text: string;
  guidelines: RagGuideline[];
}
