// src/modules/models/provider/gemini.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('[gemini] GEMINI_API_KEY not set, provider will fail.');
}

const client = new GoogleGenerativeAI(apiKey);

/**
 * options = { modelCode, promptText, params }
 *  - modelCode: ai_model.model_code  (예: 'gemini-2.0-flash-exp')
 *  - promptText: 문자열 프롬프트
 *  - params: { temperature, max_token, top_p, ... }
 */
exports.callModel = async function callModel(options) {
  const { modelCode, promptText, params = {} } = options;

  if (!modelCode) {
    throw new Error('Invalid model object: model_code missing');
  }

  // 숫자 캐스팅 + 기본값
  const rawTemp = params.temperature ?? 0.7;
  const rawMax  = params.max_token   ?? 1024;
  const rawTopP = params.top_p       ?? 1.0;

  let temperature = parseFloat(rawTemp);
  if (Number.isNaN(temperature)) temperature = 0.7;

  let maxTokens = parseInt(rawMax, 10);
  if (Number.isNaN(maxTokens)) maxTokens = 1024;

  let topP = parseFloat(rawTopP);
  if (Number.isNaN(topP)) topP = 1.0;

  const genModel = client.getGenerativeModel({ model: modelCode }); // ex) 'gemini-2.0-flash-exp'

  const result = await genModel.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: promptText }],
      },
    ],
    generationConfig: {
      temperature,
      topP,
      maxOutputTokens: maxTokens,
    },
  });

  const text = result.response.text();

  // Gemini는 usage 일부 모델만 줘서 일단 null
  return {
    output: text,
    usage: {
      input_tokens: null,
      output_tokens: null,
    },
  };
};
