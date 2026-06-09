import { Router, Request, Response } from 'express';

const router = Router();

// GET /api/geocode/search?q=...
router.get('/search', async (req: Request, res: Response): Promise<void> => {
  const q = req.query.q as string;
  if (!q) { res.status(400).json({ error: 'q obrigatório' }); return; }
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ', Porto Alegre, RS, Brasil')}&format=json&limit=5`;
    const response = await fetch(url, {
      headers: { 'Accept-Language': 'pt-BR' }
    });
    const data = await response.json() as any[];
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro na busca' });
  }
});

export default router;
