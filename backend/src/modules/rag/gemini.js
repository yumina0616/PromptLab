const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not configured. Check backend/.env');
}

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-pro';
const DEFAULT_EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'text-embedding-004';

const client = new GoogleGenerativeAI(GEMINI_API_KEY);
const generativeModel = client.getGenerativeModel({ model: DEFAULT_MODEL });
const embeddingModel = client.getGenerativeModel({ model: DEFAULT_EMBED_MODEL });

async function embedText(text) {
  if (!text || !text.trim()) {
    throw new Error('TEXT_REQUIRED_FOR_EMBEDDING');
  }

  const result = await embeddingModel.embedContent(text);
  return result?.embedding?.values || [];
}

async function generateTips({ prompt, context, temperature = 0.3, topP = 0.8, maxOutputTokens = 512 }) {
  if (!prompt || !prompt.trim()) {
    throw new Error('PROMPT_REQUIRED_FOR_TIPS');
  }

  const promptContext = context
    .map(
      (item, idx) =>
        `### Guideline ${idx + 1}: ${item.title}\n${item.content.substring(0, 4000)}`
    )
    .join('\n\n');

  const userPrompt = `
You are PromptLab's prompt coach. Review the user's playground prompt and provide 3-5 concrete improvement suggestions.

User prompt:
"""
${prompt}
"""

Guidelines to reference:
${promptContext || 'No guidelines found. Provide generic best practices.'}

Respond in Korean when the user prompt is mostly Korean; otherwise respond in English. Use markdown bullets. Mention the most relevant guideline titles inline when possible.
`.trim();

  const response = await generativeModel.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      temperature,
      topP,
      maxOutputTokens,
    },
  });

  const text = response?.response?.text?.() || '';
  return text.trim();
}

module.exports = {
  embedText,
  generateTips,
};
