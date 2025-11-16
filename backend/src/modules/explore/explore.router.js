import { Router } from 'express';
const r = Router();

r.get('/search', (_req, res) => res.json({ data: [] }));
r.get('/popular', (_req, res) => res.json({ data: [] }));
r.get('/latest', (_req, res) => res.json({ data: [] }));
r.get('/categories/:category', (req, res) => res.json({ data: [], category: req.params.category }));

export default r;
