"""Parser tests for PMBJP generic names (name FORMATS as used in the PMBJP product list).
Run: python -m pytest test/test_build_ja.py  (or: python test/test_build_ja.py)
Uses ../samesalt/assets/samesalt.db for the salt vocabulary when present."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "data"))
from build_ja import Vocab, parse_generic, units_in  # noqa: E402

DB = Path(__file__).parent.parent.parent / "samesalt" / "assets" / "samesalt.db"
V = Vocab(str(DB) if DB.exists() else None)

CASES = [
    ("Paracetamol Tablets IP 650 mg", "paracetamol:650mg|tablet"),
    ("Paracetamol Tablets IP 500mg", "paracetamol:500mg|tablet"),
    ("Amoxycillin and Potassium Clavulanate Tablets IP 500 mg + 125 mg", "amoxicillin:500mg+clavulanic acid:125mg|tablet"),
    ("Telmisartan Tablets IP 40 mg", "telmisartan:40mg|tablet"),
    ("Metformin Hydrochloride Sustained Release Tablets IP 500 mg", "metformin:500mg|tablet|SR"),
    ("Metformin Hydrochloride Tablets IP 500 mg", "metformin:500mg|tablet"),
    ("Pantoprazole Gastro-resistant Tablets IP 40 mg", "pantoprazole:40mg|tablet"),
    ("Atorvastatin Tablets IP 10 mg", "atorvastatin:10mg|tablet"),
    ("Amlodipine Tablets IP 5 mg", "amlodipine:5mg|tablet"),
    ("Paracetamol Tablets IP 0.65 g", "paracetamol:650mg|tablet"),
    ("Aceclofenac 100mg and Paracetamol 325mg Tablets", "aceclofenac:100mg+paracetamol:325mg|tablet"),
    ("Amoxycillin 500mg and Potassium Clavulanate 125mg Tablets IP", "amoxicillin:500mg+clavulanic acid:125mg|tablet"),
    ("Ibuprofen 400mg and Paracetamol 325mg Tablets IP", "ibuprofen:400mg+paracetamol:325mg|tablet"),
    ("Mupirocin Ointment IP 2 % w/w", "mupirocin:2% w/w|topical"),
    ("Clotrimazole 1% w/v and Lignocaine Hydrochloride 2% w/v Ear Drops", "clotrimazole:1% w/v+lidocaine:2% w/v|drops"),
]


def test_parse_generic():
    bad = []
    for name, want in CASES:
        got, reason = parse_generic(name, V)
        if got != want:
            bad.append((name, want, got, reason))
    assert not bad, bad


def test_units():
    assert units_in("10's", "tablet") == 10
    assert units_in("15 Tablets", "tablet") == 15
    assert units_in("100 ml", "liquid") == 100


if __name__ == "__main__":
    test_parse_generic()
    test_units()
    print("ok")
