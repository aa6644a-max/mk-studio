"""index.html + src/* 를 presentation.html 한 파일로 합친다.
  python3 tools/build-single.py            # 사진 없이
  python3 tools/build-single.py --photos   # assets/photos 의 사진을 줄여서 파일 안에 내장 (pillow 권장)
"""
import sys, base64, io
import pathlib
r = pathlib.Path(__file__).resolve().parent.parent
h = (r / 'index.html').read_text()
h = h.replace('<link rel="stylesheet" href="src/styles.css">', '<style>\n' + (r / 'src/styles.css').read_text() + '\n</style>')
for f in ('content', 'scenes', 'motion'):
    h = h.replace(f'<script src="src/{f}.js"></script>', '<script>\n' + (r / f'src/{f}.js').read_text().replace('</script>', '<\\/script>') + '\n</script>')
h = h.replace('→ / Space 다음 · ← 이전 · F 전체화면 · N 노트 · P 발표자창 · H UI 숨김', '→ / Space 다음 · ← 이전 · F 전체화면 · N 노트 · H UI 숨김 · 터치: 탭·스와이프')
if '--photos' in sys.argv:
    try: from PIL import Image
    except ImportError: Image = None
    photos = {}
    for f in sorted((r / 'assets/photos').iterdir()):
        if f.suffix.lower() not in ('.jpg', '.jpeg', '.png', '.webp'): continue
        if Image:
            im = Image.open(f); im = im.convert('RGB')
            try:
                from PIL import ImageOps; im = ImageOps.exif_transpose(im)
            except Exception: pass
            im.thumbnail((1400, 1400)); buf = io.BytesIO(); im.save(buf, 'JPEG', quality=80); data, mime = buf.getvalue(), 'image/jpeg'
        else:
            data, mime = f.read_bytes(), 'image/' + ('jpeg' if f.suffix.lower() in ('.jpg', '.jpeg') else f.suffix.lower()[1:])
        photos[f.stem] = f'data:{mime};base64,' + base64.b64encode(data).decode()
    h = h.replace('<script>\n', '<script>window.PHOTOS = ' + __import__('json').dumps(photos) + ';</script>\n<script>\n', 1)
    print(f'embedded {len(photos)} photos')
(r / 'presentation.html').write_text(h)
print('wrote presentation.html', round((r / 'presentation.html').stat().st_size / 1e6, 2), 'MB')
