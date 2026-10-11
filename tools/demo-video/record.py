"""Record the live app on a phone-sized viewport. Writes phone.webm + steps.json (step start times).
All traffic is flagged as test (?test=1) so it never counts on /impact."""
import json, re, sys, time, shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).parent / 'out'
OUT.mkdir(exist_ok=True)
U = 'https://samesalt-agent.samesalt-worker.workers.dev'
STRIP = sys.argv[1] if len(sys.argv) > 1 else str(Path(__file__).parent.parent.parent / 'evals' / 'images' / 'dolo650.jpg')
steps = []
t0 = None


def mark(key):
    steps.append({'key': key, 't': round(time.time() - t0, 2)})


with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2,
                        record_video_dir=str(OUT / 'raw'), record_video_size={'width': 390, 'height': 844}, locale='en-IN')
    p = ctx.new_page()
    t0 = time.time()
    p.goto(U + '/?test=1&lang=en', wait_until='networkidle')
    mark('home'); time.sleep(4)
    p.fill('#pinInput', '580001'); time.sleep(1.2)
    mark('scan')
    p.set_input_files('#photo', STRIP)
    p.wait_for_selector('#result:not([hidden]) .med-name', timeout=60000)
    mark('result'); time.sleep(6)
    mark('list'); p.mouse.wheel(0, 560); time.sleep(6)
    mark('ja'); p.locator('.card', has_text=re.compile('Jan Aushadhi generic', re.I)).first.scroll_into_view_if_needed(); p.mouse.wheel(0, 120); time.sleep(7)
    mark('safety'); p.locator('.safety').last.scroll_into_view_if_needed(); time.sleep(5)
    p.click('#phBtn'); mark('pharmacist'); time.sleep(4)
    p.keyboard.press('Escape'); time.sleep(0.8)
    p.click('details.steps summary'); p.locator('details.steps').scroll_into_view_if_needed(); mark('steps'); time.sleep(6)
    p.evaluate('window.scrollTo({top:0, behavior:"smooth"})'); time.sleep(1.2)
    p.click('#langs button[lang=kn]')
    p.wait_for_function("document.querySelector('#answerText') && /ಇದೆ/.test(document.querySelector('#answerText').innerText)", timeout=30000)
    mark('kannada'); time.sleep(6)
    p.mouse.wheel(0, 900); time.sleep(4)
    p.evaluate('window.scrollTo({top:0})'); time.sleep(0.5)
    p.click('#langs button[lang=hi]')
    p.wait_for_function("document.querySelector('#answerText') && /है/.test(document.querySelector('#answerText').innerText)", timeout=30000)
    mark('hindi'); time.sleep(4)
    p.goto(U + '/impact', wait_until='networkidle'); mark('impact'); time.sleep(4)
    p.mouse.wheel(0, 800); time.sleep(4)
    p.goto(U + '/volunteer', wait_until='networkidle'); mark('volunteer'); time.sleep(5)
    mark('end')
    vid = p.video.path()
    ctx.close(); b.close()
shutil.copy(vid, OUT / 'phone.webm')
json.dump(steps, open(OUT / 'steps.json', 'w'), indent=1)
print(json.dumps(steps))
