import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fetch from 'node-fetch';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(express.json());
app.use(morgan('tiny'));

const allowList = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowList.includes(origin)) return cb(null, true);
    cb(new Error('Origin not allowed: ' + origin));
  }
}));

app.get('/healthz', (req, res) => res.json({ ok: true }));

app.get('/api/webrtc-token', async (req, res) => {
  try {
    const key = process.env.ELEVEN_API_KEY;
    const agentId = process.env.ELEVEN_AGENT_ID;
    if (!key || !agentId) {
      return res.status(500).json({ error: 'missing_env_vars' });
    }

    const r = await fetch(
      `https://api.elevenlabs.io/v1/agents/conversations/webrtc-token?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { 'xi-api-key': key } }
    );

    const text = await r.text();
    res.status(r.status).type('application/json').send(text);
  } catch (e) {
    res.status(500).json({ error: 'server_error', detail: String(e) });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Token server on http://localhost:${port}`));
