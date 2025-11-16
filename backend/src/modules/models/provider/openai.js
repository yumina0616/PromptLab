// src/modules/models/provider/openai.js
// OpenAI 실제 호출 래퍼

const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// args: { modelCode, promptText, params }
async function callModel({ modelCode, promptText, params }) {
  // 기본 파라미터 세팅
  const temperature = params.temperature ?? 0.7;
  const maxTokens   = params.max_token ?? 1024;
  const topP        = params.top_p ?? 1.0;

  // chat.completions 기준으로 작성
  const resp = await client.chat.completions.create({
    model: modelCode,          // 예: 'gpt-4.1-mini'
    messages: [
      { role: 'user', content: promptText },
    ],
    temperature,
    max_tokens: maxTokens,
    top_p: topP,
  });

  const choice = resp.choices && resp.choices[0];
  const text = choice && choice.message && choice.message.content
    ? choice.message.content
    : '';

  const usage = resp.usage || {};

  return {
    output: text,
    usage: {
      input_tokens: usage.prompt_tokens || 0,
      output_tokens: usage.completion_tokens || 0,
      total_tokens: usage.total_tokens || 0,
    },
  };
}

// model.service.js 에서 openaiProvider.callModel(...) 로 쓰기 위해
module.exports = {
  callModel,
};
