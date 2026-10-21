"""Pack full-resolution browser captures into guard-sized tiles and an escaped gallery."""
import html
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent
out = root / 'evidence' / 'screenshots'
out.mkdir(parents=True, exist_ok=True)
results = json.loads((root / 'results' / 'results.json').read_text())
fixture_names = {f'{i:02}': f['name'] for i, f in enumerate(results['fixtures'])}
sections = []
for source in sorted((root / 'results' / 'screenshots').glob('*.jpg')):
    image = Image.open(source)
    links = []
    for index, top in enumerate(range(0, image.height, 4500)):
        name = f'{source.stem}-{index + 1}.jpg'
        tile = image.crop((0, top, image.width, min(top + 4500, image.height)))
        tile.save(out / name, quality=85, optimize=True)
        if (out / name).stat().st_size > 750_000:
            raise ValueError(f'Evidence tile too large: {name}')
        links.append(f'<a href="screenshots/{name}"><img loading="lazy" src="screenshots/{name}" alt="{html.escape(source.stem)} tile {index + 1}"></a>')
    label = fixture_names.get(source.stem[:2], 'Automatic direction comparison')
    sections.append(f'<section><h2>{html.escape(source.stem)} · {html.escape(label)}</h2>{"".join(links)}</section>')
(root / 'evidence' / 'index.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><title>Issue 67 evidence</title>
<style>body{font:14px system-ui;margin:24px;background:#ddd;color:#111}h2{font-size:16px}img{display:block;max-width:100%;height:auto;margin:4px 0}section{margin:36px 0}a:focus{outline:3px solid blue}</style>
<h1>Issue 67 · Mermaid (left) / Pele (right)</h1><p>Full resolution screenshots; long diagrams continue in consecutive tiles. Click an image to inspect it.</p>''' + ''.join(sections))
print(f'Packed {len(sections)} comparisons into {len(list(out.glob("*.jpg")))} image tiles.')
