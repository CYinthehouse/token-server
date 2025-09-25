// server.js
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
    if (!origin) return cb(null, true); // allow curl / same-origin
    if (allowList.includes(origin)) return cb(null, true);
    cb(new Error('Origin not allowed: ' + origin));
  }
}));

// --- Basic health ---
app.get('/',        (req, res) => res.status(200).send('OK'));
app.get('/healthz', (req, res) => res.json({ ok: true }));

// --- Conversation token (current/working endpoint) ---
app.get('/api/webrtc-token', async (req, res) => {
  try {
    const key = process.env.ELEVEN_API_KEY;
    const agentId = process.env.ELEVEN_AGENT_ID;
    if (!key || !agentId) return res.status(500).json({ error: 'missing_env_vars' });

    const url = `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`;
    const r = await fetch(url, { headers: { 'xi-api-key': key } });

    const text = await r.text(); // pass-through
    res.status(r.status).type('application/json').send(text);
  } catch (e) {
    res.status(500).json({ error: 'server_error', detail: String(e) });
  }
});

// --- Signed URL (alternative flow some SDKs support) ---
app.get('/api/webrtc-signed-url', async (req, res) => {
  try {
    const key = process.env.ELEVEN_API_KEY;
    const agentId = process.env.ELEVEN_AGENT_ID;
    if (!key || !agentId) return res.status(500).json({ error: 'missing_env_vars' });

    const url = `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`;
    const r = await fetch(url, { headers: { 'xi-api-key': key } });

    const text = await r.text(); // pass-through
    res.status(r.status).type('application/json').send(text);
  } catch (e) {
    res.status(500).json({ error: 'server_error', detail: String(e) });
  }
});

// --- DEBUG: check the agent actually resolves for this API key ---
app.get('/api/verify-agent', async (req, res) => {
  try {
    const key = process.env.ELEVEN_API_KEY;
    const agentId = process.env.ELEVEN_AGENT_ID;
    if (!key || !agentId) return res.status(500).json({ error: 'missing_env_vars' });

    const r = await fetch(`https://api.elevenlabs.io/v1/agents/${encodeURIComponent(agentId)}`, {
      headers: { 'xi-api-key': key }
    });

    const text = await r.text();
    res.status(r.status).type('application/json').send(text);
  } catch (e) {
    res.status(500).json({ error: 'server_error', detail: String(e) });
  }
});

// --- DEBUG: show decoded JWT payload from token endpoint ---
app.get('/api/webrtc-token-debug', async (req, res) => {
  try {
    const key = process.env.ELEVEN_API_KEY;
    const agentId = process.env.ELEVEN_AGENT_ID;
    if (!key || !agentId) return res.status(500).json({ error: 'missing_env_vars' });

    const r = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { 'xi-api-key': key } }
    );

    const json = await r.json();
    if (!r.ok) return res.status(r.status).json(json);

    const { token } = json;
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString('utf8'));
    res.json({ token_issued_for_agent_env: agentId, decoded_payload: payload });
  } catch (e) {
    res.status(500).json({ error: 'server_error', detail: String(e) });
  }
});

// Friendly 404
app.use((req, res) => {
  res.status(404).json({
    error: 'not_found',
    hint: 'Try /, /healthz, /api/webrtc-token, /api/webrtc-signed-url, /api/verify-agent, /api/webrtc-token-debug'
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ Token server on http://localhost:${port}`);
  console.log('Routes: /, /healthz, /api/webrtc-token, /api/webrtc-signed-url, /api/verify-agent, /api/webrtc-token-debug');
});
