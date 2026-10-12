# Eval results

Run 2026-10-12T00:45:13.117Z against https://samesalt-agent.samesalt-worker.workers.dev. 23/23 cases pass (100%); exact composition key correct in 23/23. Photos 18/18, typed 5/5. Median latency 2411 ms. On photos where both a brand and a composition were read, the composition independently agreed with the brand in 17/17.

All photos are synthetic renders (evals/render_strips.py), not real strips: real-world accuracy will be lower and is measured in the field pilot.

| case | result | got | via | composition agrees | ms |
|---|---|---|---|---|---|
| img-dolo650 | pass | Dolo 650 Tablet | brand+composition | true | 3309 |
| img-pan40 | pass | PAN 40 Tablet | brand+composition | true | 2609 |
| img-augmentin625 | pass | Augmentin 625 Duo Tablet | brand+composition | true | 2741 |
| img-telma40 | pass | Telma 40 Tablet | brand+composition | true | 2868 |
| img-glycomet-sr | pass | Glycomet 500 SR Tablet | brand+composition | true | 2459 |
| img-azithral500 | pass | Azithral 500 Tablet | brand+composition | true | 2034 |
| img-ecosprin75 | pass | Ecosprin 75 Tablet | brand+composition | true | 2794 |
| img-amlokind5 | pass | Amlokind 5 Tablet | brand+composition | true | 1951 |
| img-montair10 | pass | Montair 10 Tablet | brand+composition | true | 1885 |
| img-thyronorm50 | pass | Thyronorm 50mcg Tablet | brand+composition | true | 2885 |
| img-crocin-pr | pass | Crocin Pain Relief Tablet | brand+composition | true | 2505 |
| img-atorva20 | pass | Atorva 20 Tablet | brand+composition | true | 3311 |
| img-ecosprin-av | pass | Ecosprin AV 75/20 Capsule | brand+composition | true | 6398 |
| img-allegra120 | pass | Allegra 120mg Tablet | brand+composition | true | 2411 |
| img-rosuvas10 | pass | Rosuvas 10 Tablet | brand+composition | true | 2157 |
| hard-heavy-blur | pass | Telma 40 Tablet | brand+composition | true | 1771 |
| hard-cropped | pass | PAN 40 Tablet | brand+composition | true | 1842 |
| hard-unknown-brand | pass | PYRETOL-650 | composition | — | 2736 |
| txt-dolo-glued | pass | Dolo 650 Tablet | brand | — | 354 |
| txt-kannada | pass | Dolo 650 Tablet | brand | — | 898 |
| txt-hindi | pass | PAN 40 Tablet | brand | — | 1064 |
| txt-augmentin | pass | Augmentin 625 Duo Tablet | brand | — | 364 |
| txt-telma-pin | pass | Telma 40 Tablet | brand | — | 437 |
