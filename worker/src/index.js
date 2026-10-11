// SameSalt agent — Cloudflare Worker: JSON API + static web app (public/).
import { runAgent } from './agent.js';

const MAX_IMAGE_CHARS = 2_500_000; // ~1.8 MB JPEG as a data URL; the app resizes to ~1 MP first

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  });

function isTestRequest(request, body) {
  const url = new URL(request.url);
  if (request.headers.get('x-samesalt-test') === '1') return true;
  if (body && (body.test === true || body.test === 1 || body.test === '1')) return true;
  if (['localhost', '127.0.0.1'].includes(url.hostname)) return true;
  return false;
}

function istDay(d = new Date()) {
  return new Date(d.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
}

async function logLookup(env, body, result, isTest) {
  const id = crypto.randomUUID();
  const s = result.saving || {};
  const device = typeof body.device === 'string' && /^[a-z0-9]{8,40}$/i.test(body.device) ? body.device : null;
  await env.DB.prepare(
    `INSERT INTO lookups (id, ts, day, status, input, medicine, ckey, pack, scanned_unit, cheapest_unit, ja_unit, saving_pack, equivalents, lang, pin3, mode, device, is_test)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)`
  )
    .bind(
      id,
      new Date().toISOString(),
      istDay(),
      result.status,
      result.source || (body.image ? 'photo' : body.ocr ? 'photo-ocr' : 'text'),
      result.medicine?.name ?? null,
      result.medicine?.ckey ?? null,
      s.pack ?? null,
      s.scanned_unit ?? null,
      result.same_salt?.cheapest_unit ?? null,
      result.jan_aushadhi?.available ? result.jan_aushadhi.product.unit_price : null,
      s.saving_pack ?? null,
      result.same_salt?.count ?? null,
      result.lang,
      result.pin3 ?? null,
      body.mode === 'volunteer' ? 'volunteer' : 'self',
      device,
      isTest ? 1 : 0
    )
    .run();
  return id;
}

async function handleAsk(request, env, ctx) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad_json' }, 400);
  }
  if (body.image) {
    if (typeof body.image !== 'string' || !body.image.startsWith('data:image/') || body.image.length > MAX_IMAGE_CHARS) {
      return json({ error: 'image_too_large_or_invalid' }, 413);
    }
  } else if (!body.text && !body.ocr) {
    return json({ error: 'nothing_to_check' }, 400);
  }
  const isTest = isTestRequest(request, body);
  const result = await runAgent(env, body);
  if (result.status !== 'vision_unavailable' && !body.nolog) {
    try {
      result.lookup_id = await logLookup(env, body, result, isTest);
    } catch (e) {
      result.log_error = String(e?.message || e).slice(0, 100);
    }
  }
  result.test = isTest;
  return json(result);
}

async function handleFeedback(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad_json' }, 400);
  }
  const allowed = ['yes', 'no', 'ask'];
  if (typeof body.id !== 'string' || !/^[0-9a-f-]{36}$/.test(body.id) || !allowed.includes(body.switched)) {
    return json({ error: 'bad_request' }, 400);
  }
  const r = await env.DB.prepare('UPDATE lookups SET switched = ?1 WHERE id = ?2').bind(body.switched, body.id).run();
  return json({ ok: true, updated: r.meta?.changes ?? 0 });
}

async function handleImpact(env) {
  const q = (sql) => env.DB.prepare(sql).all().then((r) => r.results || []);
  const real = 'is_test = 0';
  const [totals] = await q(`SELECT
      COUNT(*) AS lookups,
      SUM(status = 'ok') AS matched,
      COUNT(DISTINCT device) AS devices,
      ROUND(SUM(CASE WHEN status = 'ok' AND saving_pack > 0 THEN saving_pack ELSE 0 END), 2) AS potential_saving,
      SUM(switched = 'yes') AS switched_yes,
      SUM(switched = 'ask') AS will_ask_doctor,
      SUM(switched = 'no') AS switched_no,
      ROUND(SUM(CASE WHEN switched = 'yes' AND saving_pack > 0 THEN saving_pack ELSE 0 END), 2) AS reported_saving,
      SUM(mode = 'volunteer') AS volunteer_lookups,
      SUM(input LIKE 'photo%') AS photo_lookups,
      MIN(ts) AS first_ts,
      MAX(ts) AS last_ts
    FROM lookups WHERE ${real}`);
  const [byLang, byDay, byPin, topMeds, testCount] = await Promise.all([
    q(`SELECT lang, COUNT(*) AS n FROM lookups WHERE ${real} GROUP BY lang ORDER BY n DESC`),
    q(`SELECT day, COUNT(*) AS n, ROUND(SUM(CASE WHEN saving_pack > 0 THEN saving_pack ELSE 0 END), 2) AS saving FROM lookups WHERE ${real} AND day >= date('now', '-60 day') GROUP BY day ORDER BY day`),
    q(`SELECT pin3, COUNT(*) AS n FROM lookups WHERE ${real} AND pin3 IS NOT NULL GROUP BY pin3 ORDER BY n DESC LIMIT 12`),
    q(`SELECT medicine, COUNT(*) AS n, ROUND(AVG(saving_pack), 2) AS avg_saving FROM lookups WHERE ${real} AND status = 'ok' GROUP BY medicine ORDER BY n DESC LIMIT 10`),
    q(`SELECT COUNT(*) AS n FROM lookups WHERE is_test = 1`),
  ]);
  return json({
    generated_at: new Date().toISOString(),
    note: 'Real usage only: test traffic (evals, demo recordings, developer checks) is flagged is_test=1 and excluded from every figure.',
    totals,
    by_language: byLang,
    by_day: byDay,
    by_pin_prefix: byPin,
    top_medicines: topMeds,
    excluded_test_lookups: testCount[0]?.n ?? 0,
  }, 200, { 'cache-control': 'public, max-age=30' });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/ask' && request.method === 'POST') return await handleAsk(request, env, ctx);
      if (url.pathname === '/api/feedback' && request.method === 'POST') return await handleFeedback(request, env);
      if (url.pathname === '/api/impact') return await handleImpact(env);
      if (url.pathname === '/api/health') {
        const r = await env.DB.prepare('SELECT key, value FROM meta').all();
        return json({ ok: true, meta: Object.fromEntries((r.results || []).map((x) => [x.key, x.value])) });
      }
      if (url.pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404);
    } catch (e) {
      return json({ error: 'server_error', detail: String(e?.message || e).slice(0, 200) }, 500);
    }
    return env.ASSETS.fetch(request);
  },
};
