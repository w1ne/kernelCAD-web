#!/usr/bin/env python3
"""Make contact sheets for manual visual review of the 50 rendered previews."""
import importlib.util
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / 'catalog' / 'kits' / 'vet-clinic'
OUT = BUNDLE / 'preview-review'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
spec = importlib.util.spec_from_file_location('vet_assets', BUNDLE / 'generate_vet_clinic_assets.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
ids = [asset['id'] for asset in module.ASSETS]
OUT.mkdir(parents=True, exist_ok=True)
for group in range(5):
    sheet = Image.new('RGB', (1100, 430), '#111923')
    draw = ImageDraw.Draw(sheet)
    draw.text((28, 15), f'VET CLINIC PREVIEW REVIEW · SET {group + 1}', fill='#61c6bf',
              font=ImageFont.truetype(BOLD, 18))
    for i, asset_id in enumerate(ids[group * 10:(group + 1) * 10]):
        col, row = i % 5, i // 5
        x, y = 20 + col * 216, 52 + row * 184
        preview = Image.open(KIT / 'previews' / f'{asset_id}.png').convert('RGB')
        preview.thumbnail((190, 145), Image.Resampling.LANCZOS)
        sheet.paste(preview, (x + (190 - preview.width) // 2, y))
        title = asset_id.replace('-', ' ').title()
        if len(title) > 26:
            title = title[:23] + '...'
        draw.text((x, y + 148), title, fill='#eef3f5', font=ImageFont.truetype(FONT, 10))
    sheet.save(OUT / f'set-{group + 1:02d}.png', optimize=True)
print(f'wrote 5 preview review sheets to {OUT}')
