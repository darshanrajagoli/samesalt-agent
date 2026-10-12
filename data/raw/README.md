# Official Jan Aushadhi source files

Unmodified downloads from the Pharmaceuticals & Medical Devices Bureau of India (PMBI), Department of Pharmaceuticals, Government of India. Public government information, reproduced here with source and download date so every Jan Aushadhi price and Kendra in the app can be traced back to the official file.

| File | Source | Downloaded | Rows | Loaded into D1 |
|---|---|---|---|---|
| `ja_products_2026-10-11.csv` | PMBJP product list with MRPs: https://janaushadhi.gov.in/product-portfolio/product-mrp-list | 2026-10-11 | 2,439 products | 1,914 in `ja_products` (1,379 match a branded composition exactly, 535 parsed with no branded equivalent). 525 left out on purpose (multivitamins, devices, unclear strengths): never guessed. |
| `kendras_2026-10-12/*.pdf` | "Locate Kendra" per-state lists: https://janaushadhi.gov.in/locate-kendra | 2026-10-12 | 35 states/UTs, 21,588 rows | 19,986 Kendras in `kendras` (by PIN code; the official list has no coordinates). `Haryana.pdf` is empty on the official site itself. |

Rebuild the seed SQL with:

```bash
python data/build_ja.py --products data/raw/ja_products_2026-10-11.csv --list-date 2026-10-11 --medicines-db ../samesalt/assets/samesalt.db
python data/build_ja.py --kendras data/raw/kendras_2026-10-12 --list-date 2026-10-12
```

The Kendra list's name column is often the licensee's personal name, so the app shows a Kendra by its PMBJK code and address, not by that name.
