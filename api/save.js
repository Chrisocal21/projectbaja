// Cloud save API (Vercel function). Needs a signed-in Clerk user; each user only ever touches their own files.
//   GET  /api/save  -> the main save (text) or 404
//   PUT  /api/save  -> body is the save envelope; the old main is kept as one of 3 rolling backups
import { createClerkClient } from '@clerk/backend';
import { put, get } from '@vercel/blob';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY, publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY });
const MAX = 4 * 1024 * 1024;
const readText = async p => { const r = await get(p, { access: 'private' }).catch(() => null); if (!r || !r.stream) return null; return await new Response(r.stream).text(); };

export default async function handler(req, res) {
  let userId;
  try {
    const url = `https://${req.headers.host}${req.url}`;
    const st = await clerk.authenticateRequest(new Request(url, { method: req.method, headers: req.headers }));
    if (!st.isSignedIn) return res.status(401).json({ error: 'sign in first' });
    userId = st.toAuth().userId;
  } catch { return res.status(401).json({ error: 'sign in first' }); }
  const base = `saves/${userId}/`;
  try {
    if (req.method === 'GET') {
      const t = await readText(base + 'main.json');
      if (!t) return res.status(404).json({ error: 'no cloud save' });
      if (/[?&]meta=1/.test(req.url)) { try { const j = JSON.parse(t); return res.status(200).json({ savedAt: j.savedAt, version: j.version, format: j.format }); } catch { return res.status(500).json({ error: 'cloud save unreadable' }); } }
      res.setHeader('content-type', 'application/json'); return res.status(200).send(t);
    }
    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
      let j; try { j = JSON.parse(body); } catch { return res.status(400).json({ error: 'not json' }); }
      if (!j || j.format !== 'baja-save' || !Number.isFinite(j.savedAt) || body.length > MAX) return res.status(400).json({ error: 'not a save' });
      const old = await readText(base + 'main.json');
      if (old) { for (let i = 3; i > 1; i--) { const prev = await readText(`${base}backup${i - 1}.json`); if (prev) await put(`${base}backup${i}.json`, prev, { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json' }); } await put(`${base}backup1.json`, old, { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json' }); }
      await put(base + 'main.json', body, { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json' });
      return res.status(200).json({ ok: true, savedAt: j.savedAt });
    }
    res.setHeader('allow', 'GET, PUT'); return res.status(405).json({ error: 'method' });
  } catch (e) { return res.status(500).json({ error: 'cloud storage failed' }); }
}
