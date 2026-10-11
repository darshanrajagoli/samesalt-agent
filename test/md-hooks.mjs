// Node test support: import *.md as a default-exported string (what Wrangler's Text rule does).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
export async function load(url, context, nextLoad) {
  if (url.endsWith('.md')) {
    const text = readFileSync(fileURLToPath(url), 'utf8');
    return { format: 'module', shortCircuit: true, source: `export default ${JSON.stringify(text)};` };
  }
  return nextLoad(url, context);
}
