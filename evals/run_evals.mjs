#!/usr/bin/env node
// Runs evals/cases.json against the deployed agent (or SAMESALT_URL), scores each case,
// writes evals/results.json + evals/RESULTS.md, and records every run as AgentFoundry
// run JSONL (.codenow/runs/samesalt-agent/*.jsonl) so it can be replayed in AF's Runs tab.
//
//   node evals/run_evals.mjs                # against production, flagged as test traffic
//   SAMESALT_URL=http://localhost:8787 node evals/run_evals.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const BASE = process.env.SAMESALT_URL || 'https://samesalt-agent.samesalt-worker.workers.dev';
const suite = JSON.parse(readFileSync(join(HERE, 'cases.json'), 'utf8'));
const runsDir = join(ROOT, '.codenow', 'runs', 'samesalt-agent');
mkdirSync(runsDir, { recursive: true });

function recordRun(c, body, res, ms) {
  const runId = randomUUID();
  const ts0 = Date.now() - ms;
  const input = c.text ? c.text : `[photo] ${c.image}`;
  const ev = [{ kind: 'run.start', runId, slug: 'samesalt-agent', ts: ts0, input, kit: 'cloudflare-worker', model: 'workers-ai/llama-4-scout + deterministic tools', source: 'eval' }];
  let t = ts0;
  for (const st of res.trace || []) {
    const id = `toolu_${st.tool}_${Math.random().toString(36).slice(2, 8)}`;
    ev.push({ kind: 'message', ts: t, message: { type: 'assistant', message: { role: 'assistant', content: [{ type: 'tool_use', id, name: st.tool, input: st.input }] } } });
    t += st.ms || 0;
    ev.push({ kind: 'message', ts: t, message: { type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content: JSON.stringify(st.output ?? st.error ?? null) }] } } });
  }
  const resultMessage = { type: 'result', subtype: res.status === 'ok' ? 'success' : 'error', result: res.answer || res.status, duration_ms: ms, model: res.trace?.find((s) => s.tool === 'read_strip')?.output?.model || null };
  ev.push({ kind: 'message', ts: ts0 + ms, message: resultMessage });
  ev.push({ kind: 'run.end', ts: ts0 + ms, durationMs: ms, status: res.status === 'ok' ? 'success' : 'error', resultMessage });
  writeFileSync(join(runsDir, `${ts0}-${runId}.jsonl`), ev.map((e) => JSON.stringify(e)).join('\n') + '\n');
}

const results = [];
for (const c of suite.cases) {
  const body = { lang: c.lang || 'en', test: true };
  if (c.text) body.text = c.text;
  if (c.image) body.image = 'data:image/jpeg;base64,' + readFileSync(join(HERE, c.image)).toString('base64');
  const t0 = Date.now();
  let res;
  let retried = false;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(`${BASE}/api/ask`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-samesalt-test': '1' }, body: JSON.stringify(body) });
      const txt = await r.text();
      try { res = JSON.parse(txt); } catch { res = { status: 'error', error: `HTTP ${r.status}: ${txt.slice(0, 120)}` }; }
    } catch (e) {
      res = { status: 'error', error: String(e) };
    }
    if (res.status !== 'error' && !res.error) break;
    retried = true; // one retry on a transport/5xx error, same as the web app does
    await new Promise((ok) => setTimeout(ok, 3000));
  }
  const ms = Date.now() - t0;
  const got = res.medicine || {};
  const checks = {
    found: res.status === 'ok',
    ckey: got.ckey === c.expect_ckey,
    name: c.expect_name ? got.name?.toLowerCase() === c.expect_name.toLowerCase() : null,
    nti: c.expect_nti ? got.nti === true && (res.same_salt?.items?.length ?? 0) === 0 : got.nti !== true,
    pin3: c.expect_pin3 ? res.pin3 === c.expect_pin3 : null,
    safety_line: typeof res.answer === 'string' && /(doctor|ವೈದ್ಯರ|डॉक्टर)/.test(res.answer),
  };
  const pass = Object.values(checks).every((v) => v === null || v === true);
  const read = res.trace?.find((s) => s.tool === 'read_strip')?.output;
  const agrees = res.trace?.find((s) => s.tool === 'identify_medicine')?.output?.composition_agrees ?? null;
  results.push({ id: c.id, pass, ms, retried, error: res.error || null, checks, got: { name: got.name, ckey: got.ckey, via: got.via, read, composition_agrees: agrees }, vision_model: read?.model || null });
  recordRun(c, body, res, ms);
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${c.id.padEnd(18)} ${String(ms).padStart(5)} ms  -> ${got.name || res.status}${pass ? '' : `  (want ${c.expect_name || c.expect_ckey})`}`);
}

const n = results.length;
const passed = results.filter((r) => r.pass).length;
const imgs = results.filter((r) => r.id.startsWith('img-') || r.id.startsWith('hard-'));
const txts = results.filter((r) => r.id.startsWith('txt-'));
const keyAcc = results.filter((r) => r.checks.ckey).length;
const summary = {
  when: new Date().toISOString(),
  target: BASE,
  cases: n,
  passed,
  accuracy: +(passed / n).toFixed(3),
  composition_key_accuracy: +(keyAcc / n).toFixed(3),
  photos: { cases: imgs.length, passed: imgs.filter((r) => r.pass).length },
  typed: { cases: txts.length, passed: txts.filter((r) => r.pass).length },
  photo_composition_agrees_with_brand: imgs.filter((r) => r.got.composition_agrees === true).length + '/' + imgs.filter((r) => r.got.composition_agrees !== null).length,
  median_ms: results.map((r) => r.ms).sort((a, b) => a - b)[Math.floor(n / 2)],
};
writeFileSync(join(HERE, 'results.json'), JSON.stringify({ summary, results }, null, 2));
const md = [
  `# Eval results`,
  ``,
  `Run ${summary.when} against ${BASE}. ${passed}/${n} cases pass (${Math.round(summary.accuracy * 100)}%); exact composition key correct in ${keyAcc}/${n}. Photos ${summary.photos.passed}/${summary.photos.cases}, typed ${summary.typed.passed}/${summary.typed.cases}. Median latency ${summary.median_ms} ms. On photos where both a brand and a composition were read, the composition independently agreed with the brand in ${summary.photo_composition_agrees_with_brand}.`,
  ``,
  `All photos are synthetic renders (evals/render_strips.py), not real strips: real-world accuracy will be lower and is measured in the field pilot.`,
  ``,
  `| case | result | got | via | composition agrees | ms |`,
  `|---|---|---|---|---|---|`,
  ...results.map((r) => `| ${r.id} | ${r.pass ? 'pass' : '**fail**'} | ${r.got.name || '—'} | ${r.got.via || '—'} | ${r.got.composition_agrees ?? '—'} | ${r.ms} |`),
  ``,
].join('\n');
writeFileSync(join(HERE, 'RESULTS.md'), md);
console.log(`\n${passed}/${n} passed (${Math.round(summary.accuracy * 100)}%), key accuracy ${keyAcc}/${n}, median ${summary.median_ms} ms`);
