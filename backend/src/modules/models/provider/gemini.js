// src/modules/models/provider/gemini.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('[gemini] GEMINI_API_KEY not set, provider will fail.');
}

const client = new GoogleGenerativeAI(apiKey);

/**
 * options = { model, prompt, params }
 *  - model: ai_model 테이블에서 읽어온 한 행 (model_code 포함)
 *  - prompt: 문자열
 *  - params: { temperature, max_token, top_p, ... }
 */
exports.callModel = async function callModel(options) {
  const { model, prompt, params = {} } = options;

  if (!model || !model.model_code) {
    throw new Error('Invalid model object: model_code missing');
  }

  const modelId = model.model_code; // ex) 'gemini-2.0-flash-exp'

  const genModel = client.getGenerativeModel({ model: modelId });

  const generationConfig = {
    temperature: params.temperature ?? 0.7,
    topP: params.top_p ?? 1.0,
    maxOutputTokens: params.max_token ?? 1024
  };

  const result = await genModel.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ],
    generationConfig
  });

  const text = result.response.text();

  // Gemini는 토큰 usage를 일부 모델에서만 주는데, 일단 null로 둠
  return {
    output: text,
    usage: {
      input_tokens: null,
      output_tokens: null
    }
  };
};
