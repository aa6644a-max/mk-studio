"""index.html + src/* 를 presentation.html 한 파일로 합친다: python3 tools/build-single.py"""
import pathlib
r = pathlib.Path(__file__).resolve().parent.parent
h = (r / 'index.html').read_text()
h = h.replace('<link rel="stylesheet" href="src/styles.css">', '<style>\n' + (r / 'src/styles.css').read_text() + '\n</style>')
for f in ('content', 'scenes', 'motion'):
    h = h.replace(f'<script src="src/{f}.js"></script>', '<script>\n' + (r / f'src/{f}.js').read_text().replace('</script>', '<\\/script>') + '\n</script>')
h = h.replace('→ / Space 다음 · ← 이전 · F 전체화면 · N 노트 · P 발표자창 · H UI 숨김', '→ / Space 다음 · ← 이전 · F 전체화면 · N 노트 · H UI 숨김 · 터치: 탭·스와이프')
(r / 'presentation.html').write_text(h)
