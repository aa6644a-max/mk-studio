"""정지본 PDF 내보내기: python3 tools/export-pdf.py  (playwright + pillow 필요)"""
import io, pathlib, sys
from playwright.sync_api import sync_playwright
from PIL import Image
root = pathlib.Path(__file__).resolve().parent.parent
out = root / 'fallback' / 'presentation-static.pdf'
shots = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium' if pathlib.Path('/opt/pw-browsers/chromium').is_file() else None)
    pg = b.new_page(viewport={'width': 1920, 'height': 1080})
    for i in range(1, 9):
        pg.goto(f'{root.as_uri()}/index.html?static&clean&scene={i}')
        pg.wait_for_timeout(300)
        shots.append(Image.open(io.BytesIO(pg.screenshot())).convert('RGB'))
        if '--png' in sys.argv: shots[-1].save(f'/tmp/scene{i}.png')
    b.close()
shots[0].save(out, save_all=True, append_images=shots[1:], resolution=144)
print('wrote', out)
