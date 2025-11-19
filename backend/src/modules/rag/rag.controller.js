const ragService = require('./rag.service');

exports.createGuideline = async (req, res, next) => {
  try {
    const { title, content } = req.body || {};
    const result = await ragService.createGuideline({ title, content });
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
};

exports.updateGuideline = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await ragService.updateGuideline(Number(id), req.body);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
};

exports.listGuidelines = async (_req, res, next) => {
  try {
    const rows = await ragService.listGuidelines();
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
};

exports.retrieveGuidelines = async (req, res, next) => {
  try {
    const { prompt, limit } = req.body || {};
    const rows = await ragService.retrieveRelevantGuidelines(prompt, limit);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
};

exports.generateTips = async (req, res, next) => {
  try {
    const { prompt, limit, temperature, top_p, topP, maxOutputTokens, max_tokens } =
      req.body || {};
    const result = await ragService.suggestPromptImprovements({
      prompt,
      limit,
      temperature,
      topP: topP ?? top_p,
      maxOutputTokens: maxOutputTokens ?? max_tokens,
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
};
