# How SameSalt was built in AgentFoundry

AgentFoundry (AF) desktop IDE **v0.1.80 for Windows**, free plan, signed in as the project owner. The repository folder was added as an AF project (`+` → Open Project Folder), and the work below was done inside it. Everything listed here is in the repo and can be checked.

## 1. SMART-Code reviewed the Kannada and Hindi text

SMART-Code (AF's in-IDE assistant; Cloud, served models) was asked to read `public/strings.js` and review every Kannada and Hindi string, then (on GPT-5) to do a second, Kannada-only pass that also covered the Kannada steps in `public/volunteer.html`. It read the files with its `read_file` tool (approved in AF's Confirm, then Safe, permission mode).

- Transcript: [`agentfoundry/smartcode-translation-review.txt`](agentfoundry/smartcode-translation-review.txt)
- Screenshots: [`02-smartcode-reads-strings.png`](agentfoundry/02-smartcode-reads-strings.png), [`03-smartcode-kannada-review.png`](agentfoundry/03-smartcode-kannada-review.png)

Of 17 distinct suggestions, **12 were applied** (3 reworded) and **5 rejected**:

| Suggestion | Decision |
|---|---|
| kn `contains`, kn "ಅತಿ ಕಡಿಮೆ ಬೆಲೆಯದು" → "ಅತಿ ಕಡಿಮೆ ಬೆಲೆ" (×2 sentences), kn `jaNone` add "ಇದೇ", kn `switchYes` → "ಹೌದು, ಬದಲಾಯಿಸಿದ್ದೇನೆ", kn `volunteerOn` → "ಸಹಾಯವಾಗಿ", volunteer step 1 "ಬೇಕೆಂದು" | applied |
| hi `stepsTitle` "पता लगाया", hi `volunteerOn` | applied |
| hi `intro` "दाम" → "की कीमत" | applied, reworded to "जन औषधि की सरकारी कीमत" |
| hi `dataNote` "डेटासेट में छपे" | reworded to "डेटासेट से लिए गए छपे हुए MRP" (MRPs are printed on packs, not in the dataset) |
| hi `pharmacistCard` "संयोजन … सबसे सस्ती" | "सबसे सस्ती" applied; kept "सॉल्ट और मात्रा" instead of "संयोजन", the words pharmacists use |
| kn `perUnit` drop "ಗೆ" (×4) | rejected: "ಪ್ರತಿ ಮಾತ್ರೆಗೆ ₹0.33" (dative) is the natural way to say a price per tablet |
| volunteer step 6 rewrite of the drug classes | rejected: the suggested wording was wrong (e.g. "ರಕ್ತದ ಸೋರಣೆ ಹೆಚ್ಚಿಸುವ" = "increases bleeding", "ಅಂಗಾಂತರ" is not "transplant"); kept the original and added "(ಫಿಟ್ಸ್)" so epilepsy is recognisable |

## 2. Agent Studio: the agent definition

`Agents → Build an agent` (*Describe → Build*, AF-served inference, no API key) drafted the **SameSalt** agent from a plain-language goal. AF's first draft planned to scrape 1mg/PharmEasy/CDSCO with a browser tool; that plan was replaced with the production tool plan (`read_strip → understand_text → identify_medicine → find_same_salt → jan_aushadhi_match → nearest_kendra → compose_answer → log_lookup`), the guardrails (same salt+strength+form only, no dosage advice, no switch for NTI drugs, privacy), the models, and `runsAt`. AF's original draft steps are kept in the manifest as `afDraftSteps` for transparency.

- Manifest: [`.codenow/agent-studio/agents/samesalt.json`](../.codenow/agent-studio/agents/samesalt.json)
- Screenshot: [`04-agent-card.png`](agentfoundry/04-agent-card.png)
- The TypeScript Claude-Agent-SDK kit that *Describe → Build* scaffolds was removed from the repo: it needs a paid Anthropic key, and production runs on Cloudflare (₹0).

## 3. Prompts are authored in AF and shipped from there

The two model prompts — `read_strip` (vision) and `understand_text` (typed text in any script) — live in AF's Prompts store (`.codenow/agent-studio/prompts/`, with AF's version history). The Worker imports those exact files as text modules (`worker/src/vision.js`, `[[rules]] type = "Text"` in `wrangler.toml`), so what is evaluated in AF is what runs in production.

## 4. Evals in AF

[`.codenow/agent-studio/evals/understand-text.json`](../.codenow/agent-studio/evals/understand-text.json): 12 cases — Kannada- and Hindi-script brand names, Hinglish questions, an SR product, a salt-only query, a non-medicine sentence in Kannada, a prompt-injection attempt, JSON-only output, and "don't invent a brand". Run in AF's Evals tab on SMART-Code: **12/12 pass** (result file in `evals/results/`; screenshot [`05-eval-understand-text-12of12.png`](agentfoundry/05-eval-understand-text-12of12.png)).

AF bug found on the way: on Windows the Evals tab's **Run** button passes the suite path through an inline `onclick` string, so the backslashes in `C:\Users\...` are eaten and nothing runs. The suite was run through the same IPC call the button uses (`studioRunEval`) with the correct path, and the result rendered in AF's own result view.

## 5. Runs and Replay

`evals/run_evals.mjs` sends every eval case to the **live** deployment and writes each run in AF's run format (`run.start`, `tool_use`/`tool_result` messages, `run.end`) to `.codenow/runs/samesalt-agent/`. AF's **Runs** tab lists them and the **Replay** viewer steps through each tool call with its inputs and outputs ([`06-runs-production-traces.png`](agentfoundry/06-runs-production-traces.png)).

Replaying the photo run for a Rosuvas 10 strip showed `composition_agrees: false`: the vision model had correctly read "Rosuvastatin Calcium I.P. eq. to Rosuvastatin ..... 10 mg", but the parser turned that into a salt nobody sells ([`07-replay-found-composition-bug.png`](agentfoundry/07-replay-found-composition-bug.png)). Fix: `cleanComposition()` + `resolveCompositionKey()` in `worker/src/tools.js` (handles "eq. to", I.P./B.P., dotted leaders and salt-form words, and prefers a key that brands actually use), with a regression test. After the fix, the composition read off the strip independently agreed with the brand on 17/17 photos (including the blurred and cropped ones) ([`../evals/RESULTS.md`](../evals/RESULTS.md)). Both the before and after runs are in `.codenow/runs/`.

## Screenshots

`docs/agentfoundry/01-project-open.png` … `07-replay-found-composition-bug.png`.
