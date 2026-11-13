#!/usr/bin/env python3
"""Build the review slides from committed preview PNGs (no re-rendering)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

B = Path(__file__).resolve().parent
W, H = 1280, 720
font = lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', s)

def slide(name, title, images, lines=()):
    im = Image.new('RGB', (W, H), '#f4f6f8'); d = ImageDraw.Draw(im)
    d.text((40, 24), title, fill='#1d2a33', font=font(34))
    if images:
        size = min(440, (W - 80) // len(images) - 20)
        x = (W - len(images) * (size + 20)) // 2
        for label, path in images:
            im.paste(Image.open(path).convert('RGB').resize((size, size)), (x, 110))
            d.text((x, 110 + size + 8), label, fill='#1d2a33', font=font(20)); x += size + 20
    y = 600 if images else 110
    for line in lines:
        d.text((40, y), line, fill='#33444f', font=font(22)); y += 34
    im.save(B / 'slides' / name)

s = B / 'samples'
slide('01-five-preview-audit.png', 'Five industrial previews audited (2026-11-13)',
      [(n, s / f'{n}.png') for n in ['centrifugal-pump', 'jib-crane', 'screw-conveyor', 'ball-mill', 'cyclone-separator']],
      ['Pump, ball mill: no defect. Jib crane, screw conveyor: geometry/label defects (logged, not fixed).',
       'Cyclone separator: material mismatch.'])
slide('02-before-after.png', 'cyclone-separator: process shell assigned to safety paint',
      [('before: striped cone, yellow stack + inlet', B / 'previews/before/cyclone-separator.png'),
       ('after: one steel shell, yellow flange ring', B / 'previews/after/cyclone-separator.png')])
slide('03-verification.png', 'Verification', [], [
    'cone-step-0, cone-step-2, outlet-stack, tangential-inlet: safetyPaint -> steel',
    'upper-rim keeps safetyPaint; two material knobs and both presets unchanged',
    'Triangles 388 before and after; size 0.6437 x 1.066 x 0.54 m unchanged',
    'tests/integration/catalog/cycloneSeparatorMaterials.test.ts: fails before, passes after',
    'Open limit: legs at r=200 mm do not touch the body (geometry, separate fix)'])
