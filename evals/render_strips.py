#!/usr/bin/env python3
"""Render SYNTHETIC medicine-strip photos for the eval set (no real packaging is reproduced:
plain text on a generic foil blister, with photo-like distortions). Output: evals/images/*.jpg

    python evals/render_strips.py
"""
import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).parent
OUT = HERE / "images"
FONT_B = "C:/Windows/Fonts/arialbd.ttf"
FONT_R = "C:/Windows/Fonts/arial.ttf"

# (file, brand line, generic line, contains line, maker, pack line, ink colour, distortion)
STRIPS = [
    ("pan40", "PAN-40", "Pantoprazole Gastro-resistant Tablets I.P.", "Pantoprazole Sodium I.P. eq. to Pantoprazole ..... 40 mg", "ALKEM LABORATORIES LTD.", "15 Tablets", (150, 20, 40), "clean"),
    ("augmentin625", "AUGMENTIN 625 DUO", "Amoxycillin & Potassium Clavulanate Tablets I.P.", "Amoxycillin I.P. 500 mg + Clavulanic Acid I.P. 125 mg", "GLAXOSMITHKLINE PHARMACEUTICALS", "10 Tablets", (20, 60, 140), "rotate"),
    ("telma40", "TELMA 40", "Telmisartan Tablets I.P. 40 mg", "Telmisartan I.P. ..... 40 mg", "GLENMARK PHARMACEUTICALS LTD.", "15 Tablets", (0, 110, 90), "clean"),
    ("glycomet500sr", "GLYCOMET-500 SR", "Metformin Hydrochloride Sustained Release Tablets I.P.", "Metformin Hydrochloride I.P. ..... 500 mg", "USV PRIVATE LIMITED", "20 Tablets", (30, 30, 120), "blur"),
    ("azithral500", "AZITHRAL 500", "Azithromycin Tablets I.P. 500 mg", "Azithromycin I.P. eq. to anhydrous Azithromycin ..... 500 mg", "ALEMBIC PHARMACEUTICALS LTD.", "5 Tablets", (160, 60, 0), "rotate"),
    ("ecosprin75", "ECOSPRIN 75", "Aspirin Gastro-resistant Tablets I.P. 75 mg", "Aspirin I.P. ..... 75 mg", "USV PRIVATE LIMITED", "14 Tablets", (180, 0, 0), "glare"),
    ("amlokind5", "AMLOKIND-5", "Amlodipine Tablets I.P. 5 mg", "Amlodipine Besilate I.P. eq. to Amlodipine ..... 5 mg", "MANKIND PHARMA LTD.", "15 Tablets", (90, 20, 110), "clean"),
    ("montair10", "MONTAIR 10", "Montelukast Sodium Tablets I.P.", "Montelukast Sodium I.P. eq. to Montelukast ..... 10 mg", "CIPLA LTD.", "15 Tablets", (0, 90, 160), "perspective"),
    ("thyronorm50", "THYRONORM 50 mcg", "Thyroxine Sodium Tablets I.P.", "Thyroxine Sodium I.P. ..... 50 mcg", "ABBOTT INDIA LTD.", "30 Tablets", (110, 40, 120), "clean"),
    ("crocinpr", "CROCIN PAIN RELIEF", "Paracetamol & Caffeine Tablets", "Paracetamol I.P. 650 mg + Caffeine I.P. 50 mg", "GSK CONSUMER HEALTHCARE", "15 Tablets", (200, 30, 30), "rotate"),
    ("atorva20", "ATORVA 20", "Atorvastatin Tablets I.P. 20 mg", "Atorvastatin Calcium I.P. eq. to Atorvastatin ..... 20 mg", "ZYDUS CADILA", "15 Tablets", (20, 100, 60), "lowcontrast"),
    ("ecosprinav", "ECOSPRIN-AV 75/20", "Aspirin & Atorvastatin Capsules", "Aspirin I.P. 75 mg (as gastro-resistant) + Atorvastatin I.P. 20 mg", "USV PRIVATE LIMITED", "15 Capsules", (150, 20, 20), "clean"),
    ("allegra120", "ALLEGRA 120 mg", "Fexofenadine Hydrochloride Tablets I.P.", "Fexofenadine Hydrochloride I.P. ..... 120 mg", "SANOFI INDIA LTD.", "10 Tablets", (60, 20, 140), "blur"),
    ("hard_blur_telma", "TELMA 40", "Telmisartan Tablets I.P. 40 mg", "Telmisartan I.P. ..... 40 mg", "GLENMARK PHARMACEUTICALS LTD.", "15 Tablets", (0, 110, 90), "heavyblur"),
    ("hard_crop_pan", "PAN-40", "Pantoprazole Gastro-resistant Tablets I.P.", "Pantoprazole Sodium I.P. eq. to Pantoprazole ..... 40 mg", "ALKEM LABORATORIES LTD.", "15 Tablets", (150, 20, 40), "crop"),
    ("hard_unknown_brand", "PYRETOL-650", "Paracetamol Tablets I.P. 650 mg", "Paracetamol I.P. ..... 650 mg", "EXAMPLE GENERICS PVT. LTD.", "10 Tablets", (60, 60, 60), "clean"),
    ("rosuvas10", "ROSUVAS 10", "Rosuvastatin Tablets I.P. 10 mg", "Rosuvastatin Calcium I.P. eq. to Rosuvastatin ..... 10 mg", "SUN PHARMA LABORATORIES", "15 Tablets", (0, 70, 130), "perspective"),
]


def foil(w, h, rnd):
    img = Image.new("RGB", (w, h))
    px = img.load()
    for x in range(w):
        for y in range(0, h, 1):
            v = 200 + int(28 * math.sin((x + y * 0.6) / 140.0)) + rnd.randint(-3, 3)
            px[x, y] = (v, v, min(255, v + 6))
    return img


def strip(spec, rnd):
    _, brand, generic, contains, maker, pack, ink, _ = spec
    W, H = 1500, 640
    s = foil(W, H, rnd)
    d = ImageDraw.Draw(s)
    for r in range(2):
        for c in range(5):
            cx, cy = 180 + c * 285, 190 + r * 270
            d.ellipse([cx - 80, cy - 52, cx + 80, cy + 52], outline=(168, 168, 172), width=4)
    fb = ImageFont.truetype(FONT_B, 76)
    fg = ImageFont.truetype(FONT_R, 30)
    fs = ImageFont.truetype(FONT_R, 25)
    fm = ImageFont.truetype(FONT_B, 25)
    d.text((70, 60), brand, font=fb, fill=ink)
    d.text((72, 150), generic, font=fg, fill=ink)
    d.text((520, 300), brand, font=fb, fill=ink)
    d.text((522, 390), generic, font=fg, fill=ink)
    d.text((70, 470), "Each tablet contains:" if "Capsule" not in pack else "Each capsule contains:", font=fs, fill=ink)
    d.text((70, 502), contains, font=fs, fill=ink)
    d.text((70, 540), f"Mfd. by: {maker}", font=fm, fill=ink)
    d.text((1080, 560), f"{pack} | Rx", font=fm, fill=(170, 20, 20))
    d.text((1080, 595), f"B.No. T{rnd.randint(1000, 9999)}  EXP. 0{rnd.randint(1, 9)}/2028", font=fs, fill=ink)
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, W - 1, H - 1], radius=36, fill=255)
    return s, mask


def photo(spec, rnd):
    s, mask = strip(spec, rnd)
    kind = spec[-1]
    bg = Image.new("RGB", (1700, 1000), (rnd.randint(190, 225), rnd.randint(180, 215), rnd.randint(160, 200)))
    angle = {"rotate": rnd.choice([-9, 8, -6]), "perspective": rnd.choice([-4, 4])}.get(kind, rnd.uniform(-3, 3))
    rs = s.rotate(angle, expand=True, resample=Image.BICUBIC, fillcolor=(0, 0, 0))
    rm = mask.rotate(angle, expand=True, resample=Image.BICUBIC)
    shadow = Image.new("RGB", rs.size, (90, 90, 90))
    ox, oy = (1700 - rs.width) // 2, (1000 - rs.height) // 2
    bg.paste(shadow, (ox + 14, oy + 18), rm.filter(ImageFilter.GaussianBlur(14)))
    bg.paste(rs, (ox, oy), rm)
    if kind == "perspective":
        w, h = bg.size
        bg = bg.transform(bg.size, Image.QUAD, (60, 0, 0, h, w, h - 40, w - 30, 30), resample=Image.BICUBIC)
    if kind == "blur":
        bg = bg.filter(ImageFilter.GaussianBlur(2.2))
    if kind == "glare":
        g = Image.new("L", bg.size, 0)
        ImageDraw.Draw(g).ellipse([700, 250, 1250, 650], fill=150)
        bg = Image.composite(Image.new("RGB", bg.size, (255, 255, 255)), bg, g.filter(ImageFilter.GaussianBlur(80)))
    if kind == "heavyblur":
        bg = bg.filter(ImageFilter.GaussianBlur(5))
    if kind == "crop":
        w, h = bg.size
        bg = bg.crop((int(w * 0.30), int(h * 0.30), int(w * 0.95), int(h * 0.80))).resize((1300, 800))
    if kind == "lowcontrast":
        bg = Image.blend(bg, Image.new("RGB", bg.size, (200, 200, 200)), 0.45)
    return bg


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    rnd = random.Random(7)
    for spec in STRIPS:
        photo(spec, rnd).save(OUT / f"{spec[0]}.jpg", quality=82)
        print("rendered", spec[0], spec[-1])


if __name__ == "__main__":
    main()
