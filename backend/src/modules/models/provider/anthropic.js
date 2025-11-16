// src/modules/models/provider/anthropic.js

// 나중에 진짜 Anthropic SDK 붙일 자리.
// 지금은 더미 구현으로만 동작시킴.

exports.callModel = async function ({ model, prompt, params }) {
  // model.model_code 에 실제 claude-3-haiku-20240307 같은 코드가 들어 있음
  const modelCode = model.model_code;

  const output =
    `[ANTHROPIC MOCK OUTPUT]\n` +
    `model: ${modelCode}\n\n` +
    `prompt:\n${prompt}\n\n` +
    `(여기에 나중에 Claude 3 응답이 들어갈 예정입니다.)`;

  return {
    output,
    usage: {
      input_tokens: prompt.length,
      output_tokens: output.length,
    },
  };
};
