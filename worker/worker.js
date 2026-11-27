// Rythmo Worker: calendar relay (unchanged) + Web Push reminders (phase 2)
const ALLOWED = ['https://taolaou-hao.github.io', 'http://localhost:8000'];
const PUSH_HOSTS = /^https:\/\/(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)\//;
const enc = new TextEncoder();
let schemaReady = false;
const jwtCache = new Map();

function corsFor(req) {
  const origin = req.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': ALLOWED.includes(origin) ? origin : ALLOWED[0],
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

// ---------- Calendar relay (unchanged logic) ----------
async function relay(req, cors) {
  const target = new URL(req.url).searchParams.get('url') || '';
  let u;
  try { u = new URL(target); } catch { return new Response('bad url', { status: 400, headers: cors }); }
  if (u.protocol !== 'https:' || /^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(u.hostname) || !u.hostname.includes('.'))
    return new Response('not allowed', { status: 400, headers: cors });
  try {
    const r = await fetch(u.toString(), { headers: { Accept: 'text/calendar' }, redirect: 'follow' });
    const text = await r.text();
    if (!r.ok || !text.includes('BEGIN:VCALENDAR') || text.length > 3_000_000)
      return new Response('not a calendar', { status: 422, headers: cors });
    return new Response(text, { headers: { ...cors, 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-store' } });
  } catch {
    return new Response('fetch failed', { status: 502, headers: cors });
  }
}

// ---------- Database ----------
async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS push_subs (endpoint TEXT PRIMARY KEY, p256dh TEXT NOT NULL, auth TEXT NOT NULL, updated INTEGER NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS push_queue (endpoint TEXT NOT NULL, rid TEXT NOT NULL, fire_at INTEGER NOT NULL, payload TEXT NOT NULL, PRIMARY KEY (endpoint, rid))`),
    db.prepare(`CREATE INDEX IF NOT EXISTS push_queue_fire ON push_queue (fire_at)`),
  ]);
  try { await db.prepare('ALTER TABLE push_subs ADD COLUMN device TEXT').run(); } catch (e) { /* column already there */ }
  schemaReady = true;
}

// POST /push/subscribe  { subscription, reminders: [{id, at (ms), title, body, tag}], device? }
async function handleSubscribe(req, env, cors) {
  const body = await req.json().catch(() => null);
  const sub = body && body.subscription;
  if (!sub || !sub.endpoint || !PUSH_HOSTS.test(sub.endpoint) || !sub.keys || !sub.keys.p256dh || !sub.keys.auth)
    return json({ error: 'bad subscription' }, 400, cors);
  // optional device id: one subscription per device (old endpoints of the same device are removed)
  const device = (typeof body.device === 'string' && body.device.length > 0 && body.device.length <= 64) ? body.device : null;
  await ensureSchema(env.DB);
  const now = Date.now();
  const stmts = [];
  if (device) {
    stmts.push(env.DB.prepare('DELETE FROM push_queue WHERE endpoint IN (SELECT endpoint FROM push_subs WHERE device = ? AND endpoint != ?)').bind(device, sub.endpoint));
    stmts.push(env.DB.prepare('DELETE FROM push_subs WHERE device = ? AND endpoint != ?').bind(device, sub.endpoint));
  }
  stmts.push(env.DB.prepare(`INSERT INTO push_subs (endpoint, p256dh, auth, updated, device) VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, updated = excluded.updated, device = excluded.device`)
    .bind(sub.endpoint, sub.keys.p256dh, sub.keys.auth, now, device));
  stmts.push(env.DB.prepare(`DELETE FROM push_queue WHERE endpoint = ?`).bind(sub.endpoint)); // replace the plan
  let queued = 0;
  for (const r of (Array.isArray(body.reminders) ? body.reminders : []).slice(0, 40)) {
    const at = Number(r.at);
    if (!Number.isFinite(at) || at <= now) continue;
    const payload = JSON.stringify({
      title: String(r.title || 'Rythmo').slice(0, 80),
      body: String(r.body || '').slice(0, 240),
      tag: String(r.tag || 'rythmo').slice(0, 40),
      url: './index.html#a',
    });
    stmts.push(env.DB.prepare(`INSERT OR REPLACE INTO push_queue (endpoint, rid, fire_at, payload) VALUES (?, ?, ?, ?)`)
      .bind(sub.endpoint, String(r.id || at).slice(0, 80), Math.floor(at), payload));
    queued++;
  }
  await env.DB.batch(stmts);
  return json({ ok: true, queued }, 200, cors);
}

// POST /push/unsubscribe  { endpoint }
async function handleUnsubscribe(req, env, cors) {
  const body = await req.json().catch(() => null);
  if (!body || !body.endpoint) return json({ error: 'missing endpoint' }, 400, cors);
  await ensureSchema(env.DB);
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM push_queue WHERE endpoint = ?`).bind(body.endpoint),
    env.DB.prepare(`DELETE FROM push_subs WHERE endpoint = ?`).bind(body.endpoint),
  ]);
  return json({ ok: true }, 200, cors);
}

// ---------- Crypto helpers ----------
function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64uDecode(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(str.length / 4) * 4, '=');
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}
function concat(...parts) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}
async function hkdf(salt, ikm, info, len) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8);
  return new Uint8Array(bits);
}

// RFC 8291 (aes128gcm) payload encryption
async function encryptPayload(plain, p256dhB64, authB64) {
  const uaPublic = b64uDecode(p256dhB64);
  const authSecret = b64uDecode(authB64);
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const eph = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey));
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, eph.privateKey, 256));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const ikm = await hkdf(authSecret, ecdh, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 32);
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, concat(plain, Uint8Array.of(2))));
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  return concat(salt, rs, Uint8Array.of(asPublic.length), asPublic, ct);
}

// VAPID JWT (ES256), cached per push service for up to ~11 hours
async function vapidJwt(aud, env) {
  const now = Math.floor(Date.now() / 1000);
  const hit = jwtCache.get(aud);
  if (hit && hit.exp - now > 1800) return hit.token;
  const exp = now + 12 * 3600;
  const head = b64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64url(enc.encode(JSON.stringify({ aud, exp, sub: env.VAPID_SUBJECT })));
  const pub = b64uDecode(env.VAPID_PUBLIC_KEY); // 65 bytes: 0x04 | x | y
  const key = await crypto.subtle.importKey('jwk', {
    kty: 'EC', crv: 'P-256', ext: true,
    d: env.VAPID_PRIVATE_KEY,
    x: b64url(pub.slice(1, 33)),
    y: b64url(pub.slice(33, 65)),
  }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(head + '.' + claims)));
  const token = `${head}.${claims}.${b64url(sig)}`;
  jwtCache.set(aud, { token, exp });
  return token;
}

async function sendPush(env, row) {
  const body = await encryptPayload(enc.encode(row.payload), row.p256dh, row.auth);
  const aud = new URL(row.endpoint).origin;
  return fetch(row.endpoint, {
    method: 'POST',
    headers: {
      TTL: '3600',
      Urgency: 'normal',
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      Authorization: `vapid t=${await vapidJwt(aud, env)}, k=${env.VAPID_PUBLIC_KEY}`,
    },
    body,
  });
}

// ---------- Cron: runs every minute ----------
async function sendDue(env) {
  await ensureSchema(env.DB);
  const now = Date.now();
  const { results = [] } = await env.DB.prepare(
    `SELECT q.endpoint, q.rid, q.payload, s.p256dh, s.auth
       FROM push_queue q JOIN push_subs s ON s.endpoint = q.endpoint
      WHERE q.fire_at <= ? ORDER BY q.fire_at LIMIT 40`
  ).bind(now).all();

  const writes = [];
  const gone = new Set();
  for (const row of results) {
    writes.push(env.DB.prepare(`DELETE FROM push_queue WHERE endpoint = ? AND rid = ?`).bind(row.endpoint, row.rid));
    try {
      const res = await sendPush(env, row);
      if (res.status === 404 || res.status === 410) gone.add(row.endpoint); // subscription expired
    } catch (_) { /* no retry: a missed reminder is better than a late one */ }
  }
  for (const endpoint of gone) {
    writes.push(env.DB.prepare(`DELETE FROM push_subs WHERE endpoint = ?`).bind(endpoint));
    writes.push(env.DB.prepare(`DELETE FROM push_queue WHERE endpoint = ?`).bind(endpoint));
  }
  writes.push(env.DB.prepare(`DELETE FROM push_queue WHERE fire_at < ?`).bind(now - 86400000));
  if (writes.length) await env.DB.batch(writes);
}

// ---------- Entry points ----------
export default {
  async fetch(req, env) {
    const cors = corsFor(req);
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const { pathname } = new URL(req.url);
    if (req.method === 'POST' && pathname === '/push/subscribe') return handleSubscribe(req, env, cors);
    if (req.method === 'POST' && pathname === '/push/unsubscribe') return handleUnsubscribe(req, env, cors);
    return relay(req, cors);
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(sendDue(env));
  },
};