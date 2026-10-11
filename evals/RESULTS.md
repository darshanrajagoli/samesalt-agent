# Eval results

Run 2026-10-11T05:34:14.629Z against https://samesalt-agent.samesalt-worker.workers.dev. 23/23 cases pass (100%); exact composition key correct in 23/23. Photos 18/18, typed 5/5. Median latency 1944 ms. On photos where both a brand and a composition were read, the composition independently agreed with the brand in 17/17.

All photos are synthetic renders (evals/render_strips.py), not real strips: real-world accuracy will be lower and is measured in the field pilot.

| case | result | got | via | composition agrees | ms |
|---|---|---|---|---|---|
| img-dolo650 | pass | Dolo 650 Tablet | brand+composition | true | 4006 |
| img-pan40 | pass | PAN 40 Tablet | brand+composition | true | 3137 |
| img-augmentin625 | pass | Augmentin 625 Duo Tablet | brand+composition | true | 2402 |
| img-telma40 | pass | Telma 40 Tablet | brand+composition | true | 2486 |
| img-glycomet-sr | pass | Glycomet 500 SR Tablet | brand+composition | true | 1977 |
| img-azithral500 | pass | Azithral 500 Tablet | brand+composition | true | 2067 |
| img-ecosprin75 | pass | Ecosprin 75 Tablet | brand+composition | true | 1986 |
| img-amlokind5 | pass | Amlokind 5 Tablet | brand+composition | true | 1944 |
| img-montair10 | pass | Montair 10 Tablet | brand+composition | true | 2278 |
| img-thyronorm50 | pass | Thyronorm 50mcg Tablet | brand+composition | true | 1758 |
| img-crocin-pr | pass | Crocin Pain Relief Tablet | brand+composition | true | 2342 |
| img-atorva20 | pass | Atorva 20 Tablet | brand+composition | true | 1784 |
| img-ecosprin-av | pass | Ecosprin AV 75/20 Capsule | brand+composition | true | 1882 |
| img-allegra120 | pass | Allegra 120mg Tablet | brand+composition | true | 2929 |
| img-rosuvas10 | pass | Rosuvas 10 Tablet | brand+composition | true | 2096 |
| hard-heavy-blur | pass | Telma 40 Tablet | brand+composition | true | 1685 |
| hard-cropped | pass | PAN 40 Tablet | brand+composition | true | 1676 |
| hard-unknown-brand | pass | PYRETOL-650 | composition | — | 1580 |
| txt-dolo-glued | pass | Dolo 650 Tablet | brand | — | 316 |
| txt-kannada | pass | Dolo 650 Tablet | brand | — | 1189 |
| txt-hindi | pass | PAN 40 Tablet | brand | — | 915 |
| txt-augmentin | pass | Augmentin 625 Duo Tablet | brand | — | 410 |
| txt-telma-pin | pass | Telma 40 Tablet | brand | — | 305 |
