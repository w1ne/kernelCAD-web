#!/usr/bin/env python3
"""Build an authored-source/contact-sheet demo from checked catalog previews."""
import json
import math
import subprocess
import textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
PREVIEWS = ROOT / 'catalog/kits/medical/previews'
INDEX = ROOT / 'catalog/index.json'
CHECKS = BUNDLE / 'asset-check-results.json'
PAGES = BUNDLE / 'catalog-pages-check.json'
FRAMES = BUNDLE / 'frames'
OUT = BUNDLE / 'medical-kit.mp4'
WIDTH, HEIGHT = 1280, 720
BG = '#111923'
PANEL = '#1d2935'
TEXT = '#eef3f5'
MUTED = '#a6b6c0'
TEAL = '#61c6bf'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'

def font(size, path=FONT):
    return ImageFont.truetype(path, size)

def canvas():
    return Image.new('RGB', (WIDTH, HEIGHT), BG)

def header(draw, kicker, title, detail):
    draw.text((54, 34), kicker.upper(), fill=TEAL, font=font(18, BOLD))
    draw.text((54, 69), title, fill=TEXT, font=font(38, BOLD))
    draw.text((54, 122), detail, fill=MUTED, font=font(18))

def footer(draw, text):
    draw.line((54, 678, WIDTH - 54, 678), fill='#35434e', width=1)
    draw.text((54, 688), text, fill=MUTED, font=font(13))

def title_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    d.text((72, 80), 'kernelCAD  /  ASSET CATALOG', fill=TEAL, font=font(20, BOLD))
    d.text((72, 172), 'MEDICAL', fill=TEXT, font=font(70, BOLD))
    d.text((75, 274), '40 original low-poly props', fill=TEXT, font=font(34))
    d.text((75, 336), 'Clinic  ·  ward  ·  first aid  ·  laboratory', fill=MUTED, font=font(25))
    d.rounded_rectangle((72, 438, 1208, 560), radius=18, fill=PANEL, outline='#344651', width=2)
    d.text((102, 467), 'Parametric .kcad.ts sources', fill=TEXT, font=font(25, BOLD))
    d.text((102, 514), 'CC0 1.0   /   millimetres   /   Z up   /   base origin', fill=TEAL, font=font(20))
    footer(d, 'Native kernelCAD source and generated catalog previews')
    return im

def source_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, '01 / author', 'One editable source per prop', 'Example: hospital-bed.kcad.ts — source shown from the medical kit')
    source = (ROOT / 'catalog/kits/medical/hospital-bed.kcad.ts').read_text().splitlines()
    snippet = [source[i - 1] for i in [1, 2, 3, 14, 15, 16, 24, 26, 27, 32, 33, 38, 39, 40, 42, 47]]
    y = 178
    for line in snippet:
        shown = textwrap.shorten(line.strip(), width=76, placeholder=' …')
        d.text((64, y), shown, fill=TEXT if not line.strip().startswith('\"') else '#d7e1e6', font=font(14, MONO))
        y += 25
    d.rounded_rectangle((774, 188, 1198, 550), radius=16, fill=PANEL, outline='#344651', width=2)
    d.text((808, 220), 'Editable knobs', fill=TEAL, font=font(23, BOLD))
    d.text((808, 270), 'Shell color', fill=TEXT, font=font(20))
    d.text((808, 306), 'Accent color', fill=TEXT, font=font(20))
    d.text((808, 354), 'Choice: side rails', fill=TEXT, font=font(20))
    d.line((808, 397, 1158, 397), fill='#35434e', width=1)
    d.text((808, 421), 'Assembly parts', fill=TEAL, font=font(21, BOLD))
    d.text((808, 463), 'Mattress / frame / rails', fill=TEXT, font=font(17))
    d.text((808, 500), 'Headboard / caster wheels', fill=TEXT, font=font(17))
    footer(d, 'Every repeated shape is created fresh in the .kcad.ts source')
    return im

def contact_frame(rows, title, detail):
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, '02 / generated previews', title, detail)
    index = json.loads(INDEX.read_text())
    assets = sorted((a for a in index['assets'] if a['kit'] == 'medical'), key=lambda a: a['id'])
    cols = 4
    gap_x, gap_y = 18, 10
    card_w = 281
    card_h = 116
    x0, y0 = 54, 169
    start = rows * 14
    group = assets[start:start + 14]
    for i, asset in enumerate(group):
        col = i % cols
        row = i // cols
        x = x0 + col * (card_w + gap_x)
        y = y0 + row * (card_h + gap_y)
        d.rounded_rectangle((x, y, x + card_w, y + card_h), radius=10, fill=PANEL, outline='#344651', width=1)
        preview = Image.open(PREVIEWS / (asset['id'] + '.png')).convert('RGB')
        preview.thumbnail((card_w - 18, 78), Image.Resampling.LANCZOS)
        px = x + (card_w - preview.width) // 2
        py = y + 3 + (78 - preview.height) // 2
        im.paste(preview, (px, py))
        label = asset['title']
        if len(label) > 34:
            label = label[:32] + '…'
        d.text((x + 10, y + 88), label, fill=TEXT, font=font(14, BOLD))
    footer(d, 'Default-param previews rendered from generated low-poly GLB assets')
    return im

def verification_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, '03 / local verification', 'Source checks and catalog output', 'The reported gates describe local generation and geometry checks')
    checks = json.loads(CHECKS.read_text())
    pages = json.loads(PAGES.read_text())
    index = json.loads(INDEX.read_text())
    medical = [a for a in index['assets'] if a['kit'] == 'medical']
    card = (54, 185, 1226, 558)
    d.rounded_rectangle(card, radius=18, fill=PANEL, outline='#344651', width=2)
    lines = [
        ('Asset source validation', str(checks['passed']) + ' / ' + str(checks['total']) + ' passed'),
        ('Catalog index', str(len(medical)) + ' medical records in generated catalog/index.json'),
        ('Rendered previews', str(pages['previews']) + ' medical PNG previews'),
        ('Static catalog pages', str(pages['pages']) + ' local pages generated and checked'),
        ('Deployment state', 'PR branch only; public medical pages not deployed'),
    ]
    y = 225
    for label, value in lines:
        d.text((90, y), label, fill=TEAL, font=font(20, BOLD))
        d.text((470, y), value, fill=TEXT, font=font(20))
        y += 57
    d.text((90, 508), 'Stylized scene assets; no clinical, physical or hardware acceptance claim.', fill=MUTED, font=font(16))
    footer(d, 'No simulation or hardware acceptance is claimed by this asset catalog demo')
    return im

def main():
    FRAMES.mkdir(parents=True, exist_ok=True)
    index = json.loads(INDEX.read_text())
    assets = [a for a in index['assets'] if a['kit'] == 'medical']
    if len(assets) != 40:
        raise SystemExit('expected 40 medical catalog records, found ' + str(len(assets)))
    frames = [title_frame(), source_frame()]
    frames.extend([
        contact_frame(0, 'Clinic and ward', 'Furniture, mobility aids and bedside equipment'),
        contact_frame(1, 'First aid and instruments', 'Portable supplies and examination tools'),
        contact_frame(2, 'Laboratory and diagnostics', 'Sample handling and bench-top equipment'),
        verification_frame(),
    ])
    for i, frame in enumerate(frames, 1):
        frame.save(FRAMES / ('frame-%02d.png' % i), optimize=True)
    command = [
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-framerate', '1/4',
        '-i', str(FRAMES / 'frame-%02d.png'), '-c:v', 'libx264', '-r', '24',
        '-pix_fmt', 'yuv420p', '-crf', '25', '-movflags', '+faststart', str(OUT),
    ]
    subprocess.run(command, check=True)
    print('wrote', OUT, 'with', len(frames), 'frames and', len(assets), 'assets')

if __name__ == '__main__':
    main()
