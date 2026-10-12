"""Compose the demo video from the recording made by record.py.

Title cards and captions are laid out in HTML and rendered by Chromium (so Kannada and
Devanagari are shaped correctly), then assembled with ffmpeg: calm cross-fades, the phone
recording in a device frame, and one caption per step, faded in and out.

    python tools/demo-video/compose.py          -> out/samesalt-demo.mp4

Every number on screen is real: figures from the live app, the official Jan Aushadhi lists
(loaded 11/12 Oct 2026) and the cited sources. No usage or impact numbers are claimed.
"""
import base64, json, subprocess, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
HERE = Path(__file__).parent
OUT = HERE / 'out'
TMP = OUT / 'tmp'
TMP.mkdir(parents=True, exist_ok=True)
AF = HERE.parent.parent / 'docs' / 'agentfoundry'
W, H = 1920, 1080
FPS = 30
XF = 0.6  # cross-fade seconds

# Phone screen geometry on the 1920x1080 canvas (recording is 390x844 CSS px at 2x).
SH = 960
SW = round(SH * 390 / 844 / 2) * 2
SX, SY = 300, (H - SH) // 2
BZ = 13  # bezel

FONTS = '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Kannada:wght@500;600&family=Noto+Sans+Devanagari:wght@500;600&display=block" rel="stylesheet">'
BASE_CSS = """
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1920px;height:1080px}
body{font-family:Inter,-apple-system,'Segoe UI',sans-serif;color:#1d1d1f;-webkit-font-smoothing:antialiased;letter-spacing:-0.022em}
.bg{background:#f5f5f7}
.green{color:#0a7a4b}
.muted{color:#6e6e73}
.faint{color:#86868b}
.kn,.hi{letter-spacing:0}
.kn{font-family:'Noto Sans Kannada',Inter,sans-serif}
.hi{font-family:'Noto Sans Devanagari',Inter,sans-serif}
.mark{display:inline-flex;align-items:center;gap:14px;font-weight:600;font-size:34px;letter-spacing:-0.02em}
.mark svg{color:#0a7a4b}
"""
LOGO = '<svg width="40" height="40" viewBox="0 0 32 32"><rect x="3" y="9" width="26" height="14" rx="7" fill="currentColor" opacity=".16"/><rect x="3" y="9" width="13" height="14" rx="7" fill="currentColor"/></svg>'


def page(body, css='', transparent=False):
    return f"<!doctype html><html><head><meta charset='utf-8'>{FONTS}<style>{BASE_CSS}{css}</style></head><body class='{'' if transparent else 'bg'}'>{body}</body></html>"


# ── Cards ──────────────────────────────────────────────────────────────────
CARD_TITLE = page(f"""
<div class="c">
  <div class="mark">{LOGO}<span>SameSalt</span></div>
  <h1>Same medicine.<br>Lower price.</h1>
  <p class="muted">Snap a medicine strip. See every brand with exactly the same salt and strength, the government Jan Aushadhi price, and the nearest Kendra — in Kannada, Hindi or English.</p>
  <p class="faint small">Code for a Billion 2026 · Health</p>
</div>""", """
.c{height:1080px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 260px}
h1{font-size:132px;line-height:1.02;letter-spacing:-0.045em;font-weight:700;margin:44px 0 40px}
p{font-size:36px;line-height:1.42;max-width:1180px}
.small{font-size:24px;margin-top:56px;letter-spacing:0}
""")

CARD_PROBLEM = page("""
<div class="c">
  <h2>The same medicine is sold at very different prices.<br><span class="muted">Patients pay for it themselves.</span></h2>
  <div class="cols">
    <div><b>39.4%</b><p>of India's health spending is paid out of pocket by families.</p><s>National Health Accounts 2021-22 (PIB, Oct 2024)</s></div>
    <div><b>3.8 crore</b><p>Indians were pushed into poverty in one year by spending on medicines alone.</p><s>Selvaraj et al., BMJ Open 2018 (2011-12 data)</s></div>
    <div><b>522 brands</b><p>of paracetamol 650 mg tablets, from ₹0.33 to ₹23.80 a tablet. Nobody at the counter says so.</p><s>A-Z Medicine Dataset of India, Nov 2022</s></div>
  </div>
</div>""", """
.c{height:1080px;display:flex;flex-direction:column;justify-content:center;padding:0 160px}
h2{font-size:64px;line-height:1.12;letter-spacing:-0.035em;font-weight:700;margin-bottom:90px}
.cols{display:grid;grid-template-columns:repeat(3,1fr);gap:56px}
.cols div{background:#fff;border-radius:32px;padding:44px 40px;box-shadow:0 2px 4px rgba(0,0,0,.03),0 12px 40px rgba(0,0,0,.05)}
b{display:block;font-size:76px;letter-spacing:-0.04em;font-weight:700;color:#0a7a4b;line-height:1}
.cols p{font-size:30px;line-height:1.38;margin:24px 0 28px}
s{text-decoration:none;font-size:20px;color:#86868b;letter-spacing:0}
""")


def af_card():
    shots = [('03-smartcode-kannada-review.png', 'SMART-Code reviewed every Kannada and Hindi string'),
             ('05-eval-understand-text-12of12.png', 'Prompt evals in AF: 12 of 12 pass'),
             ('06-runs-production-traces.png', 'Every production run recorded'),
             ('07-replay-found-composition-bug.png', 'Replay exposed a parsing bug, now fixed')]
    tiles = ''.join(
        f"<figure><img src='data:image/png;base64,{base64.b64encode((AF / f).read_bytes()).decode()}'><figcaption>{c}</figcaption></figure>"
        for f, c in shots)
    return page(f"""
<div class="c">
  <h2>Built in AgentFoundry.</h2>
  <p class="muted lead">Prompts, evals, run traces and replay — in the official IDE.</p>
  <div class="g">{tiles}</div>
</div>""", """
.c{height:1080px;padding:84px 160px 0}
h2{font-size:64px;letter-spacing:-0.035em;font-weight:700}
.lead{font-size:30px;margin:12px 0 44px}
.g{display:grid;grid-template-columns:1fr 1fr;gap:34px 48px}
figure{margin:0}
img{width:100%;height:306px;object-fit:cover;object-position:top left;border-radius:20px;box-shadow:0 2px 4px rgba(0,0,0,.04),0 12px 40px rgba(0,0,0,.08);display:block;background:#fff}
figcaption{font-size:24px;margin-top:14px;letter-spacing:-0.01em}
""")


CARD_OUTRO = page(f"""
<div class="c">
  <div class="mark">{LOGO}<span>SameSalt</span></div>
  <h2>Open source. ₹0 to run.</h2>
  <ul>
    <li><span class="muted">Try it</span><b>samesalt-agent.samesalt-worker.workers.dev</b></li>
    <li><span class="muted">Code</span><b>github.com/darshanrajagoli/samesalt-agent</b></li>
    <li><span class="muted">Tested</span><b>29 unit tests · 23 of 23 end-to-end evals</b><i>on synthetic strip photos; real-world accuracy is measured in the pilot</i></li>
    <li><span class="muted">Pilot</span><b>Uttara Karnataka Sneha Loka (UKSL), North Karnataka</b><i>starting late October 2026 · disclosure: the builder's father is a UKSL trustee</i></li>
  </ul>
  <p class="faint">Information only, not medical advice. Always check with your doctor or pharmacist before switching.</p>
</div>""", """
.c{height:1080px;display:flex;flex-direction:column;justify-content:center;padding:0 200px}
h2{font-size:88px;letter-spacing:-0.045em;font-weight:700;margin:30px 0 56px;line-height:1}
ul{list-style:none}
li{display:grid;grid-template-columns:170px 1fr;column-gap:24px;padding:20px 0;border-top:1px solid rgba(0,0,0,.08);font-size:32px;align-items:baseline}
li:first-child{border-top:0}
li b{font-weight:600;letter-spacing:-0.02em}
li i{grid-column:2;font-style:normal;color:#6e6e73;font-size:24px;letter-spacing:0;margin-top:6px}
p{font-size:22px;margin-top:56px;letter-spacing:0}
""")

# ── Phone segment layers ───────────────────────────────────────────────────
PHONE_BG = page(f"""
<div class="dev"></div>
<div class="url"><span class="faint">samesalt-agent.samesalt-worker.workers.dev</span></div>""", f"""
.dev{{position:absolute;left:{SX - BZ}px;top:{SY - BZ}px;width:{SW + 2 * BZ}px;height:{SH + 2 * BZ}px;border-radius:64px;background:#1d1d1f;
  box-shadow:0 2px 6px rgba(0,0,0,.08),0 30px 80px rgba(0,0,0,.18)}}
.url{{position:absolute;left:880px;bottom:64px;font-size:22px;letter-spacing:0}}
""")
PHONE_FRAME = page(f"""<div class="ring"></div><div class="cam"></div>""", f"""
.ring{{position:absolute;left:{SX - BZ}px;top:{SY - BZ}px;width:{SW + 2 * BZ}px;height:{SH + 2 * BZ}px;border-radius:64px;border:{BZ}px solid #1d1d1f}}
.cam{{position:absolute;left:{SX + SW // 2 - 9}px;top:{SY - BZ + 3}px;width:18px;height:7px;border-radius:4px;background:#2c2c2e}}
""", transparent=True)

CAPTION_CSS = """
.cap{position:absolute;left:880px;top:0;width:860px;height:1080px;display:flex;flex-direction:column;justify-content:center}
.n{font-size:22px;font-weight:600;color:#0a7a4b;letter-spacing:0;margin-bottom:18px}
h3{font-size:64px;line-height:1.08;letter-spacing:-0.038em;font-weight:700}
.b{font-size:32px;line-height:1.42;color:#6e6e73;margin-top:26px;letter-spacing:-0.012em}
.x{font-size:40px;line-height:1.5;color:#0a7a4b;margin-top:26px;font-weight:600}
.note{font-size:22px;color:#86868b;margin-top:22px;letter-spacing:0}
"""

# step key -> (chapter, title, body, native-script line, note)
CAPS = {
    'home': ('Check', 'Open it on any phone.', 'A web page, nothing to install. English, Kannada or Hindi.', None, None),
    'scan': ('Check', 'Snap the strip.', 'A vision model on Cloudflare Workers AI reads the brand, salt and strength. The photo is never stored.', None, None),
    'result': ('Compare', 'Same salt. Same strength.<br>Lower price.', 'Dolo 650 is paracetamol 650 mg. The same composition sells for ₹0.33 a tablet instead of ₹2.28: up to ₹29.31 saved on one pack.', None, 'Brand prices: printed MRPs, November 2022 dataset.'),
    'answer': ('Compare', 'A plain answer.', 'Composed from verified facts by a template, not written by a model, so no price or safety line can be invented.', None, None),
    'list': ('Compare', '522 exact equivalents.', 'Same salts, strengths, form and release type, cheapest first. 650 mg never matches 500 mg; SR never matches plain.', None, None),
    'ja': ('Jan Aushadhi', 'The government generic.', 'Paracetamol Tablets IP 650 mg: ₹15.47 for 15, the official PMBJP MRP, at any Jan Aushadhi Kendra.', None, 'Official PMBJP product list, downloaded 11 Oct 2026.'),
    'kendra': ('Jan Aushadhi', 'The nearest Kendra.', 'From the PIN code (here 580020, Hubballi), out of 19,986 Kendras in the official list.', None, 'Official Kendra list, downloaded 12 Oct 2026.'),
    'pharmacist': ('Act', 'Show it at the counter.', 'The exact composition to ask for, in large type.', None, None),
    'steps': ('Act', 'An agent you can audit.', 'read_strip → identify_medicine → find_same_salt → jan_aushadhi_match → nearest_kendra → compose_answer. Every step is shown.', None, None),
    'kannada': ('Languages', 'Answers in Kannada.', 'The whole screen and the answer switch language, for patients who cannot read the English on the strip.', "<span class='kn'>ಅದೇ ಔಷಧಿ. ಕಡಿಮೆ ಬೆಲೆ.</span>", None),
    'hindi': ('Languages', '…and in Hindi.', 'The same verified prices and the same safety line in every language. Listen reads the answer aloud with the phone’s own voice.', "<span class='hi'>वही दवा। कम दाम।</span>", None),
    'nti': ('Safety', 'Safe by design.', 'Thyroid, blood-thinner, epilepsy and transplant medicines get a warning and no cheaper option. Every answer says: check with your doctor or pharmacist first. Never dosage advice.', None, None),
    'volunteer': ('Reach', 'Made for volunteers.', 'A QR page and a one-page guide in English and Kannada for NGO and ASHA volunteers.', None, None),
    'volunteer-on': ('Reach', 'Volunteer mode.', 'Lookups made with a volunteer are counted separately. First pilot: Uttara Karnataka Sneha Loka (UKSL), North Karnataka, starting late October.', None, 'Disclosure: the builder’s father is a trustee of UKSL.'),
    'impact': ('Proof', 'Proof, not promises.', 'A public impact page counts real lookups only. It reads zero today: the pilot has not started, and test traffic is excluded.', None, None),
    'data': ('Proof', 'Official data, loaded.', '1,914 Jan Aushadhi medicines and 19,986 Kendras from janaushadhi.gov.in, next to 2,46,068 brand prices.', None, None),
}


def caption_html(chapter, title, body, native, note):
    return page(f"""<div class="cap"><div class="n">{chapter}</div><h3>{title}</h3><p class="b">{body}</p>
      {f'<p class="x">{native}</p>' if native else ''}{f'<p class="note">{note}</p>' if note else ''}</div>""", CAPTION_CSS, transparent=True)


def render(items):
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        p = b.new_page(viewport={'width': W, 'height': H})
        for path, html, transparent in items:
            p.set_content(html, wait_until='networkidle')
            p.evaluate('document.fonts.ready')
            p.wait_for_timeout(150)
            p.screenshot(path=str(path), omit_background=transparent)
        b.close()


def run(cmd):
    print(' '.join(str(c) for c in cmd)[:160], flush=True)
    subprocess.run([str(c) for c in cmd], check=True)


def still(png, dur, out):
    run(['ffmpeg', '-y', '-v', 'error', '-loop', '1', '-t', f'{dur:.2f}', '-i', png, '-vf', f'fps={FPS},format=yuv420p',
         '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-tune', 'stillimage', out])


def main():
    frames = json.load(open(OUT / 'frames.json'))
    steps = json.load(open(OUT / 'steps.json'))
    t0 = steps[0]['t'] - 0.6
    end = next(s['t'] for s in steps if s['key'] == 'end')
    dur = end - t0

    # 1. Recording -> constant-frame-rate phone clip (each screencast frame held until the next).
    lines = []
    fr = [f for f in frames if f['t'] < end]
    first = max(i for i, f in enumerate(fr) if f['t'] <= t0) if any(f['t'] <= t0 for f in fr) else 0
    fr = fr[first:]
    for i, f in enumerate(fr):
        start = max(f['t'], t0)
        nxt = fr[i + 1]['t'] if i + 1 < len(fr) else end
        lines.append(f"file '{(OUT / 'frames' / f['file']).as_posix()}'\nduration {max(0.001, nxt - start):.4f}\n")
    lines.append(f"file '{(OUT / 'frames' / fr[-1]['file']).as_posix()}'\n")
    (TMP / 'frames.txt').write_text(''.join(lines))
    run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', TMP / 'frames.txt', '-vf', f'fps={FPS},format=yuv420p',
         '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-t', f'{dur:.2f}', TMP / 'phone_raw.mp4'])

    # 2. Render cards, device layers and captions.
    items = [(TMP / 'c_title.png', CARD_TITLE, False), (TMP / 'c_problem.png', CARD_PROBLEM, False),
             (TMP / 'c_af.png', af_card(), False), (TMP / 'c_outro.png', CARD_OUTRO, False),
             (TMP / 'phone_bg.png', PHONE_BG, False), (TMP / 'phone_frame.png', PHONE_FRAME, True)]
    timed = [s for s in steps if s['key'] in CAPS]
    for s in timed:
        items.append((TMP / f'cap_{s["key"]}.png', caption_html(*CAPS[s['key']]), True))
    render(items)

    # 3. Phone segment: background, recording, device frame, captions with soft fades.
    inputs = ['-loop', '1', '-t', f'{dur:.2f}', '-i', TMP / 'phone_bg.png', '-i', TMP / 'phone_raw.mp4',
              '-loop', '1', '-t', f'{dur:.2f}', '-i', TMP / 'phone_frame.png']
    f = [f'[1:v]scale={SW}:{SH}:flags=lanczos,setsar=1[ph]', f'[0:v][ph]overlay={SX}:{SY}:shortest=1[a0]', '[a0][2:v]overlay=0:0:shortest=1[v0]']
    last = 'v0'
    # record.py marks a step after its smooth scroll (~0.9 s): bring those captions in as the scroll starts.
    lead = lambda k: 1.0 if k in ('answer', 'list', 'ja', 'kendra', 'steps', 'data') else 0.2
    for i, s in enumerate(timed):
        a = max(0.0, s['t'] - t0 - lead(s['key']))
        b = (timed[i + 1]['t'] - t0 - lead(timed[i + 1]['key']) - 0.15) if i + 1 < len(timed) else dur
        inputs += ['-loop', '1', '-t', f'{dur:.2f}', '-i', TMP / f'cap_{s["key"]}.png']
        k = 3 + i
        fo = max(a + 0.5, b - 0.35)
        f.append(f'[{k}:v]format=rgba,fade=t=in:st={a:.2f}:d=0.35:alpha=1,fade=t=out:st={fo:.2f}:d=0.3:alpha=1[c{i}]')
        f.append(f'[{last}][c{i}]overlay=0:0:shortest=1[v{i + 1}]')
        last = f'v{i + 1}'
    f.append(f'[{last}]fps={FPS},format=yuv420p[out]')
    run(['ffmpeg', '-y', '-v', 'error', *inputs, '-filter_complex', ';'.join(f), '-map', '[out]', '-c:v', 'libx264', '-preset', 'slow',
         '-crf', '16', '-r', FPS, TMP / 'phone.mp4'])

    # 4. Stills, then cross-fade everything together.
    segs = [(TMP / 'c_title.png', 6.0), (TMP / 'c_problem.png', 11.0), (TMP / 'phone.mp4', None), (TMP / 'c_af.png', 9.0), (TMP / 'c_outro.png', 11.0)]
    clips, lens = [], []
    for i, (src, d) in enumerate(segs):
        if d is None:
            clips.append(src)
            lens.append(float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(src)]).decode().strip()))
        else:
            out = TMP / f'seg{i}.mp4'
            still(src, d, out)
            clips.append(out)
            lens.append(d)
    inputs, f, off = [], [], 0.0
    for c in clips:
        inputs += ['-i', c]
    prev = '0:v'
    for i in range(1, len(clips)):
        off += lens[i - 1] - XF
        f.append(f'[{prev}][{i}:v]xfade=transition=fade:duration={XF}:offset={off:.2f}[x{i}]')
        prev = f'x{i}'
    total = sum(lens) - XF * (len(clips) - 1)
    f.append(f'[{prev}]format=yuv420p[out]')
    # Silent stereo track so every player treats it as a normal video.
    run(['ffmpeg', '-y', '-v', 'error', *inputs, '-f', 'lavfi', '-t', f'{total:.2f}', '-i', 'anullsrc=r=48000:cl=stereo',
         '-filter_complex', ';'.join(f), '-map', '[out]', '-map', f'{len(clips)}:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17',
         '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', '-movflags', '+faststart', OUT / 'samesalt-demo.mp4'])
    print(f'done {OUT / "samesalt-demo.mp4"} ({total:.1f} s)')


if __name__ == '__main__':
    main()
