// src/modules/models/provider/ollama.js

// 나중에 로컬 Ollama HTTP API 붙일 자리.
// 지금은 더미 구현.

exports.callModel = async function ({ model, prompt, params }) {
  const modelCode = model.model_code; // 예: 'llama3.1'

  const output =
    `[OLLAMA MOCK OUTPUT]\n` +
    `model: ${modelCode}\n\n` +
    `prompt:\n${prompt}\n\n` +
    `(여기에 나중에 Ollama 로컬 모델 응답이 들어갈 예정입니다.)`;

  return {
    output,
    usage: {
      input_tokens: prompt.length,
      output_tokens: output.length,
    },
  };
};
