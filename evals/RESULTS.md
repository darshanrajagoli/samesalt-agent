# Eval results

Run 2026-10-11T05:16:34.735Z against https://samesalt-agent.samesalt-worker.workers.dev. 23/23 cases pass (100%); exact composition key correct in 23/23. Photos 15/15, typed 5/5. Median latency 1715 ms. On photos where both a brand and a composition were read, the composition independently agreed with the brand in 15/15.

All photos are synthetic renders (evals/render_strips.py), not real strips: real-world accuracy will be lower and is measured in the field pilot.

| case | result | got | via | composition agrees | ms |
|---|---|---|---|---|---|
| img-dolo650 | pass | Dolo 650 Tablet | brand+composition | true | 1863 |
| img-pan40 | pass | PAN 40 Tablet | brand+composition | true | 2259 |
| img-augmentin625 | pass | Augmentin 625 Duo Tablet | brand+composition | true | 1868 |
| img-telma40 | pass | Telma 40 Tablet | brand+composition | true | 1640 |
| img-glycomet-sr | pass | Glycomet 500 SR Tablet | brand+composition | true | 2745 |
| img-azithral500 | pass | Azithral 500 Tablet | brand+composition | true | 2606 |
| img-ecosprin75 | pass | Ecosprin 75 Tablet | brand+composition | true | 1437 |
| img-amlokind5 | pass | Amlokind 5 Tablet | brand+composition | true | 2131 |
| img-montair10 | pass | Montair 10 Tablet | brand+composition | true | 1959 |
| img-thyronorm50 | pass | Thyronorm 50mcg Tablet | brand+composition | true | 1675 |
| img-crocin-pr | pass | Crocin Pain Relief Tablet | brand+composition | true | 1715 |
| img-atorva20 | pass | Atorva 20 Tablet | brand+composition | true | 1343 |
| img-ecosprin-av | pass | Ecosprin AV 75/20 Capsule | brand+composition | true | 1763 |
| img-allegra120 | pass | Allegra 120mg Tablet | brand+composition | true | 1712 |
| img-rosuvas10 | pass | Rosuvas 10 Tablet | brand+composition | true | 2376 |
| hard-heavy-blur | pass | Telma 40 Tablet | brand+composition | true | 1598 |
| hard-cropped | pass | PAN 40 Tablet | brand+composition | true | 1985 |
| hard-unknown-brand | pass | PYRETOL-650 | composition | — | 1826 |
| txt-dolo-glued | pass | Dolo 650 Tablet | brand | — | 280 |
| txt-kannada | pass | Dolo 650 Tablet | brand | — | 914 |
| txt-hindi | pass | PAN 40 Tablet | brand | — | 879 |
| txt-augmentin | pass | Augmentin 625 Duo Tablet | brand | — | 292 |
| txt-telma-pin | pass | Telma 40 Tablet | brand | — | 290 |
