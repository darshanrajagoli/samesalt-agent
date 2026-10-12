// The SameSalt agent: a fixed, auditable tool plan. Models are used only where they are
// needed (reading a photo, understanding free text in any script); every price, match and
// safety decision comes from deterministic tools over official / published data.
//
//   read_strip ─► identify_medicine ─► find_same_salt ─► jan_aushadhi_match ─► nearest_kendra ─► compose_answer
//
// Every step is recorded in `trace` (tool, input, short output, ms) and returned to the UI,
// and the eval runner writes the same trace as AgentFoundry run JSONL (.codenow/runs/).
import { readStrip, understandText } from './vision.js';
import { identifyMedicine, findSameSalt, janAushadhiMatch, nearestKendra, computeSaving, compositionFromText, brandCandidatesFromText } from './tools.js';
import { describeKey, extractDosageForm } from './normalize.js';
import { composeAnswer } from '../../public/strings.js';

const NON_LATIN = /[^\u0000-ɏ\s\d.,()+\-/]/;

export async function runAgent(env, input) {
  const db = env.DB;
  const lang = ['en', 'hi', 'kn'].includes(input.lang) ? input.lang : 'en';
  const trace = [];
  const step = async (tool, args, fn, summarize) => {
    const t0 = Date.now();
    let out;
    try {
      out = await fn();
    } catch (e) {
      trace.push({ tool, input: args, error: String(e?.message || e).slice(0, 200), ms: Date.now() - t0 });
      throw e;
    }
    trace.push({ tool, input: args, output: summarize ? summarize(out) : out, ms: Date.now() - t0 });
    return out;
  };

  let text = String(input.text || '').trim().slice(0, 300);
  let pin = String(input.pin || '').replace(/\D/g, '').slice(0, 6);
  const pinInText = text.match(/\b(\d{6})\b/);
  if (pinInText) {
    if (!pin) pin = pinInText[1];
    text = text.replace(pinInText[0], ' ').trim();
  }

  let query = { brand: '', composition: '', form: '' };
  let read = null;
  let source = 'text';

  if (input.image) {
    source = 'photo';
    read = await step('read_strip', { image: '(photo — processed in memory, not stored)' }, () => readStrip(env, input.image), (r) =>
      r.ok ? { model: r.model, brand: r.brand, composition: r.composition, form: r.form, release: r.release } : { failed: r.errors }
    );
    if (!read.ok) return { status: 'vision_unavailable', lang, trace };
    query = { brand: [read.brand, read.release].filter(Boolean).join(' '), composition: read.composition, form: read.form };
  } else if (input.ocr) {
    source = 'photo-ocr';
    const ocr = String(input.ocr).slice(0, 2000);
    query = { brand: '', composition: compositionFromText(ocr), form: /capsule/i.test(ocr) ? 'capsule' : 'tablet' };
    const candidates = brandCandidatesFromText(ocr);
    trace.push({ tool: 'parse_ocr_text', input: { chars: ocr.length }, output: { brand_candidates: candidates.slice(0, 6), composition: query.composition }, ms: 0 });
    for (const c of candidates) {
      const r = await identifyMedicine(db, { brand: c, composition: query.composition, form: query.form });
      if (r.found && r.via !== 'composition' && (r.composition_agrees !== false)) {
        query.brand = c;
        break;
      }
    }
  } else {
    query = { brand: text, composition: '', form: '' };
  }

  let id = await step('identify_medicine', query, () => identifyMedicine(db, query), (r) =>
    r.found ? { name: r.medicine.name, composition: r.label, via: r.via, composition_agrees: r.composition_agrees } : { found: false }
  );

  // Typed text in Kannada/Devanagari script, or phrased as a question: let the language model
  // pull out the medicine name, then try again.
  if (!id.found && text && (NON_LATIN.test(text) || text.split(/\s+/).length > 3) && env.AI) {
    const u = await step('understand_text', { text }, () => understandText(env, text), (r) => (r.ok ? { brand: r.brand, composition: r.composition } : { failed: r.error }));
    if (u.ok) {
      // Keep the dosage form the person typed ("... 500/125 tablet"); the model may drop it.
      query = { brand: u.brand, composition: u.composition, form: extractDosageForm(text) || '' };
      id = await step('identify_medicine', query, () => identifyMedicine(db, query), (r) =>
        r.found ? { name: r.medicine.name, composition: r.label, via: r.via } : { found: false }
      );
    }
  }

  if (!id.found) return { status: 'not_found', lang, read, trace, source };

  const med = id.medicine;
  const meta = await loadMeta(db);
  const same = await step('find_same_salt', { ckey: med.ckey }, () => findSameSalt(db, med.ckey), (r) => ({
    count: r.count,
    cheapest: r.items[0] ? `${r.items[0].name} @ ₹${r.items[0].unit_price}/unit` : null,
  }));
  // Narrow-therapeutic-index medicines: no cheaper option of any kind is suggested, so the
  // Jan Aushadhi generic is not looked up either (the Kendra list is still shown).
  const ntiMed = !!med.nti;
  const ja = ntiMed
    ? { available: false, nti: true }
    : meta.ja_loaded_at
    ? await step('jan_aushadhi_match', { ckey: med.ckey }, () => janAushadhiMatch(db, med.ckey), (r) =>
        r.available ? { drug_code: r.product.drug_code, name: r.product.generic_name, mrp: r.product.mrp, unit_size: r.product.unit_size } : { available: false }
      )
    : { available: false, pending: true };
  if (ntiMed) trace.push({ tool: 'jan_aushadhi_match', input: { ckey: med.ckey }, output: { skipped: 'narrow-therapeutic-index medicine: no switch suggested' }, ms: 0 });
  else if (!meta.ja_loaded_at) trace.push({ tool: 'jan_aushadhi_match', input: { ckey: med.ckey }, output: { skipped: 'PMBJP product list not loaded' }, ms: 0 });

  const wantsKendra = pin.length === 6 || (input.lat != null && input.lng != null);
  let kendras = { by: null, items: [], pending: !meta.kendras_loaded_at };
  if (wantsKendra && meta.kendras_loaded_at) {
    kendras = await step('nearest_kendra', { pin: pin || undefined, location: input.lat != null ? 'approximate (not stored)' : undefined }, () =>
      nearestKendra(db, { pin, lat: input.lat, lng: input.lng }), (r) => ({ by: r.by, found: r.items.length, nearest: r.items[0]?.code }));
  } else if (wantsKendra) {
    trace.push({ tool: 'nearest_kendra', input: { pin }, output: { skipped: 'Kendra list not loaded' }, ms: 0 });
  }

  const nti = ntiMed;
  const saving = nti ? { pack: med.pack, scanned_unit: med.unit_price, best_unit: null, saving_pack: null, pct: null } : computeSaving(med, same, ja);
  const cheapest = same.items[0];
  const facts = {
    brand: med.name,
    composition: describeKey(med.ckey).split(' · ')[0],
    count: same.count,
    cheapBrand: cheapest && cheapest.name.toLowerCase() !== med.name.toLowerCase() ? cheapest.name : null,
    cheapUnit: cheapest?.unit_price,
    yourUnit: med.unit_price,
    jaName: ja.available ? ja.product.generic_name : null,
    jaUnit: ja.available ? ja.product.unit_price : null,
    saving: saving.saving_pack,
    pack: saving.pack,
    form: med.form,
    nti,
  };
  const answer = await step('compose_answer', { lang }, async () => composeAnswer(lang, facts), (a) => ({ chars: a.length }));

  return {
    status: 'ok',
    lang,
    source,
    read,
    medicine: { name: med.name, manufacturer: med.manufacturer, composition: describeKey(med.ckey), ckey: med.ckey, price: med.price, pack: med.pack, unit_price: med.unit_price, form: med.form, nti, via: id.via, alternatives: id.alternatives },
    same_salt: nti ? { count: same.count, items: [], cheapest_unit: null } : same,
    jan_aushadhi: ja,
    kendras,
    saving,
    answer,
    pin3: pin.length === 6 ? pin.slice(0, 3) : null,
    data: { brand_prices: meta.medicines_dataset_date || 'November 2022', ja_list_date: meta.ja_list_date || null, kendra_list_date: meta.kendra_list_date || null },
    trace,
  };
}

let metaCache = null;
let metaAt = 0;
export async function loadMeta(db) {
  if (metaCache && Date.now() - metaAt < 60_000) return metaCache;
  const res = await db.prepare('SELECT key, value FROM meta').all();
  metaCache = Object.fromEntries((res.results || []).map((r) => [r.key, r.value]));
  metaAt = Date.now();
  return metaCache;
}
