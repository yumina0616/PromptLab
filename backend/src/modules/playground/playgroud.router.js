import { Router } from 'express';
const r = Router();

r.post('/run', (_req, res) => res.json({ data: { output: 'preview text', tokens: 123 } }));
r.get('/runs/recent', (_req, res) => res.json({ data: [] }));
r.post('/runs/:runId/save', (req, res) => res.status(201).json({ data: { newVersionId: req.params.runId } }));

export default r;
