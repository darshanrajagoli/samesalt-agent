# SameSalt agent — project notes for AI assistants (AgentFoundry SMART-Code, Claude Code)

Mobile-first web app + Cloudflare Worker agent that tells Indian patients which brands have
EXACTLY the same salt + strength + form as the medicine they photographed, the Jan Aushadhi
(PMBJP) generic and its MRP, and the nearest Jan Aushadhi Kendra. English, Kannada, Hindi.

- `worker/src/normalize.js` — canonical composition key (port of SameSalt's Python pipeline; must stay byte-identical, see parity test)
- `worker/src/tools.js` — agent tools over D1: identify_medicine, find_same_salt, jan_aushadhi_match, nearest_kendra
- `worker/src/vision.js` — read_strip (Workers AI vision) and understand_text
- `worker/src/agent.js` — fixed tool plan + trace; `worker/src/index.js` — API + impact log
- `public/strings.js` — ALL user-facing text (en/kn/hi) and the templated answer. Never let a model write prices or safety text.
- `public/app.js`, `public/impact.html`, `public/volunteer.html` — the web app
- `data/` — build D1 seed SQL from SameSalt's DB and the official PMBJP lists
- `test/` — `node --test test/normalize.test.mjs test/tools.test.mjs`; `python test/test_build_ja.py`
- `evals/` — `node evals/run_evals.mjs` (writes AF run JSONL to `.codenow/runs/`)

Rules: same salt + same strength + same form + same release only. Never give dosage advice. Narrow-
therapeutic-index salts never get a "switch" suggestion. Impact log stores no personal data.
