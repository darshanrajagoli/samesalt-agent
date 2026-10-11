#!/usr/bin/env python3
"""Build D1 seed SQL for the medicines table from SameSalt's SQLite database.

Source: SameSalt's assets/samesalt.db (github.com/darshanrajagoli/samesalt), itself built
from the Kaggle "A-Z Medicine Dataset of India" (Shudhanshu Singh, CC BY-SA 4.0, Nov 2022).

Usage:
    python data/build_d1.py --db ../samesalt/assets/samesalt.db --out data/build
    cd worker && npx wrangler d1 execute samesalt --remote --file ../data/build/medicines-000.sql  (etc.)

The only transformation is cleaning float noise in canonical keys
("formoterol:0.0045000000000000005mg" -> "formoterol:0.0045mg") so keys are
byte-identical to what worker/src/normalize.js produces at runtime.
"""
import argparse
import re
import sqlite3
from pathlib import Path

ROWS_PER_INSERT = 150
ROWS_PER_FILE = 30000


def clean_key(key: str | None) -> str | None:
    if not key:
        return key

    def fix(m: re.Match) -> str:
        v = round(float(m.group(1)), 6)
        return (str(int(v)) if v == int(v) else repr(v)) + "mg"

    return re.sub(r"(\d+\.\d{7,})mg", fix, key)


def q(v) -> str:
    if v is None:
        return "NULL"
    if isinstance(v, (int, float)):
        return repr(v)
    return "'" + str(v).replace("'", "''") + "'"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", required=True)
    ap.add_argument("--out", default="data/build")
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    for f in out.glob("medicines-*.sql"):
        f.unlink()

    con = sqlite3.connect(args.db)
    rows = con.execute(
        "SELECT id, name, manufacturer, salt_composition, canonical_key, price, pack_size,"
        " per_unit_price, dosage_form, release_type, is_nti, composition_incomplete"
        " FROM medicines ORDER BY id"
    ).fetchall()
    meta = dict(con.execute("SELECT key, value FROM metadata").fetchall())

    files = 0
    for start in range(0, len(rows), ROWS_PER_FILE):
        chunk = rows[start:start + ROWS_PER_FILE]
        lines = []
        for i in range(0, len(chunk), ROWS_PER_INSERT):
            vals = []
            for r in chunk[i:i + ROWS_PER_INSERT]:
                r = list(r)
                r[4] = clean_key(r[4])
                vals.append("(" + ",".join(q(v) for v in r) + ")")
            lines.append(
                "INSERT OR REPLACE INTO medicines (id,name,manufacturer,salt,ckey,price,pack,unit_price,form,rel,nti,incomplete) VALUES\n"
                + ",\n".join(vals) + ";"
            )
        (out / f"medicines-{files:03d}.sql").write_text("\n".join(lines) + "\n", encoding="utf-8")
        files += 1

    meta_sql = "\n".join(
        f"INSERT OR REPLACE INTO meta (key, value) VALUES ({q('medicines_' + k)}, {q(v)});" for k, v in meta.items()
    )
    (out / "meta-medicines.sql").write_text(meta_sql + "\n", encoding="utf-8")
    print(f"{len(rows):,} medicines -> {files} files in {out}")


if __name__ == "__main__":
    main()
