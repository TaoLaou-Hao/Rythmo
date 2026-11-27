# Worker patch: one Web Push subscription per device

Only three places change in your Cloudflare Worker. The rest stays as is.
The app now sends `device` (random id, stored once per device) in `POST /push/subscribe`.
When a device re-subscribes with a new endpoint, the Worker deletes that device's old endpoints and their queued reminders.

## 0. One-time SQL (optional if you use the migration in step 1)

Run once in the D1 console:

```sql
ALTER TABLE push_subs ADD COLUMN device TEXT;
```

(It errors with "duplicate column name" if the column already exists: that is harmless.)

## 1. ensureSchema(db): add the migration

Keep your existing CREATE TABLE statements. Add this block at the END of `ensureSchema`, after them
(it must run after `push_subs` exists):

```js
  try { await db.prepare('ALTER TABLE push_subs ADD COLUMN device TEXT').run(); } catch (e) { /* column already there */ }
```

If your `ensureSchema` caches "schema done" in a module variable, set that flag AFTER this line.

## 2. handleSubscribe(req, env, cors): replace the whole function

It replaces your current `handleSubscribe`. If your current version has extra validation
(subscription shape, max reminders, VAPID checks...), keep those lines and only
apply the three marked changes: (A) read `device`, (B) the upsert SQL, (C) the two DELETEs in the batch.

```js
async function handleSubscribe(req, env, cors) {
  const body = await req.json().catch(() => null);
  const sub = body && body.subscription;
  if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) return json({ error: 'bad subscription' }, 400, cors);
  const reminders = Array.isArray(body.reminders) ? body.reminders.slice(0, 40) : [];
  // (A) optional device id: string, max 64 chars
  const device = (typeof body.device === 'string' && body.device.length > 0 && body.device.length <= 64) ? body.device : null;
  await ensureSchema(env.DB);
  const now = Date.now();
  const stmts = [];
  if (device) {
    // (C) stale endpoints of the same device: queue rows first, then the subs
    stmts.push(env.DB.prepare('DELETE FROM push_queue WHERE endpoint IN (SELECT endpoint FROM push_subs WHERE device = ? AND endpoint != ?)').bind(device, sub.endpoint));
    stmts.push(env.DB.prepare('DELETE FROM push_subs WHERE device = ? AND endpoint != ?').bind(device, sub.endpoint));
  }
  // (B) upsert now stores the device
  stmts.push(env.DB.prepare('INSERT INTO push_subs (endpoint, p256dh, auth, updated, device) VALUES (?, ?, ?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, updated = excluded.updated, device = excluded.device')
    .bind(sub.endpoint, sub.keys.p256dh, sub.keys.auth, now, device));
  // ...KEEP here your existing statements that replace this endpoint's rows in push_queue
  //    (DELETE FROM push_queue WHERE endpoint = ? ... then one INSERT per reminder) and push them into `stmts`.
  await env.DB.batch(stmts);
  return json({ ok: true }, 200, cors);
}
```

Notes:
- The order matters inside the batch: the two DELETEs run BEFORE the upsert, so the subquery still sees the old rows.
- Old rows created before this patch have `device = NULL`: they are not touched (they disappear when the push service answers 404/410, or on the next unsubscribe).
- `/push/unsubscribe` is unchanged.
