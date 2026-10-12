import { LANGS, STRINGS, t, rupees, unitKind } from '/strings.js';

const $ = (s) => document.querySelector(s);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} },
};

// ── State: language, test flag, volunteer mode, anonymous device token ─────────
const params = new URLSearchParams(location.search);
if (params.has('test')) store.set('ss_test', params.get('test') === '0' ? null : '1');
if (params.has('volunteer')) store.set('ss_vol', params.get('volunteer') === '0' ? null : '1');
if (params.has('lang') && STRINGS[params.get('lang')]) store.set('ss_lang', params.get('lang'));

let lang = store.get('ss_lang') || ((navigator.language || '').startsWith('kn') ? 'kn' : (navigator.language || '').startsWith('hi') ? 'hi' : 'en');
const isTest = store.get('ss_test') === '1';
const volunteer = store.get('ss_vol') === '1';
let device = store.get('ss_dev');
if (!device) {
  device = Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => b.toString(16).padStart(2, '0')).join('');
  store.set('ss_dev', device);
}
let last = null; // last result, re-rendered on language change

// ── Language ───────────────────────────────────────────────────────────────
function renderLangs() {
  const box = $('#langs');
  box.innerHTML = '';
  for (const l of LANGS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = l.label;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(l.code === lang));
    b.lang = l.code;
    b.onclick = () => setLang(l.code);
    box.appendChild(b);
  }
}
function applyStrings() {
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = t(lang, el.dataset.t);
  for (const el of document.querySelectorAll('[data-tp]')) el.placeholder = t(lang, el.dataset.tp);
  $('#volBanner').hidden = !volunteer;
  const jaDate = last?.data?.ja_list_date;
  const note = t(lang, 'dataNote', { date: jaDate ? fmtDate(jaDate) : '' });
  $('#dataNote').textContent = jaDate ? note : note.split(/(?<=[.।;])\s/)[0];
}
function setLang(code) {
  lang = code;
  store.set('ss_lang', code);
  renderLangs();
  applyStrings();
  if (last) {
    // Re-ask so the agent's answer is composed in the new language (cheap: no photo is re-sent).
    if (last.medicine) ask({ text: last.medicine.name, relog: false });
  }
}

// ── Inputs ─────────────────────────────────────────────────────────────────
const pinInput = $('#pinInput');
pinInput.value = store.get('ss_pin') || '';
pinInput.addEventListener('input', () => {
  pinInput.value = pinInput.value.replace(/\D/g, '').slice(0, 6);
  store.set('ss_pin', pinInput.value.length === 6 ? pinInput.value : null);
});
// The official Kendra list has PIN codes but no coordinates, so Kendras are found by PIN.
// (The Worker still accepts lat/lng for a future geocoded list.)
const coords = null;

$('#typeForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = $('#nameInput').value.trim();
  if (q) ask({ text: q });
});

$('#photo').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  const dataUrl = await downscale(file, 1280, 0.85);
  ask({ image: dataUrl });
});

async function downscale(file, maxSide, quality) {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) {
    return await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });
  }
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', quality);
}

// ── Agent call ─────────────────────────────────────────────────────────────
function show(section) {
  for (const id of ['home', 'busy', 'result']) $('#' + id).hidden = id !== section;
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

async function ask({ text, image, ocr, relog = true }) {
  $('#busyText').textContent = image ? t(lang, 'reading') : t(lang, 'checking');
  const thumb = $('#thumb');
  thumb.hidden = !image;
  if (image) thumb.src = image;
  show('busy');
  const body = {
    text, image, ocr, lang,
    pin: pinInput.value.length === 6 ? pinInput.value : undefined,
    lat: coords?.lat, lng: coords?.lng,
    mode: volunteer ? 'volunteer' : 'self',
    device,
    test: isTest ? true : undefined,
    nolog: relog ? undefined : true,
  };
  let r;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch('/api/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      r = await res.json();
    } catch {
      r = { status: 'error' };
    }
    if (r.status !== 'error' && !r.error) break;
    await new Promise((ok) => setTimeout(ok, 2000)); // one quiet retry on a network/server hiccup
  }
  if (r.status === 'vision_unavailable' && image) {
    // Free vision quota used up or model down: read the photo on the phone instead.
    $('#busyText').textContent = t(lang, 'visionFallback');
    const text = await localOcr(image).catch(() => '');
    if (text) return ask({ ocr: text });
    r = { status: 'not_found' };
  }
  if (!relog && last?.lookup_id) r.lookup_id = last.lookup_id; // keep feedback tied to the original lookup
  last = r;
  render(r);
}

let tesseract = null;
async function localOcr(dataUrl) {
  if (!tesseract) {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    tesseract = window.Tesseract;
  }
  const out = await tesseract.recognize(dataUrl, 'eng');
  return out?.data?.text || '';
}

// ── Rendering ──────────────────────────────────────────────────────────────
function fmtDate(iso) {
  const d = new Date(iso + 'T00:00:00+05:30');
  if (isNaN(d)) return iso;
  try { return d.toLocaleDateString({ en: 'en-IN', kn: 'kn-IN', hi: 'hi-IN' }[lang], { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }); } catch { return iso; }
}
const speakerIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const warnIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>';

function render(r) {
  const out = $('#result');
  applyStrings();
  if (r.status !== 'ok') {
    out.innerHTML = `
      <div class="card"><p class="med-name" style="font-size:22px;line-height:1.35">${esc(t(lang, 'notFound'))}</p>
      ${r.read?.brand || r.read?.composition ? `<p class="med-meta">${esc([r.read.brand, r.read.composition].filter(Boolean).join(' · '))}</p>` : ''}</div>
      <button class="secondary" id="againBtn">${esc(t(lang, 'another'))}</button>`;
    $('#againBtn').onclick = () => { show('home'); $('#nameInput').focus(); };
    show('result');
    return;
  }
  const m = r.medicine;
  const unit = unitKind(m.form);
  const per = t(lang, 'perUnit')[unit];
  const s = r.saving || {};
  const items = r.same_salt.items || [];
  const yoursInList = items.some((x) => x.name.toLowerCase() === m.name.toLowerCase());

  const listHtml = items.slice(0, 6).map((x) => `
    <li class="${x.name.toLowerCase() === m.name.toLowerCase() ? 'yours' : ''}">
      <div><div class="n">${esc(x.name)}${x.name.toLowerCase() === m.name.toLowerCase() ? `<span class="tag">${esc(t(lang, 'yours'))}</span>` : ''}</div><div class="m">${esc(x.manufacturer || '')}</div></div>
      <div class="p"><b>${rupees(x.unit_price)}</b><span>${esc(per)}</span><span>${esc(t(lang, 'packOf', { n: Math.round(x.pack), price: rupees(x.price) }))}</span></div>
    </li>`).join('');
  const yoursRow = !yoursInList && m.unit_price ? `
    <li class="yours"><div><div class="n">${esc(m.name)}<span class="tag">${esc(t(lang, 'yours'))}</span></div><div class="m">${esc(m.manufacturer || '')}</div></div>
    <div class="p"><b>${rupees(m.unit_price)}</b><span>${esc(per)}</span></div></li>` : '';

  const ja = r.jan_aushadhi || {};
  const jaDate = r.data?.ja_list_date;
  const jaHtml = ja.available ? `
      <p class="ja-name">${esc(ja.product.generic_name)}</p>
      <p class="ja-price">${rupees(ja.product.mrp)}<small>${esc(ja.product.unit_size || '')}</small></p>
      <p class="med-meta">${esc(t(lang, 'jaMrp'))}${ja.product.unit_price ? ` · ${rupees(ja.product.unit_price)} ${esc(per)}` : ''} · PMBJP ${esc(ja.product.drug_code)}</p>
      ${jaDate ? `<p class="source">${esc(t(lang, 'jaSource', { date: fmtDate(jaDate) }))}</p>` : ''}`
    : `<p class="muted" style="margin:0">${esc(t(lang, ja.nti ? 'jaNti' : ja.pending ? 'jaPending' : 'jaNone'))}</p>`;

  // The official list's "name" is often the licensee's personal name, so a Kendra is shown by
  // its PMBJK code and address only.
  const k = r.kendras || {};
  const kDate = r.data?.kendra_list_date;
  const kQuery = (x) => `Jan Aushadhi Kendra ${[x.address, x.district, x.pin].filter(Boolean).join(' ')}`;
  const kHtml = k.items?.length
    ? `${k.by === 'nearby-pin' ? `<p class="med-meta" style="margin:0 0 4px">${esc(t(lang, 'kendraNearby'))}</p>` : ''}
      <ul class="list">${k.items.map((x) => `
        <li><div><div class="n">${esc(t(lang, 'kendraName'))}<span class="tag grey">${esc(x.code)}</span></div>
        <div class="m">${esc([x.address, x.district].filter(Boolean).join(', '))}</div>
        <div class="k-actions"><a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(x.lat && x.lng ? `${x.lat},${x.lng}` : kQuery(x))}">${esc(t(lang, 'directions'))}</a>${x.phone ? `<a href="tel:${esc(x.phone)}">${esc(t(lang, 'call'))}</a>` : ''}</div></div>
        <div class="p">${x.km != null ? `<b>${x.km} km</b>` : `<b>${esc(x.pin)}</b><span>PIN</span>`}</div></li>`).join('')}</ul>
      ${kDate ? `<p class="source">${esc(t(lang, 'kendraSource', { date: fmtDate(kDate) }))}</p>` : ''}`
    : `<p class="muted" style="margin:0">${esc(t(lang, k.pending ? 'kendraPending' : pinInput.value.length === 6 ? 'kendraNone' : 'kendraNeedPin'))}</p>`;

  const steps = (r.trace || []).map((st) => `<li><code>${esc(st.tool)}</code> ${esc(summarizeStep(st))} <span class="muted">· ${st.ms} ms</span></li>`).join('');

  out.innerHTML = `
    <div class="card">
      <p class="eyebrow">${esc(t(lang, 'youHave'))}</p>
      <p class="med-name">${esc(m.name)}</p>
      <p class="med-comp">${esc(m.name === m.composition.split(' · ')[0] ? m.composition.split(' · ').slice(1).join(' · ') : m.composition)}</p>
      ${m.price ? `<p class="med-meta">${esc(t(lang, 'packOf', { n: Math.round(m.pack), price: rupees(m.price) }))} · ${rupees(m.unit_price)} ${esc(per)}${m.manufacturer ? ` · ${esc(m.manufacturer)}` : ''}</p>` : ''}
    </div>

    ${m.nti ? `<div class="safety nti">${warnIcon}<div>${esc(t(lang, 'nti'))}</div></div>` : ''}

    ${!m.nti && s.saving_pack > 0 ? `<div class="saving"><p class="big">${esc(t(lang, 'saveUpTo', { amount: rupees(s.saving_pack) }))}</p><p class="small">${rupees(s.scanned_unit)} → ${rupees(s.best_unit)} ${esc(per)}<span class="pct">−${s.pct}%</span></p></div>` : ''}

    <div class="answer" lang="${lang}"><div id="answerText">${esc(r.answer)}</div>
      <div class="row"><button class="pill" id="listenBtn" hidden>${speakerIcon}${esc(t(lang, 'listen'))}</button></div></div>

    ${!m.nti && r.same_salt.count ? `<div class="card">
      <p class="eyebrow">${esc(t(lang, 'sameSaltTitle'))}</p>
      <p class="count">${esc(t(lang, 'brandsCount', { n: r.same_salt.count.toLocaleString('en-IN') }))}</p>
      <ul class="list">${listHtml}${yoursRow}</ul>
    </div>` : ''}

    <div class="card">
      <p class="eyebrow">${esc(t(lang, 'jaTitle'))}</p>
      ${jaHtml}
    </div>

    <div class="card">
      <p class="eyebrow">${esc(t(lang, 'kendraTitle'))}</p>
      ${kHtml}
    </div>

    <div class="safety">${warnIcon}<div>${esc(t(lang, 'safety'))}</div></div>

    <div class="actions">
      <button class="primary" id="phBtn">${esc(t(lang, 'pharmacistBtn'))}</button>
    </div>

    <div class="card feedback" id="fb">
      <p>${esc(t(lang, 'switchQ'))}</p>
      <div class="chips">
        <button class="chip" data-v="yes">${esc(t(lang, 'switchYes'))}</button>
        <button class="chip" data-v="ask">${esc(t(lang, 'switchAsk'))}</button>
        <button class="chip" data-v="no">${esc(t(lang, 'switchNo'))}</button>
      </div>
    </div>

    <details class="steps"><summary>${esc(t(lang, 'stepsTitle'))}</summary><ol>${steps}</ol></details>

    <button class="secondary" id="againBtn">${esc(t(lang, 'another'))}</button>
  `;

  $('#phBtn').onclick = () => {
    $('#phComp').textContent = m.composition.split(' · ')[0].replace(/(\d) (mg|mcg|ml|IU|%)/g, '$1\u00a0$2');
    $('#phSub').textContent = [m.form, m.name].filter(Boolean).join(' · ');
    $('#pharmacist').showModal();
  };
  for (const b of out.querySelectorAll('.chip')) {
    b.onclick = async () => {
      $('#fb').innerHTML = `<p style="margin:0">${esc(t(lang, 'thanks'))}</p>`;
      if (r.lookup_id) {
        fetch('/api/feedback', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: r.lookup_id, switched: b.dataset.v }) }).catch(() => {});
      }
    };
  }
  $('#againBtn').onclick = () => { show('home'); };
  setupListen(r.answer);
  show('result');
}

function summarizeStep(st) {
  const o = st.output || {};
  if (st.error) return `error: ${st.error}`;
  switch (st.tool) {
    case 'read_strip': return o.failed ? 'vision unavailable' : `${o.model?.split('/').pop()} read "${[o.brand, o.composition].filter(Boolean).join(' · ')}"`;
    case 'identify_medicine': return o.found === false ? 'not found' : `${o.name} (${o.via})`;
    case 'understand_text': return o.failed ? 'no medicine found' : `"${o.brand}"`;
    case 'find_same_salt': return `${o.count} brands with key ${st.input?.ckey}`;
    case 'jan_aushadhi_match': return o.skipped ? o.skipped : o.available === false ? 'no PMBJP product with this key' : `${o.name} · ₹${o.mrp}`;
    case 'nearest_kendra': return o.skipped ? o.skipped : `${o.found} found (${o.by})`;
    case 'parse_ocr_text': return `on-device OCR → ${(o.brand_candidates || []).slice(0, 3).join(', ')}`;
    case 'compose_answer': return `${lang}`;
    default: return '';
  }
}

function setupListen(text) {
  const btn = $('#listenBtn');
  if (!('speechSynthesis' in window)) return;
  const want = { en: 'en-IN', hi: 'hi-IN', kn: 'kn-IN' }[lang];
  const pick = () => speechSynthesis.getVoices().find((v) => v.lang === want) || speechSynthesis.getVoices().find((v) => v.lang?.startsWith(lang));
  const enable = () => { if (pick()) btn.hidden = false; };
  enable();
  speechSynthesis.onvoiceschanged = enable;
  btn.onclick = () => {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = pick();
    u.lang = want;
    u.rate = 0.95;
    speechSynthesis.speak(u);
  };
}

renderLangs();
applyStrings();
