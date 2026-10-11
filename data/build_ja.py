#!/usr/bin/env python3
"""Load the official PMBJP (Jan Aushadhi) product list and Kendra list into D1 seed SQL.

Sources (official, Pharmaceuticals & Medical Devices Bureau of India, Dept. of Pharmaceuticals):
  * Product basket with MRPs: https://janaushadhi.gov.in/product-portfolio/product-mrp-list
    (the page offers a PDF; the same table is served as JSON by the site's
    /api/v1/website/getAllProductForWeb endpoint)
  * Kendra list: https://janaushadhi.gov.in/locate-kendra (PDF export and
    /api/v1/website/getAllKendraByStateDistrict JSON)

Download either export by hand into data/raw/ and run:
    python data/build_ja.py --products data/raw/<products.json|csv|xlsx|pdf> \
                            --kendras  data/raw/<kendras.json|csv|xlsx|pdf> \
                            --list-date 2026-10-11 --medicines-db ../samesalt/assets/samesalt.db
    cd worker && npx wrangler d1 execute samesalt-agent --remote --file ../data/build/ja.sql
                 npx wrangler d1 execute samesalt-agent --remote --file ../data/build/kendras.sql

Each PMBJP generic name ("Amoxycillin and Potassium Clavulanate Tablets IP 500 mg + 125 mg")
is parsed into the SAME canonical key the brand database uses
("amoxicillin:500mg+clavulanic acid:125mg|tablet"), with salt names mapped onto the brand
database's vocabulary, so a Jan Aushadhi product is shown only for an exact salt+strength+form match.
Rows that cannot be parsed with confidence are written to data/build/ja_unparsed.csv, not guessed.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from build_d1 import clean_key, q  # noqa: E402

FORM_WORDS = [
    (r"dispersible tablets?|chewable tablets?|tablets?|tab\b", "tablet"),
    (r"capsules?|cap\b", "capsule"),
    (r"oral suspension|suspension|syrup|oral solution|solution|elixir|drops", "liquid"),
    (r"injection|infusion", "injection"),
    (r"cream|ointment|gel|lotion", "topical"),
]
RELEASE_WORDS = [
    (r"sustained[- ]release|\bsr\b|prolonged[- ]release|\bpr\b", "SR"),
    (r"extended[- ]release|\ber\b|\bxr\b", "XR"),
    (r"controlled[- ]release|\bcr\b", "CR"),
    (r"modified[- ]release|\bmr\b", "MR"),
]
SALT_SUFFIXES = (
    "hydrochloride", "hcl", "sodium", "potassium", "calcium", "magnesium", "besilate", "besylate",
    "maleate", "succinate", "tartrate", "mesylate", "mesilate", "fumarate", "citrate", "sulphate",
    "sulfate", "phosphate", "hyclate", "dihydrate", "monohydrate", "trihydrate", "bromide",
    "acetate", "valerate", "propionate", "dipropionate", "hydrobromide", "bitartrate", "trihydrate",
)
SYNONYMS = {
    "potassium clavulanate": "clavulanic acid",
    "clavulanate potassium": "clavulanic acid",
    "diluted potassium clavulanate": "clavulanic acid",
    "amoxycillin": "amoxicillin",
    "acetaminophen": "paracetamol",
    "vitamin c": "ascorbic acid",
    "levothyroxine sodium": "thyroxine",
    "levothyroxine": "thyroxine",
    "glyceryl trinitrate": "nitroglycerin",
    "salbutamol": "albuterol",
    "frusemide": "furosemide",
}
UNIT_TO_MG = {"g": 1000.0, "gm": 1000.0, "mg": 1.0, "mcg": 0.001, "µg": 0.001, "ug": 0.001}


def std_strength(num: str, unit: str) -> str:
    unit = unit.lower()
    if unit in ("iu",):
        return f"{num}IU"
    if unit in ("%", "w/v", "w/w"):
        return f"{num}%"
    if unit == "ml":
        return f"{num}ml"
    v = round(float(num) * UNIT_TO_MG.get(unit, 1.0), 6)
    return (str(int(v)) if v == int(v) else repr(v)) + "mg"


class Vocab:
    """Salt names as they appear in the brand database's canonical keys."""

    def __init__(self, medicines_db: str | None):
        self.names: set[str] = set()
        self.keys: set[str] = set()
        if medicines_db:
            con = sqlite3.connect(medicines_db)
            for (k,) in con.execute("SELECT DISTINCT canonical_key FROM medicines"):
                k = clean_key(k)
                if not k:
                    continue
                self.keys.add(k)
                for part in k.split("|")[0].split("+"):
                    self.names.add(part.split(":")[0])

    def map(self, name: str) -> str:
        n = re.sub(r"\s+", " ", name.lower()).strip(" ,.-")
        n = SYNONYMS.get(n, n)
        if not self.names or n in self.names:
            return n
        words = n.split()
        base = " ".join(w for w in words if w not in SALT_SUFFIXES)
        base = SYNONYMS.get(base, base)
        if base in self.names:
            return base
        for cand in (f"{base} hydrochloride", f"{base} sodium", f"{base} potassium", f"{base} calcium"):
            if cand in self.names:
                return cand
        return base or n


def parse_generic(name: str, vocab: Vocab) -> tuple[str | None, str]:
    """PMBJP generic name -> (canonical key or None, reason)."""
    s = re.sub(r"\s+", " ", name).strip()
    low = s.lower()
    form = None
    form_at = len(low)
    for pat, f in FORM_WORDS:
        m = re.search(pat, low)
        if m and m.start() < form_at:
            form, form_at = f, m.start()
    if not form:
        return None, "no dosage form"
    release = None
    for pat, r in RELEASE_WORDS:
        if re.search(pat, low):
            release = r
            break
    salt_text = s[:form_at]
    salt_text = re.sub(r"\((?:sr|er|xr|cr|mr|pr)\)", " ", salt_text, flags=re.I)
    salt_text = re.sub(r"\b(sustained|prolonged|extended|controlled|modified)[- ]release\b", " ", salt_text, flags=re.I)
    salt_text = re.sub(r"\b(gastro[- ]resistant|enteric[- ]coated|film[- ]coated|uncoated|orally disintegrating|dispersible|chewable)\b", " ", salt_text, flags=re.I)
    salts = [x.strip() for x in re.split(r"\s*(?:,|&|\+|\band\b|\bwith\b)\s*", salt_text, flags=re.I) if x.strip()]
    strengths = re.findall(r"(\d+(?:\.\d+)?)\s*(mg|mcg|µg|ug|gm|g|iu|%|ml)\b", s[form_at:], flags=re.I)
    if not salts or not strengths:
        return None, "no salts or strengths"
    # "500 mg + 125 mg" / "1mg/500mg": the k-th strength belongs to the k-th salt.
    if len(strengths) < len(salts):
        return None, f"{len(salts)} salts but {len(strengths)} strengths"
    strengths = strengths[: len(salts)]
    pairs = sorted((vocab.map(n), std_strength(v, u)) for n, (v, u) in zip(salts, strengths))
    key = "+".join(f"{n}:{st}" for n, st in pairs) + f"|{form}" + (f"|{release}" if release else "")
    if vocab.keys and key not in vocab.keys:
        return key, "no branded equivalent in database"
    return key, "ok"


def units_in(unit_size: str, form: str) -> float | None:
    s = (unit_size or "").lower()
    m = re.search(r"(\d+(?:\.\d+)?)\s*(?:'s|s\b|tab|cap|x|nos|ml)", s) or re.search(r"(\d+(?:\.\d+)?)", s)
    if not m:
        return None
    v = float(m.group(1))
    return v if v > 0 else None


def read_table(path: Path) -> list[dict]:
    ext = path.suffix.lower()
    if ext == ".json":
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            for k in ("data", "responseBody", "content", "result", "rows", "list"):
                if k in data:
                    data = data[k]
                    break
            if isinstance(data, dict):
                for k in ("content", "list", "data", "rows"):
                    if k in data:
                        data = data[k]
                        break
        return list(data)
    if ext == ".csv":
        with path.open(encoding="utf-8-sig", newline="") as f:
            return list(csv.DictReader(f))
    if ext in (".xlsx", ".xls"):
        import pandas as pd  # noqa: PLC0415

        return pd.read_excel(path).fillna("").to_dict("records")
    if ext == ".pdf":
        import pdfplumber  # noqa: PLC0415

        rows: list[dict] = []
        header = None
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                for table in page.extract_tables():
                    for r in table:
                        cells = [(c or "").replace("\n", " ").strip() for c in r]
                        if header is None or any("generic" in c.lower() for c in cells):
                            if any("generic" in c.lower() or "kendra" in c.lower() for c in cells):
                                header = cells
                                continue
                        if header and len(cells) == len(header):
                            rows.append(dict(zip(header, cells)))
        return rows
    raise SystemExit(f"unsupported file type: {path}")


def pick(row: dict, *names: str) -> str:
    norm = {re.sub(r"[^a-z]", "", str(k).lower()): v for k, v in row.items()}
    for n in names:
        v = norm.get(re.sub(r"[^a-z]", "", n.lower()))
        if v not in (None, ""):
            return str(v).strip()
    return ""


def build_products(path: Path, vocab: Vocab, out: Path) -> dict:
    rows = read_table(path)
    sql, unparsed, stats = [], [], {"rows": len(rows), "ok": 0, "no_equivalent": 0, "unparsed": 0}
    for r in rows:
        code = pick(r, "drugCode", "drug_code", "Drug Code", "productCode", "code")
        name = pick(r, "genericName", "generic_name", "Generic Name", "productName", "drugName", "Name of the Product", "name")
        unit = pick(r, "unitSize", "unit_size", "Unit Size", "packSize", "Pack Size", "unit")
        mrp = pick(r, "mrp", "MRP", "MRP (Rs.)", "mrpRs", "price")
        group = pick(r, "groupName", "group_name", "Group Name", "therapeuticGroup", "category")
        if not name or not mrp:
            continue
        try:
            mrp_v = float(re.sub(r"[^\d.]", "", mrp))
        except ValueError:
            continue
        key, reason = parse_generic(name, vocab)
        if key is None:
            stats["unparsed"] += 1
            unparsed.append([code, name, unit, mrp, reason])
            continue
        stats["ok" if reason == "ok" else "no_equivalent"] += 1
        n_units = units_in(unit, key.split("|")[1])
        unit_price = round(mrp_v / n_units, 4) if n_units else None
        sql.append(
            "INSERT OR REPLACE INTO ja_products (drug_code, generic_name, unit_size, mrp, group_name, ckey, units, unit_price) VALUES "
            f"({q(code or name)}, {q(name)}, {q(unit)}, {mrp_v!r}, {q(group or None)}, {q(key)}, {q(n_units)}, {q(unit_price)});"
        )
    (out / "ja.sql").write_text("DELETE FROM ja_products;\n" + "\n".join(sql) + "\n", encoding="utf-8")
    with (out / "ja_unparsed.csv").open("w", encoding="utf-8", newline="") as f:
        csv.writer(f).writerows([["drug_code", "generic_name", "unit_size", "mrp", "reason"], *unparsed])
    return stats


def build_kendras(path: Path, out: Path) -> dict:
    rows = read_table(path)
    sql = []
    for r in rows:
        code = pick(r, "kendraCode", "storeCode", "Kendra Code", "code", "applicationId", "id")
        name = pick(r, "kendraName", "storeName", "Kendra Name", "name", "nameOfKendra")
        addr = pick(r, "address", "kendraAddress", "Address", "fullAddress")
        pin = re.sub(r"\D", "", pick(r, "pinCode", "pincode", "Pin Code", "PIN", "pin"))[:6]
        district = pick(r, "districtName", "district", "District")
        state = pick(r, "stateName", "state", "State")
        lat = pick(r, "latitude", "lat")
        lng = pick(r, "longitude", "lng", "long")
        phone = pick(r, "kendraContactNo", "contactNo", "phone", "mobile", "Contact No")
        if not (name or addr) or len(pin) != 6:
            continue
        try:
            latv, lngv = float(lat), float(lng)
            if not (6 < latv < 38 and 68 < lngv < 98):
                latv = lngv = None
        except ValueError:
            latv = lngv = None
        sql.append(
            "INSERT OR REPLACE INTO kendras (code, name, address, district, state, pin, lat, lng, phone) VALUES "
            f"({q(code or f'{pin}-{len(sql)}')}, {q(name or 'Jan Aushadhi Kendra')}, {q(addr)}, {q(district)}, {q(state)}, {q(pin)}, {q(latv)}, {q(lngv)}, {q(phone or None)});"
        )
    (out / "kendras.sql").write_text("DELETE FROM kendras;\n" + "\n".join(sql) + "\n", encoding="utf-8")
    return {"rows": len(rows), "loaded": len(sql)}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--products")
    ap.add_argument("--kendras")
    ap.add_argument("--list-date", required=True, help="date the official lists were downloaded (YYYY-MM-DD)")
    ap.add_argument("--medicines-db", help="SameSalt samesalt.db, to map salt names onto its vocabulary")
    ap.add_argument("--out", default="data/build")
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    meta = []
    if args.products:
        stats = build_products(Path(args.products), Vocab(args.medicines_db), out)
        print("products:", stats)
        meta += [("ja_loaded_at", args.list_date), ("ja_list_date", args.list_date), ("ja_stats", json.dumps(stats))]
    if args.kendras:
        stats = build_kendras(Path(args.kendras), out)
        print("kendras:", stats)
        meta += [("kendras_loaded_at", args.list_date), ("kendra_list_date", args.list_date), ("kendra_stats", json.dumps(stats))]
    (out / "meta-ja.sql").write_text(
        "\n".join(f"INSERT OR REPLACE INTO meta (key, value) VALUES ({q(k)}, {q(v)});" for k, v in meta) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
