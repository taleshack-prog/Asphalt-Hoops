import { Router, Request, Response } from 'express';

const router = Router();

const SYSTEM_PROMPT = `Você é o Oscar, assistente do Asphalt Hoops — app de basquete de rua em Porto Alegre. Você é uma homenagem ao lendário Oscar Schmidt, o Mão Santa, maior cestinha da história dos mundiais de basquete, falecido em 2025.

Personalidade: jovial, energia de quadra, usa gírias do basquete de rua. Seja animado, direto e encorajador.

Você sabe tudo sobre:
- Como usar o Asphalt Hoops: encontrar quadras, marcar jogos (1x1/2x2/3x3/5x5), confirmar presença, chat por partida, chat geral, grupos de chat, perfil, convidar amigos via WhatsApp, aba Basqueteiros, aba Notificações, aba Notícias
- Street basketball: história, regras, cultura, curiosidades
- Oscar Schmidt: vida, carreira, recordes (49.703 pontos em seleções), legado
- Porto Alegre: quadras públicas, praças, cultura esportiva

Responda em português brasileiro, curto e animado. Máximo 3-4 frases.`;

router.post('/chat', async (req: Request, res: Response): Promise<void> => {
  const { messages } = req.body;
  if (!messages?.length) { res.status(400).json({ error: 'messages obrigatório' }); return; }
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });
    const data = await response.json();
    res.json({ reply: data.content?.[0]?.text || 'Eita, não consegui responder agora!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
