#!/usr/bin/env python3
"""Capture a short workflow demo from real telecom-infrastructure sources and previews."""
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / 'catalog' / 'kits' / 'telecom-infrastructure'
PREVIEWS = KIT / 'previews'
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, TEAL = '#111923', '#1d2935', '#eef3f5', '#a6b6c0', '#61c6bf'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'


def font(size, path=FONT):
    return ImageFont.truetype(path, size)


def canvas():
    return Image.new('RGB', (WIDTH, HEIGHT), BG)


def header(draw, kicker, title, detail):
    draw.text((54, 28), kicker.upper(), fill=TEAL, font=font(16, BOLD))
    draw.text((54, 57), title, fill=TEXT, font=font(31, BOLD))
    draw.text((54, 101), detail, fill=MUTED, font=font(16))


def footer(draw, detail):
    draw.line((54, 678, WIDTH - 54, 678), fill='#35434e', width=1)
    draw.text((54, 688), detail, fill=MUTED, font=font(12))


def title_frame():
    im = canvas(); d = ImageDraw.Draw(im)
    d.text((72, 68), 'kernelCAD  /  ASSET CATALOG', fill=TEAL, font=font(20, BOLD))
    d.text((72, 148), 'TELECOM INFRASTRUCTURE', fill=TEXT, font=font(58, BOLD))
    d.text((76, 246), '56 editable low-poly communications-site and fiber-network props', fill=TEXT, font=font(27))
    d.text((76, 300), 'Cabinets  ·  masts  ·  antennas  ·  fiber  ·  cable routing', fill=MUTED, font=font(19))
    d.rounded_rectangle((72, 410, 1208, 552), radius=16, fill=PANEL, outline='#344651', width=2)
    d.text((100, 437), 'Native .kcad.ts models with scale and color knobs', fill=TEXT, font=font(23, BOLD))
    d.text((100, 490), 'CC0 1.0   /   millimetres   /   Z up   /   base origin', fill=TEAL, font=font(19))
    footer(d, 'Original kernelCAD geometry · local catalog workflow')
    return im


def source_frame():
    im = canvas(); d = ImageDraw.Draw(im)
    header(d, '01 / author', 'A real parametric source model', 'Cell-site cabinet: scale changes dimensions; color remains one user-editable palette.')
    lines = (KIT / 'cell-site-cabinet.kcad.ts').read_text().splitlines()
    y = 145
    for line in lines[:25]:
        value = line.strip()
        if len(value) > 69: value = value[:66] + '…'
        d.text((58, y), value, fill=TEXT, font=font(12, MONO)); y += 19
    d.rounded_rectangle((790, 152, 1210, 570), radius=16, fill=PANEL, outline='#344651', width=2)
    preview = Image.open(PREVIEWS / 'cell-site-cabinet.png').convert('RGB')
    preview.thumbnail((388, 315), Image.Resampling.LANCZOS)
    im.paste(preview, (801 + (388 - preview.width) // 2, 165 + (315 - preview.height) // 2))
    d.text((825, 500), 'scale  0.70 — 1.30', fill=TEAL, font=font(17, BOLD))
    d.text((825, 531), 'color  user-selectable', fill=TEXT, font=font(16))
    footer(d, 'The generated index lists both controls; the catalog audit checks their mesh outputs.')
    return im


def contact_frame(group_number, title, ids):
    im = canvas(); d = ImageDraw.Draw(im)
    header(d, f'02 / generated previews · set {group_number}', title, 'Default-parameter mesh previews rendered from the indexed .kcad.ts sources.')
    card_w, card_h, gap_x, gap_y, x0, y0 = 276, 235, 12, 8, 54, 155
    for i, asset_id in enumerate(ids):
        col, row = i % 4, i // 4
        x, y = x0 + col * (card_w + gap_x), y0 + row * (card_h + gap_y)
        d.rounded_rectangle((x, y, x + card_w, y + card_h), radius=9, fill=PANEL, outline='#344651', width=1)
        preview = Image.open(PREVIEWS / f'{asset_id}.png').convert('RGB')
        preview.thumbnail((card_w - 16, 178), Image.Resampling.LANCZOS)
        im.paste(preview, (x + (card_w - preview.width) // 2, y + 4 + (178 - preview.height) // 2))
        title_text = asset_id.replace('-', ' ').title()
        if len(title_text) > 31: title_text = title_text[:28] + '…'
        d.text((x + 8, y + 190), title_text, fill=TEXT, font=font(12, BOLD))
        d.text((x + 8, y + 211), 'scale · color', fill=TEAL, font=font(10, MONO))
    footer(d, 'Original low-poly scene props; rendered locally from the actual kit sources.')
    return im


def verification_frame():
    im = canvas(); d = ImageDraw.Draw(im)
    header(d, '03 / local verification', 'Catalog audit and local pages', 'Current source, generated mesh, index, lint, integration suite and static-page output were checked.')
    checks = json.loads((BUNDLE / 'asset-check-results.json').read_text())
    pages = json.loads((BUNDLE / 'catalog-pages-check.json').read_text())
    tests = checks['integration']
    values = [
        ('Telecom-infrastructure sources and meshes', f"{checks['passed']} / {checks['total']} audited"),
        ('Triangle budget and material', f"{checks['triangleRange'][0]}–{checks['triangleRange'][1]} triangles · one material each"),
        ('Indexed controls and floor base', 'scale + color · all meshes start at z = 0'),
        ('Catalog integration suite', f"{tests['filesPassed']} files · {tests['testsPassed']} tests passed"),
        ('Local generated pages', f"{pages['pageAndPreviewPairs']} asset pages · {pages['assetsInIndex']} assets total"),
    ]
    d.rounded_rectangle((54, 165, 1226, 535), radius=18, fill=PANEL, outline='#344651', width=2)
    y = 198
    for label, value in values:
        d.text((84, y), label, fill=TEAL, font=font(17, BOLD))
        d.text((540, y), value, fill=TEXT, font=font(17)); y += 55
    live = json.loads((BUNDLE / 'live-website-check.json').read_text())
    d.text((84, 486), f"Public /catalog/: HTTP {live['catalogStatus']} on {live['checkedAt'][:10]}; this branch is not deployed.", fill=MUTED, font=font(14))
    footer(d, 'Local replay and validation only · no deployed behavior or physical telecom acceptance claimed.')
    return im


def main():
    index = json.loads((ROOT / 'catalog' / 'index.json').read_text())
    assets = [asset for asset in index['assets'] if asset['kit'] == 'telecom-infrastructure']
    if len(assets) != 56 or not all((PREVIEWS / f"{asset['id']}.png").is_file() for asset in assets):
        raise SystemExit('expected all 56 catalog assets and rendered previews before capture')
    required = ['asset-check-results.json', 'catalog-pages-check.json', 'catalog-test-output.txt', 'live-website-check.json']
    if not all((BUNDLE / name).is_file() for name in required):
        raise SystemExit('run the audit and local page checks before capture')
    frames = [title_frame(), source_frame()]
    groups = [(f'Catalog preview set {i // 8 + 1}', [a['id'] for a in assets[i:i + 8]]) for i in range(0, len(assets), 8)]
    frames.extend(contact_frame(i, title, ids) for i, (title, ids) in enumerate(groups, 1))
    frames.append(verification_frame())
    if len(frames) != 10 or sum(len(ids) for _, ids in groups) != 56:
        raise SystemExit('demo must cover all 56 assets in exactly 10 frames')
    frame_dir = BUNDLE / 'frames'; frame_dir.mkdir(parents=True, exist_ok=True)
    for i, frame in enumerate(frames, 1): frame.save(frame_dir / f'frame-{i:02d}.png', optimize=True)
    out = BUNDLE / 'telecom-infrastructure-kit.mp4'
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-framerate', '1/3',
        '-i', str(frame_dir / 'frame-%02d.png'), '-c:v', 'libx264', '-r', '24',
        '-pix_fmt', 'yuv420p', '-crf', '25', '-movflags', '+faststart', str(out),
    ], check=True)
    Image.open(frame_dir / 'frame-01.png').save(BUNDLE / 'poster.png', optimize=True)
    print(f'wrote {out}')


if __name__ == '__main__':
    main()
