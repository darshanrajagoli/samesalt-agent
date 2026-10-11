// Tool: read_strip. A vision model on Cloudflare Workers AI (free tier) reads the brand,
// salts and strengths printed on a medicine strip. Falls through a list of models; if all
// fail (quota exhausted, outage), the caller tells the browser to OCR the photo locally.

export const VISION_MODELS = [
  '@cf/meta/llama-4-scout-17b-16e-instruct',
  '@cf/mistralai/mistral-small-3.1-24b-instruct',
];
export const TEXT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

// Prompts live in AgentFoundry's Agent Studio (.codenow/agent-studio/prompts/, versioned there and
// evaluated across models in AF's Evals tab) and are bundled into the Worker as text modules.
import READ_STRIP_MD from '../../.codenow/agent-studio/prompts/read_strip.md';
import UNDERSTAND_TEXT_MD from '../../.codenow/agent-studio/prompts/understand_text.md';

export const stripFrontmatter = (md) => String(md).replace(/^---[\s\S]*?---\s*/, '').trim();
const SYSTEM = stripFrontmatter(READ_STRIP_MD);
const UNDERSTAND = stripFrontmatter(UNDERSTAND_TEXT_MD);

export function parseJsonLoose(x) {
  if (x && typeof x === 'object') return x;
  const s = String(x || '');
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    try {
      return JSON.parse(m[0].replace(/,\s*}/g, '}').replace(/'/g, '"'));
    } catch {
      return null;
    }
  }
}

export async function readStrip(env, imageDataUrl) {
  const errors = [];
  for (const model of VISION_MODELS) {
    const t0 = Date.now();
    try {
      const out = await env.AI.run(model, {
        messages: [
          { role: 'system', content: SYSTEM },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Read this medicine strip. JSON only.' },
              { type: 'image_url', image_url: { url: imageDataUrl } },
            ],
          },
        ],
        max_tokens: 300,
        temperature: 0,
      });
      const parsed = parseJsonLoose(out?.response ?? out?.result?.response ?? out);
      if (parsed && (parsed.brand || parsed.composition)) {
        return { ok: true, model, ms: Date.now() - t0, ...normalizeRead(parsed) };
      }
      errors.push(`${model}: unreadable`);
    } catch (e) {
      errors.push(`${model}: ${String(e?.message || e).slice(0, 120)}`);
    }
  }
  return { ok: false, errors };
}

function normalizeRead(p) {
  const clean = (v) => (typeof v === 'string' ? v.trim() : '');
  return {
    brand: clean(p.brand).replace(/\s+/g, ' ').slice(0, 80),
    composition: clean(p.composition).slice(0, 300),
    form: clean(p.form).toLowerCase(),
    release: clean(p.release).toUpperCase(),
    readable: p.readable !== false,
  };
}

/** Free-text understanding for typed input in any script ("ಡೋಲೋ 650", "dolo650 ka sasta"). */
export async function understandText(env, text) {
  const t0 = Date.now();
  try {
    const out = await env.AI.run(TEXT_MODEL, {
      messages: [
        {
          role: 'system',
          content: UNDERSTAND,
        },
        { role: 'user', content: text.slice(0, 300) },
      ],
      max_tokens: 120,
      temperature: 0,
    });
    const p = parseJsonLoose(out?.response ?? out);
    if (p && (p.brand || p.composition)) return { ok: true, model: TEXT_MODEL, ms: Date.now() - t0, brand: String(p.brand || ''), composition: String(p.composition || '') };
  } catch (e) {
    return { ok: false, error: String(e?.message || e).slice(0, 120) };
  }
  return { ok: false, error: 'no medicine found in text' };
}
