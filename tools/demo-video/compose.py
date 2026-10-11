"""Compose the demo: title cards + phone recording with step captions + AgentFoundry + outro.
python compose.py [--ja-loaded]  -> out/samesalt-demo.mp4"""
import json, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = Path(__file__).parent
OUT = HERE / 'out'
W, H = 1920, 1080
BG = (247, 247, 249)
INK = (29, 29, 31)
MUTED = (110, 110, 115)
GREEN = (10, 122, 75)
F = 'C:/Windows/Fonts/'
INTER = None
for cand in ['segoeuib.ttf']:
    pass
BOLD = F + 'segoeuib.ttf'
REG = F + 'segoeui.ttf'
NIRMALA = F + 'Nirmala.ttc'
JA = '--ja-loaded' in sys.argv
AF = HERE.parent.parent / 'docs' / 'agentfoundry'


def font(path, size):
    return ImageFont.truetype(path, size)


def wrap(d, text, f, width):
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=f) <= width:
            cur = t
        else:
            lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines


def card(path, title, lines=(), sub=None, kicker=None):
    im = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(im)
    y = 250
    if kicker:
        d.text((160, y), kicker, font=font(BOLD, 34), fill=GREEN); y += 70
    for ln in wrap(d, title, font(BOLD, 84), 1600):
        d.text((160, y), ln, font=font(BOLD, 84), fill=INK); y += 100
    y += 30
    for ln in lines:
        for l2 in wrap(d, ln, font(REG, 40), 1600):
            d.text((160, y), l2, font=font(REG, 40), fill=INK); y += 56
        y += 16
    if sub:
        d.text((160, H - 140), sub, font=font(REG, 28), fill=MUTED)
    im.save(path)


def caption_panel(path, title, body, kn=None):
    """Right-hand caption area (1920x1080 transparent PNG, text on the right)."""
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    x, y, width = 880, 360, 900
    for ln in wrap(d, title, font(BOLD, 60), width):
        d.text((x, y), ln, font=font(BOLD, 60), fill=INK); y += 76
    y += 20
    for ln in wrap(d, body, font(REG, 36), width):
        d.text((x, y), ln, font=font(REG, 36), fill=MUTED); y += 50
    if kn:
        y += 20
        for ln in wrap(d, kn, font(NIRMALA, 36), width):
            d.text((x, y), ln, font=font(NIRMALA, 36), fill=GREEN); y += 54
    im.save(path)


CAPS = {
    'home': ('Open it on any phone', 'A web app, nothing to install. English, Kannada or Hindi.', None),
    'scan': ('Snap the strip', 'A vision model on Cloudflare Workers AI reads the brand, salt and strength. The photo is never stored.', None),
    'result': ('Same salt. Same strength.', 'Dolo 650 is paracetamol 650 mg. A brand with the identical composition costs ₹0.33 a tablet instead of ₹2.28: up to ₹29 saved on one pack.', None),
    'list': ('522 exact equivalents', 'Every brand with the same salts, strengths, form and release type, cheapest per tablet first. 650 mg never matches 500 mg; SR never matches plain.', None),
    'ja': ('Jan Aushadhi + nearest Kendra', 'The government generic with the same composition, its official MRP, and the nearest Jan Aushadhi Kendra from the PIN code.' if JA else
           'Next: the Jan Aushadhi generic, its official MRP and the nearest Kendra. The official lists are being loaded; until then the app says so instead of guessing.', None),
    'safety': ('Safe by design', 'Same salt, strength and form only. Every answer says: check with your doctor or pharmacist. Never dosage advice. Blood thinners, thyroid and epilepsy drugs get a warning, not a switch.', None),
    'pharmacist': ('Show it at the counter', 'A big, clear card with the exact composition to ask for.', None),
    'steps': ('An agent you can audit', 'read_strip → identify_medicine → find_same_salt → jan_aushadhi_match → nearest_kendra → compose_answer. Every step is shown.', None),
    'kannada': ('Answers in Kannada', 'Built for patients and volunteers in North Karnataka: the whole screen and the spoken answer switch language.', None),
    'hindi': ('…and Hindi', 'The answer is composed from verified facts, so the prices and the safety line are identical in every language.', None),
    'impact': ('Proof, not promises', 'A public impact page counts real lookups only: savings found, people who switched, languages, PIN areas. No names, phones or photos. Test traffic is excluded.', None),
    'volunteer': ('Volunteer mode', 'A QR page and a one-page guide in English and Kannada for NGO volunteers. Field pilot with UKSL, North Karnataka, from late October 2026.', None),
}


def run(cmd):
    print(' '.join(str(c) for c in cmd)[:200])
    subprocess.run(cmd, check=True)


def main():
    steps = json.load(open(OUT / 'steps.json'))
    # Playwright starts the video a little after the page is created: align marks to the video clock.
    dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(OUT / 'phone.webm')]).decode().strip())
    shift = steps[-1]['t'] - dur + 0.4
    for st in steps:
        st['t'] = max(0.0, round(st['t'] - shift, 2))
    tmp = OUT / 'tmp'; tmp.mkdir(exist_ok=True)
    # 1. Phone segment: background + phone frame + captions timed to steps.
    bg = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(bg)
    ph_h = 960; ph_w = round(390 * ph_h / 844)
    px, py = 300, (H - ph_h) // 2
    shadow = Image.new('L', (W, H), 0)
    ImageDraw.Draw(shadow).rounded_rectangle([px - 14, py - 6, px + ph_w + 14, py + ph_h + 26], 46, fill=90)
    bg.paste((200, 200, 205), mask=shadow.filter(ImageFilter.GaussianBlur(18)))
    d.rounded_rectangle([px - 14, py - 14, px + ph_w + 14, py + ph_h + 14], 44, fill=(20, 20, 22))
    d.text((880, 160), 'SameSalt', font=font(BOLD, 40), fill=GREEN)
    d.text((880, 1000), 'samesalt-agent.samesalt-worker.workers.dev', font=font(REG, 26), fill=MUTED)
    bg.save(tmp / 'phone_bg.png')
    end = next(s['t'] for s in steps if s['key'] == 'end')
    inputs, filters = ['-loop', '1', '-i', str(tmp / 'phone_bg.png'), '-i', str(OUT / 'phone.webm')], []
    filters.append(f'[1:v]scale={ph_w}:{ph_h}:flags=lanczos,format=yuv420p[ph]')
    filters.append(f'[0:v][ph]overlay={px}:{py}:shortest=1[v0]')
    last = 'v0'
    timed = [s for s in steps if s['key'] in CAPS]
    for i, s in enumerate(timed):
        a = max(0, s['t'] - 0.3)
        b = timed[i + 1]['t'] - 0.3 if i + 1 < len(timed) else end
        cp = tmp / f'cap_{s["key"]}.png'
        caption_panel(cp, *CAPS[s['key']])
        inputs += ['-i', str(cp)]
        idx = 2 + i
        filters.append(f"[{last}][{idx}:v]overlay=0:0:enable='between(t,{a:.2f},{b:.2f})'[v{i+1}]")
        last = f'v{i+1}'
    # Trim the slow page load before the first step.
    start = max(0, steps[0]['t'] - 1.0)
    filters.append(f"[{last}]trim=start={start:.2f}:end={end:.2f},setpts=PTS-STARTPTS,fps=30,format=yuv420p[out]")
    run(['ffmpeg', '-y', '-v', 'error', *inputs, '-filter_complex', ';'.join(filters), '-map', '[out]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-r', '30', str(tmp / 'phone.mp4')])

    # 2. Cards.
    card(tmp / 'c1.png', 'Same medicine. Lower price.', ['SameSalt reads a medicine strip and shows every brand with exactly the same salt and strength, the Jan Aushadhi generic, and the nearest Kendra — in Kannada, Hindi or English.'], kicker='SAMESALT · CODE FOR A BILLION 2026 · HEALTH')
    card(tmp / 'c2.png', 'Patients pay. Mostly for medicines.', [
        '39.4% of India\'s health spending is paid out of pocket (National Health Accounts 2021-22).',
        'Medicines alone pushed about 38 million Indians into poverty in one year (BMJ Open, 2018).',
        'Paracetamol 650 mg is sold under 522 brands, from ₹0.33 to ₹23.80 a tablet. Nobody at the counter says so.'], kicker='THE PROBLEM')
    # AgentFoundry card: montage of real screenshots.
    im = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(im)
    d.text((160, 90), 'BUILT IN AGENTFOUNDRY', font=font(BOLD, 34), fill=GREEN)
    d.text((160, 140), 'Prompts, evals, runs and replay — in the official IDE', font=font(BOLD, 56), fill=INK)
    shots = ['03-smartcode-kannada-review.png', '05-eval-understand-text-12of12.png', '06-runs-production-traces.png', '07-replay-found-composition-bug.png']
    labels = ['SMART-Code reviewed every Kannada & Hindi string', 'Prompt evals: 12/12', 'Every production run recorded', 'Replay exposed a parsing bug — fixed']
    for i, (s, lab) in enumerate(zip(shots, labels)):
        sh = Image.open(AF / s).convert('RGB'); sh.thumbnail((780, 420))
        x = 160 + (i % 2) * 820; y = 260 + (i // 2) * 400
        im.paste(sh, (x, y)); d.text((x, y + sh.height + 8), lab, font=font(REG, 28), fill=INK)
    im.save(tmp / 'c3.png')
    card(tmp / 'c4.png', 'Open source. ₹0 to run.', [
        'Live: samesalt-agent.samesalt-worker.workers.dev',
        'Impact: …workers.dev/impact   ·   Code: github.com/darshanrajagoli/samesalt-agent',
        'Tests 26/26 · end-to-end evals 23/23 (synthetic photos; real-world accuracy measured in the pilot).',
        'Pilot with Uttara Karnataka Sneha Loka (UKSL), North Karnataka, from late October 2026.'],
        sub='Information only, not medical advice. Always check with your doctor or pharmacist before switching.', kicker='SAMESALT')
    parts = []
    for name, dur in [('c1', 7), ('c2', 11)]:
        run(['ffmpeg', '-y', '-v', 'error', '-loop', '1', '-t', str(dur), '-i', str(tmp / f'{name}.png'), '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-crf', '20', str(tmp / f'{name}.mp4')])
        parts.append(tmp / f'{name}.mp4')
    parts.append(tmp / 'phone.mp4')
    for name, dur in [('c3', 10), ('c4', 10)]:
        run(['ffmpeg', '-y', '-v', 'error', '-loop', '1', '-t', str(dur), '-i', str(tmp / f'{name}.png'), '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-crf', '20', str(tmp / f'{name}.mp4')])
        parts.append(tmp / f'{name}.mp4')
    lst = tmp / 'list.txt'
    lst.write_text(''.join(f"file '{p.as_posix()}'\n" for p in parts))
    # Silent stereo track so players and YouTube treat it as a normal video.
    run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', str(lst), '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-shortest', '-c:v', 'libx264', '-crf', '20', '-c:a', 'aac', '-movflags', '+faststart', str(OUT / 'samesalt-demo.mp4')])
    print('done', OUT / 'samesalt-demo.mp4')


if __name__ == '__main__':
    main()
