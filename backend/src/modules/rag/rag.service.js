const ragRepository = require('./rag.repository');
const { embedText, generateTips } = require('./gemini');

const EMBEDDING_CHAR_LIMIT = Number(process.env.RAG_EMBED_LIMIT || 30000);

function cosineSimilarity(vecA = [], vecB = []) {
  if (!vecA.length || !vecB.length || vecA.length !== vecB.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < vecA.length; i += 1) {
    const a = vecA[i];
    const b = vecB[i];
    dot += a * b;
    magA += a * a;
    magB += b * b;
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
}

class RagService {
  /**
   * Store guideline entries in DB with embeddings.
   * @param {{ title: string, content: string }} payload
   */
  async createGuideline(payload) {
    if (!payload?.title || !payload?.content) {
      throw new Error('RAG_GUIDELINE_INVALID_PAYLOAD');
    }

    const embeddingSource = (payload.content || '').slice(0, EMBEDDING_CHAR_LIMIT);
    const embedding = await embedText(embeddingSource);
    const id = await ragRepository.insertGuideline({ ...payload, embedding });
    return { id, ...payload };
  }

  async updateGuideline(id, patch) {
    const data = { ...patch };
    if (patch?.content) {
      const embeddingSource = patch.content.slice(0, EMBEDDING_CHAR_LIMIT);
      data.embedding = await embedText(embeddingSource);
    }
    await ragRepository.updateGuideline(id, data);
    return { id, ...patch };
  }

  async listGuidelines() {
    return ragRepository.listGuidelines();
  }

  async retrieveRelevantGuidelines(queryText, limit = 5) {
    if (!queryText || !queryText.trim()) {
      throw new Error('QUERY_TEXT_REQUIRED');
    }

    const embedding = await embedText(queryText);
    const guidelines = await ragRepository.listGuidelinesWithEmbeddings();
    const scored = guidelines
      .map((item) => ({
        ...item,
        similarity: cosineSimilarity(embedding, item.embedding),
      }))
      .filter((item) => item.similarity > 0)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return scored;
  }

  async suggestPromptImprovements({
    prompt,
    limit = 4,
    temperature = 0.3,
    topP = 0.8,
    maxOutputTokens = 512,
  }) {
    const guidelines = await this.retrieveRelevantGuidelines(prompt, limit);
    const text = await generateTips({
      prompt,
      context: guidelines,
      temperature,
      topP,
      maxOutputTokens,
    });

    return {
      text,
      guidelines,
    };
  }
}

module.exports = new RagService();
