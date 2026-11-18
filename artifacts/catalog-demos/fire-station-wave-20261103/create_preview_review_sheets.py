#!/usr/bin/env python3
"""Create seven visual review sheets for the 70 fire-station previews."""
import importlib.util
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
PREVIEWS = ROOT / 'catalog' / 'kits' / 'fire-station' / 'previews'
OUT = BUNDLE / 'preview-review'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
spec = importlib.util.spec_from_file_location('fire_station_assets', BUNDLE / 'generate_fire_station_assets.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
ids = [asset['id'] for asset in module.ASSETS]
if len(ids) != 70:
    raise SystemExit(f'expected 70 assets, found {len(ids)}')
OUT.mkdir(parents=True, exist_ok=True)
title_font = ImageFont.truetype(BOLD, 17)
label_font = ImageFont.truetype(FONT, 11)
for group in range(7):
    canvas = Image.new('RGB', (1120, 455), '#111923')
    draw = ImageDraw.Draw(canvas)
    draw.text((26, 18), f'FIRE STATION PREVIEW REVIEW · SET {group + 1}', fill='#61c6bf', font=title_font)
    for i, asset_id in enumerate(ids[group * 10:(group + 1) * 10]):
        col, row = i % 5, i // 5
        x, y = 26 + col * 218, 54 + row * 194
        path = PREVIEWS / f'{asset_id}.png'
        if not path.is_file():
            raise SystemExit(f'missing preview {path}')
        image = Image.open(path).convert('RGB')
        image.thumbnail((200, 158), Image.Resampling.LANCZOS)
        draw.rounded_rectangle((x, y, x + 204, y + 184), radius=8, fill='#1d2935', outline='#344651', width=1)
        canvas.paste(image, (x + (204 - image.width) // 2, y + 4 + (158 - image.height) // 2))
        label = asset_id.replace('-', ' ').title()
        if len(label) > 30:
            label = label[:27] + '…'
        draw.text((x + 7, y + 165), label, fill='#eef3f5', font=label_font)
    canvas.save(OUT / f'set-{group + 1:02d}.png', optimize=True)
print(f'wrote seven review sheets for {len(ids)} previews to {OUT}')
