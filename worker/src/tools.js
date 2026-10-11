// The agent's tools. Each takes a D1-compatible `db` (prepare().bind().all()/first())
// and returns plain JSON, so they are unit-testable with node:sqlite (see test/).
import { keyFor, buildCanonicalKey, parseSaltComposition, extractDosageForm, extractReleaseType, describeKey, isNti } from './normalize.js';

const STOP = new Set(['tablet', 'tablets', 'tab', 'tabs', 'capsule', 'capsules', 'cap', 'caps', 'strip', 'ip', 'bp', 'usp', 'mg', 'the', 'of', 'and', 'each', 'film', 'coated', 'uncoated', 'contains']);

export function tokens(s) {
  return (s || '')
    .toLowerCase()
    .replace(/([a-z])(\d)/g, '$1 $2')
    .replace(/(\d)\s*(mg|mcg|g|ml)\b/g, '$1')
    .replace(/[^a-z0-9.]+/g, ' ')
    .replace(/\b(\d+)\.0\b/g, '$1')
    .split(' ')
    .filter((t) => t && !STOP.has(t));
}

/** Score how well a medicine name matches a typed/read query (0..1). Numbers must match exactly. */
export function nameScore(query, name) {
  const q = tokens(query);
  const n = tokens(name);
  if (!q.length || !n.length) return 0;
  if (q[0] !== n[0] && !n[0].startsWith(q[0])) return 0;
  const nset = new Set(n);
  let hit = 0;
  for (const t of q) {
    if (nset.has(t)) hit += 1;
    else if (/^\d/.test(t)) return 0; // query says 650, name says 500: not this medicine
    else if (n.some((x) => x.startsWith(t) && t.length >= 3)) hit += 0.7;
  }
  const extra = n.filter((t) => !q.includes(t)).length;
  // Names with numbers the query didn't mention (e.g. "Dolo 1000" for "Dolo") rank lower.
  const extraNums = n.filter((t) => /^\d/.test(t) && !q.includes(t)).length;
  return hit / q.length - 0.04 * extra - 0.15 * extraNums + (q[0] === n[0] ? 0.05 : 0);
}

/** Tool: identify_medicine. Resolve a brand name (and optional composition read off the strip) to one DB row. */
export async function identifyMedicine(db, { brand = '', composition = '', form = '' } = {}) {
  const q = tokens(brand);
  let candidates = [];
  if (q.length) {
    const like = `${q[0]}%`;
    const res = await db
      .prepare('SELECT id, name, manufacturer, salt, ckey, price, pack, unit_price, form, rel, nti, incomplete FROM medicines WHERE name LIKE ?1 LIMIT 400')
      .bind(like)
      .all();
    candidates = (res.results || [])
      .map((r) => ({ ...r, score: nameScore(brand, r.name) }))
      .filter((r) => r.score > 0.45);
  }

  // Composition read from the strip, if any, gives a key to cross-check the brand guess.
  let compKey = '';
  if (composition) {
    const k = keyFor(composition, { name: `${brand} ${form}`, form });
    compKey = k.key;
  }

  if (candidates.length) {
    candidates.sort((a, b) => {
      const ka = compKey && a.ckey === compKey ? 1 : 0;
      const kb = compKey && b.ckey === compKey ? 1 : 0;
      if (ka !== kb) return kb - ka;
      if (Math.abs(b.score - a.score) > 1e-9) return b.score - a.score;
      // Prefer the plain tablet/strip pack over syrups etc. when the query is ambiguous.
      const fa = a.form === 'tablet' ? 1 : 0;
      const fb = b.form === 'tablet' ? 1 : 0;
      if (fa !== fb) return fb - fa;
      return a.name.length - b.name.length;
    });
    const best = candidates[0];
    return {
      found: true,
      via: compKey && best.ckey === compKey ? 'brand+composition' : 'brand',
      medicine: best,
      label: describeKey(best.ckey),
      alternatives: candidates.slice(1, 4).map((c) => c.name),
      composition_key_from_strip: compKey || null,
      composition_agrees: compKey ? best.ckey === compKey : null,
    };
  }

  if (compKey) {
    // Brand unknown to the database, but the strip's composition is enough to compare.
    const salts = parseSaltComposition(composition);
    return {
      found: true,
      via: 'composition',
      medicine: { id: null, name: brand || describeKey(compKey), manufacturer: null, salt: composition, ckey: compKey, price: null, pack: null, unit_price: null, form: extractDosageForm(form) || extractDosageForm(brand), rel: extractReleaseType(brand), nti: isNti(salts) ? 1 : 0, incomplete: 0 },
      label: describeKey(compKey),
      alternatives: [],
      composition_key_from_strip: compKey,
      composition_agrees: null,
    };
  }
  return { found: false };
}

/** Tool: find_same_salt. Every brand with an identical canonical key, cheapest first (per unit). */
export async function findSameSalt(db, ckey, { limit = 8 } = {}) {
  if (!ckey) return { count: 0, items: [] };
  const res = await db
    .prepare('SELECT name, manufacturer, price, pack, unit_price FROM medicines WHERE ckey = ?1 AND unit_price > 0 AND incomplete = 0 ORDER BY unit_price ASC LIMIT 2000')
    .bind(ckey)
    .all();
  const all = res.results || [];
  // The source lists some brands several times (pack variants); keep the cheapest per name.
  const seen = new Set();
  const uniq = [];
  for (const r of all) {
    const k = r.name.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(r);
  }
  const prices = uniq.map((r) => r.unit_price);
  const median = prices.length ? prices[Math.floor(prices.length / 2)] : null;
  return {
    count: uniq.length,
    cheapest_unit: prices[0] ?? null,
    median_unit: median,
    max_unit: prices.length ? prices[prices.length - 1] : null,
    items: uniq.slice(0, limit),
  };
}

/** Tool: jan_aushadhi_match. The PMBJP generic with the same canonical key, if the basket has one. */
export async function janAushadhiMatch(db, ckey) {
  if (!ckey) return { available: false };
  const res = await db
    .prepare('SELECT drug_code, generic_name, unit_size, mrp, group_name, units, unit_price FROM ja_products WHERE ckey = ?1 ORDER BY unit_price ASC LIMIT 3')
    .bind(ckey)
    .all();
  const rows = res.results || [];
  if (!rows.length) return { available: false };
  return { available: true, product: rows[0], others: rows.slice(1) };
}

const R = 6371;
function haversine(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Tool: nearest_kendra. By coordinates if given, else by PIN code (same PIN, then nearby PINs). */
export async function nearestKendra(db, { pin = '', lat = null, lng = null, limit = 3 } = {}) {
  const cols = 'code, name, address, district, state, pin, lat, lng, phone';
  if (lat != null && lng != null && Number.isFinite(+lat) && Number.isFinite(+lng)) {
    const d = 0.25; // ~25 km box, widened once if empty
    for (const box of [d, d * 4]) {
      const res = await db
        .prepare(`SELECT ${cols} FROM kendras WHERE lat BETWEEN ?1 AND ?2 AND lng BETWEEN ?3 AND ?4 LIMIT 400`)
        .bind(+lat - box, +lat + box, +lng - box, +lng + box)
        .all();
      const rows = (res.results || [])
        .map((k) => ({ ...k, km: Math.round(haversine({ lat: +lat, lng: +lng }, k) * 10) / 10 }))
        .sort((a, b) => a.km - b.km);
      if (rows.length) return { by: 'location', items: rows.slice(0, limit) };
    }
  }
  const p = String(pin || '').replace(/\D/g, '');
  if (p.length === 6) {
    for (const n of [6, 5, 4, 3]) {
      const prefix = p.slice(0, n);
      const res = await db
        .prepare(`SELECT ${cols} FROM kendras WHERE pin LIKE ?1 LIMIT 200`)
        .bind(`${prefix}%`)
        .all();
      const rows = res.results || [];
      if (rows.length) {
        rows.sort((a, b) => Math.abs(+a.pin - +p) - Math.abs(+b.pin - +p));
        return { by: n === 6 ? 'pin' : 'nearby-pin', items: rows.slice(0, limit) };
      }
    }
    return { by: 'pin', items: [] };
  }
  return { by: null, items: [] };
}

/** Saving for one pack of the scanned brand against the cheapest option (brand or Jan Aushadhi). */
export function computeSaving(med, same, ja) {
  const pack = med.pack || 10;
  const scanned = med.unit_price;
  const options = [same.cheapest_unit, ja.available ? ja.product.unit_price : null].filter((x) => x != null && x > 0);
  if (scanned == null || !options.length) return { pack, scanned_unit: scanned ?? null, best_unit: options.length ? Math.min(...options) : null, saving_pack: null, pct: null };
  const best = Math.min(...options);
  const saving = Math.max(0, (scanned - best) * pack);
  return {
    pack,
    scanned_unit: scanned,
    best_unit: best,
    saving_pack: Math.round(saving * 100) / 100,
    pct: scanned > 0 ? Math.round((1 - best / scanned) * 100) : null,
  };
}

/** Pull salts + strengths out of free OCR text ("Each tablet contains: Paracetamol IP 650 mg"). */
export function compositionFromText(text) {
  const found = [];
  const re = /([A-Za-z][A-Za-z\- ]{2,40}?)\s*(?:\b(?:IP|BP|USP)\b)?\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(mg|mcg|g|gm|iu)\b/gi;
  let m;
  while ((m = re.exec(text))) {
    let name = m[1].replace(/\b(each|film|coated|uncoated|tablet|tablets|capsule|capsules|contains|composition|hard|gelatin|equivalent|to|as)\b/gi, ' ').replace(/\s+/g, ' ').trim();
    if (name.length < 4) continue;
    found.push(`${name} (${m[2]}${m[3].toLowerCase()})`);
  }
  return found.join(' + ');
}

/** Candidate brand strings from OCR text: "DOLO 650", "Pan-40" ... */
export function brandCandidatesFromText(text) {
  const out = [];
  const re = /\b([A-Za-z][A-Za-z\-]{2,20})(?:[\s\-]+([A-Za-z]{1,6}))?[\s\-]*(\d{1,4}(?:\.\d+)?)?\b/g;
  let m;
  while ((m = re.exec(text))) {
    const w = m[1].toLowerCase();
    if (STOP.has(w) || ['each', 'contains', 'store', 'keep', 'manufactured', 'composition', 'dosage', 'schedule', 'warning', 'batch', 'exp', 'mfg', 'price', 'incl', 'taxes'].includes(w)) continue;
    out.push([m[1].replace(/-+$/, ''), m[2], m[3]].filter(Boolean).join(' '));
  }
  return [...new Set(out)].slice(0, 12);
}

export { buildCanonicalKey, describeKey };
