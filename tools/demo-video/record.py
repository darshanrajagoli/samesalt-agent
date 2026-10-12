"""Record the live app on a phone-sized viewport for the demo video.

Captures crisp 2x frames with the Chrome DevTools screencast (not Playwright's low-bitrate
video), writes out/frames/*.jpg + out/frames.json (frame times) + out/steps.json (step marks).
All traffic is flagged as test (?test=1), so none of it counts on /impact.

    python tools/demo-video/record.py [strip.jpg]
"""
import base64, json, shutil, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
HERE = Path(__file__).parent
OUT = HERE / 'out'
FR = OUT / 'frames'
U = 'https://samesalt-agent.samesalt-worker.workers.dev'
STRIP = sys.argv[1] if len(sys.argv) > 1 else str(HERE.parent.parent / 'evals' / 'images' / 'dolo650.jpg')
PIN = '580020'  # Hubballi, North Karnataka

shutil.rmtree(FR, ignore_errors=True)
FR.mkdir(parents=True)
frames, steps = [], []


def mark(key):
    steps.append({'key': key, 't': time.time()})
    print('mark', key, flush=True)


with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--force-device-scale-factor=2'])  # 2x screencast frames
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, locale='en-IN', has_touch=True, is_mobile=True)
    p = ctx.new_page()
    wait = p.wait_for_timeout  # keeps screencast events flowing (time.sleep would block them)

    def smooth_to(selector, offset=-70):
        p.evaluate("([s, o]) => { const el = document.querySelector(s); const y = el.getBoundingClientRect().top + scrollY + o; scrollTo({ top: y, behavior: 'smooth' }); }", [selector, offset])
        wait(900)

    def smooth_top():
        p.evaluate("scrollTo({ top: 0, behavior: 'smooth' })")
        wait(800)

    # Warm the Worker so the first lookup is not a cold start; start from a clean phone.
    p.goto(U + '/?test=1&lang=en&volunteer=0', wait_until='networkidle')
    p.evaluate("fetch('/api/health')")
    p.evaluate("localStorage.removeItem('ss_pin')")
    p.goto(U + '/?lang=en', wait_until='networkidle')
    wait(600)

    cdp = ctx.new_cdp_session(p)

    def on_frame(ev):
        path = FR / f'{len(frames):05d}.jpg'
        path.write_bytes(base64.b64decode(ev['data']))
        frames.append({'file': path.name, 't': ev['metadata'].get('timestamp') or time.time()})
        try:
            cdp.send('Page.screencastFrameAck', {'sessionId': ev['sessionId']})
        except Exception:
            pass

    cdp.on('Page.screencastFrame', on_frame)
    cdp.send('Page.startScreencast', {'format': 'jpeg', 'quality': 92, 'maxWidth': 780, 'maxHeight': 1688, 'everyNthFrame': 1})
    wait(400)

    mark('home'); wait(3500)
    p.click('#pinInput'); p.type('#pinInput', PIN, delay=140); wait(900)
    p.evaluate('document.activeElement.blur()')
    mark('scan')
    p.set_input_files('#photo', STRIP)
    p.wait_for_selector('#result:not([hidden]) .med-name', timeout=60000)
    wait(500)
    mark('result'); wait(5500)
    smooth_to('.answer', -90); mark('answer'); wait(5000)
    smooth_to('.result .count', -110); mark('list'); wait(5500)
    smooth_to('.ja-price', -150); mark('ja'); wait(6500)
    smooth_to('.result .list .tag.grey', -150); mark('kendra'); wait(6500)
    smooth_to('#phBtn', -260); wait(600)
    p.click('#phBtn'); mark('pharmacist'); wait(4000)
    p.keyboard.press('Escape'); wait(600)
    p.click('details.steps summary'); smooth_to('details.steps', -200); mark('steps'); wait(5500)

    smooth_top()
    p.click('#langs button[lang=kn]')
    p.wait_for_function("/ಇದೆ/.test(document.querySelector('#answerText')?.innerText || '')", timeout=30000)
    wait(400); mark('kannada'); wait(4500)
    smooth_to('.answer', -90); wait(3500)
    smooth_top()
    p.click('#langs button[lang=hi]')
    p.wait_for_function("/है/.test(document.querySelector('#answerText')?.innerText || '')", timeout=30000)
    wait(400); mark('hindi'); wait(4500)

    # Narrow-therapeutic-index medicine: warning, no cheaper list.
    smooth_top()
    p.click('#langs button[lang=en]'); wait(2500)
    p.evaluate("document.querySelector('#againBtn').click()"); wait(700)
    p.click('#nameInput'); p.fill('#nameInput', ''); p.type('#nameInput', 'Thyronorm 50', delay=110); wait(400)
    p.press('#nameInput', 'Enter')
    p.wait_for_selector('#result:not([hidden]) .nti', timeout=60000)
    wait(400); mark('nti'); wait(5500)
    smooth_to('.answer', -40); wait(3500)

    p.goto(U + '/volunteer', wait_until='networkidle'); wait(300); mark('volunteer'); wait(4500)
    smooth_to('.stack .card', -80); wait(2500)
    smooth_top()
    p.click('.qr .primary'); p.wait_for_load_state('networkidle'); wait(300); mark('volunteer-on'); wait(4000)

    p.goto(U + '/impact', wait_until='networkidle'); wait(600); mark('impact'); wait(4500)
    smooth_to('#data', -140); mark('data'); wait(6000)
    mark('end'); wait(300)
    cdp.send('Page.stopScreencast')
    # Leave this browser profile as it was: volunteer mode off.
    p.goto(U + '/?volunteer=0', wait_until='domcontentloaded')
    ctx.close(); b.close()

json.dump(frames, open(OUT / 'frames.json', 'w'), indent=0)
json.dump(steps, open(OUT / 'steps.json', 'w'), indent=1)
print(len(frames), 'frames;', 'first', frames[0]['t'], 'mark0', steps[0]['t'])
