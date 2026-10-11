# Data licences

| Data | Source | Licence / terms | Where |
|---|---|---|---|
| 246,068 Indian medicine brands with printed MRPs and compositions | "A-Z Medicine Dataset of India", Shudhanshu Singh, Kaggle (Nov 2022) — https://www.kaggle.com/datasets/shudhanshusingh/az-medicine-dataset-of-india — normalised by SameSalt's pipeline (github.com/darshanrajagoli/samesalt) | CC BY-SA 4.0. Changes: salt names normalised to INN spelling, strengths standardised to mg, canonical composition keys and NTI flags added, converted to SQLite/D1. Any redistribution of the derived table must keep this licence and attribution. | D1 table `medicines` (built by `data/build_d1.py`); `test/fixtures/*.json` samples |
| Jan Aushadhi (PMBJP) product basket with MRPs | Pharmaceuticals & Medical Devices Bureau of India (PMBI), Department of Pharmaceuticals, Government of India — https://janaushadhi.gov.in/product-portfolio/product-mrp-list | Public government information; reproduced with source and download date | D1 table `ja_products` (built by `data/build_ja.py`) |
| Jan Aushadhi Kendra list | PMBI — https://janaushadhi.gov.in/locate-kendra | Public government information; reproduced with source and download date | D1 table `kendras` |

The synthetic strip images in `evals/images/` are rendered by `evals/render_strips.py` (plain text on a generic foil, no logos or real packaging artwork) and are MIT-licensed with the code.
