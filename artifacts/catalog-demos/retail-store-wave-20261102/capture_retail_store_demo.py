#!/usr/bin/env python3
"""Capture a short workflow demo from real retail-store sources and previews."""
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / 'catalog' / 'kits' / 'retail-store'
PREVIEWS = KIT / 'previews'
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, TEAL = '#111923', '#1d2935', '#eef3f5', '#a6b6c0', '#61c6bf'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
GROUPS = [
    ('Checkout equipment', ['checkout-counter', 'checkout-conveyor', 'self-checkout-kiosk', 'assisted-checkout-till', 'cash-drawer', 'barcode-scanner', 'payment-terminal', 'receipt-printer']),
    ('Queue and shelf fixtures', ['checkout-bagging-stand', 'checkout-divider', 'queue-barrier', 'queue-stanchion', 'gondola-shelf', 'wall-shelf-unit', 'shelf-endcap', 'wire-grid-display']),
    ('Fresh and impulse displays', ['produce-display-table', 'bakery-display-case', 'refrigerated-display-case', 'upright-drink-cooler', 'chest-freezer', 'deli-service-case', 'bulk-food-bin', 'impulse-merchandiser']),
    ('Merchandising and shopping', ['floor-display-stand', 'magazine-rack', 'clothing-rail', 'pallet-display', 'shopping-cart', 'handbasket', 'shopping-basket', 'flatbed-stock-trolley']),
    ('Stock handling and entry', ['stock-ladder', 'stock-hand-truck', 'roll-cage-trolley', 'wooden-pallet', 'produce-crate-stack', 'trolley-corral', 'shopping-bag-dispenser', 'entry-security-gate']),
    ('Customer services and signs', ['bottle-return-kiosk', 'parcel-locker-bank', 'customer-service-desk', 'returns-drop-bin', 'recycling-station', 'aisle-sign', 'hanging-wayfinding-sign', 'price-check-scale']),
]


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
    d.text((72, 148), 'RETAIL STORE', fill=TEXT, font=font(58, BOLD))
    d.text((76, 246), '48 editable low-poly shop fixtures and service props', fill=TEXT, font=font(27))
    d.text((76, 300), 'Checkout  ·  shelves  ·  shopping  ·  stock  ·  customer service', fill=MUTED, font=font(19))
    d.rounded_rectangle((72, 410, 1208, 552), radius=16, fill=PANEL, outline='#344651', width=2)
    d.text((100, 437), 'Native .kcad.ts sources with scale and color knobs', fill=TEXT, font=font(23, BOLD))
    d.text((100, 490), 'CC0 1.0   /   millimetres   /   Z up   /   base origin', fill=TEAL, font=font(19))
    footer(d, 'Original kernelCAD geometry · local catalog workflow')
    return im


def source_frame():
    im = canvas(); d = ImageDraw.Draw(im)
    header(d, '01 / author', 'A real parametric source model', 'Checkout counter: scale changes dimensions; color remains one user-editable palette.')
    lines = (KIT / 'checkout-counter.kcad.ts').read_text().splitlines()
    y = 145
    for line in lines[:25]:
        value = line.strip()
        if len(value) > 69: value = value[:66] + '…'
        d.text((58, y), value, fill=TEXT, font=font(12, MONO)); y += 19
    d.rounded_rectangle((790, 152, 1210, 570), radius=16, fill=PANEL, outline='#344651', width=2)
    preview = Image.open(PREVIEWS / 'checkout-counter.png').convert('RGB')
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
        ('Retail-store sources and meshes', f"{checks['passed']} / {checks['total']} audited"),
        ('Triangle budget and material', f"{checks['triangleRange'][0]}–{checks['triangleRange'][1]} triangles · one material each"),
        ('Indexed controls and floor base', 'scale + color · all meshes start at z = 0'),
        ('Catalog integration suite', f"{tests['filesPassed']} files · {tests['testsPassed']} tests passed"),
        ('Local generated pages', f"{pages['pageAndPreviewPairs']} asset pages · {pages['assetsInIndex']} assets total"),
    ]
    d.rounded_rectangle((54, 165, 1226, 535), radius=18, fill=PANEL, outline='#344651', width=2)
    y = 198
    for label, value in values:
        d.text((84, y), label, fill=TEAL, font=font(17, BOLD))
        d.text((475, y), value, fill=TEXT, font=font(17)); y += 55
    live = json.loads((BUNDLE / 'live-website-check.json').read_text())
    d.text((84, 486), f"Public /catalog/: HTTP {live['catalogStatus']} on {live['checkedAt'][:10]}; this branch is not deployed.", fill=MUTED, font=font(14))
    footer(d, 'Local replay and validation only · no deployed behavior or physical retail acceptance claimed.')
    return im


def main():
    index = json.loads((ROOT / 'catalog' / 'index.json').read_text())
    assets = [asset for asset in index['assets'] if asset['kit'] == 'retail-store']
    if len(assets) != 48 or not all((PREVIEWS / f"{asset['id']}.png").is_file() for asset in assets):
        raise SystemExit('expected all 48 catalog assets and rendered previews before capture')
    required = ['asset-check-results.json', 'catalog-pages-check.json', 'catalog-test-output.txt', 'live-website-check.json']
    if not all((BUNDLE / name).is_file() for name in required):
        raise SystemExit('run the audit and local page checks before capture')
    frames = [title_frame(), source_frame()]
    frames.extend(contact_frame(i, title, ids) for i, (title, ids) in enumerate(GROUPS, 1))
    frames.append(verification_frame())
    if len(frames) != 9 or sum(len(ids) for _, ids in GROUPS) != 48:
        raise SystemExit('demo must cover all 48 assets in exactly 9 frames')
    frame_dir = BUNDLE / 'frames'; frame_dir.mkdir(parents=True, exist_ok=True)
    for i, frame in enumerate(frames, 1): frame.save(frame_dir / f'frame-{i:02d}.png', optimize=True)
    out = BUNDLE / 'retail-store-kit.mp4'
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-framerate', '1/3',
        '-i', str(frame_dir / 'frame-%02d.png'), '-c:v', 'libx264', '-r', '24',
        '-pix_fmt', 'yuv420p', '-crf', '25', '-movflags', '+faststart', str(out),
    ], check=True)
    Image.open(frame_dir / 'frame-01.png').save(BUNDLE / 'poster.png', optimize=True)
    print(f'wrote {out}')


if __name__ == '__main__':
    main()
