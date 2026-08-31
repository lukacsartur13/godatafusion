/* ============================================================
   The endpoint, in dev and in `vite preview`.

   A Vite plugin that adapts Node's req/res onto the SAME Web-standard
   handler the Netlify function calls. There is no second implementation
   and no dev-only success branch, so `npm run dev` exercises the real
   validator, the real file checks and the real transport selection.

   In preview mode this makes the production BUILD testable end to end
   without deploying — which is the only way QA on the endpoint is worth
   anything.
   ============================================================ */

import { handleProjectRequest } from './handler.mjs';
import { ENDPOINT } from '../src/data/services.js';

const MAX_BODY = 8 * 1024 * 1024;   // hard stop before the handler's own limits

function nodeToRequest(req, body) {
  const host = req.headers.host || 'localhost';
  const url = new URL(req.url, `http://${host}`);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) v.forEach((x) => headers.append(k, x));
    else if (v != null) headers.set(k, v);
  }
  return new Request(url, {
    method: req.method,
    headers,
    body: body && body.length ? body : undefined,
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error('too large'), { tooLarge: true })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function send(res, response) {
  res.statusCode = response.status;
  response.headers.forEach((v, k) => res.setHeader(k, v));
  const buf = Buffer.from(await response.arrayBuffer());
  res.end(buf);
}

const middleware = async (req, res, next) => {
  if (!req.url || req.url.split('?')[0] !== ENDPOINT) return next();

  try {
    const body = await readBody(req);
    const ip = (req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || '').trim() || null;
    const response = await handleProjectRequest(nodeToRequest(req, body), { env: process.env, ip });
    await send(res, response);
  } catch (err) {
    res.statusCode = err?.tooLarge ? 413 : 500;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({
      ok: false,
      error: err?.tooLarge ? 'payload_too_large' : 'server_error',
      message: err?.tooLarge
        ? 'A csatolmány túl nagy.'
        : 'Váratlan hiba történt a feldolgozás közben.',
    }));
    if (!err?.tooLarge) console.error('[gdf:dev-api]', err);
  }
};

export function apiPlugin() {
  return {
    name: 'gdf-project-request',
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); },
  };
}
