#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Make a compact contact sheet for the five-preview semantic audit."""
from pathlib import Path
from textwrap import fill
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
CASES = [
    ('mining/jaw-crusher-module', 'Jaw crusher module', 'No clear mismatch: crusher chamber, drive and feed/discharge conveyor are legible.'),
    ('water-treatment/belt-filter-press', 'Belt filter press', 'No clear mismatch: framed press with roller/belt stages and tanks reads as a filter press.'),
    ('beverage-bottling-line/bottle-case-packer', 'Bottle case packer', 'No clear mismatch: bottles, carton area and gantry identify the packing operation.'),
    ('beverage-bottling-line/bottle-rinser-carousel', 'Bottle rinser carousel', 'No clear mismatch: rotary table and bottle rinse stations read as a rinser.'),
    ('beverage-bottling-line/cap-elevator', 'Bottle-cap elevator · after', 'Mismatch fixed: open hopper, exposed cleated belt, guarded rails and discharge are visible.'),
]
W, H = 1500, 1120
image = Image.new('RGB', (W, H), '#eff3f6')
draw = ImageDraw.Draw(image)
draw.text((42, 28), 'Five rendered previews · semantic audit', font=ImageFont.truetype(BOLD, 30), fill='#1f3548')
draw.text((42, 72), 'Selection excludes assets touched by the active semantic-fix PRs.', font=ImageFont.truetype(FONT, 17), fill='#465d6d')
for i, (key, title, note) in enumerate(CASES):
    col, row = i % 2, i // 2
    x, y = 42 + col * 720, 120 + row * 320
    draw.rounded_rectangle((x, y, x + 680, y + 290), radius=14, fill='white', outline='#bdc9d2', width=2)
    draw.text((x + 20, y + 14), title, font=ImageFont.truetype(BOLD, 20), fill='#126575')
    kit, asset_id = key.split('/')
    preview = ROOT / 'catalog/kits' / kit / 'previews' / f'{asset_id}.png'
    with Image.open(preview) as asset:
        asset = asset.convert('RGB')
        asset.thumbnail((260, 226), Image.Resampling.LANCZOS)
        image.paste(asset, (x + 16, y + 48))
    draw.multiline_text((x + 300, y + 64), fill(note, width=38), font=ImageFont.truetype(FONT, 17), fill='#263b4a', spacing=8)
image.save(BUNDLE / 'preview-review' / 'five-rendered-previews.png', optimize=True)
