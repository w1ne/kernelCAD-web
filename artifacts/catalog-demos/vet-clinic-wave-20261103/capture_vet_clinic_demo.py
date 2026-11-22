#!/usr/bin/env python3
"""Create a short source, preview, parameter and audit walkthrough MP4."""
import importlib.util
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / 'catalog' / 'kits' / 'vet-clinic'
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
    draw.text((54, 57), title, fill=TEXT, font=font(30, BOLD))
    draw.text((54, 101), detail, fill=MUTED, font=font(16))


def footer(draw, detail):
    draw.line((54, 678, WIDTH - 54, 678), fill='#35434e', width=1)
    draw.text((54, 688), detail, fill=MUTED, font=font(12))


def source_order():
    script = BUNDLE / 'generate_vet_clinic_assets.py'
    spec = importlib.util.spec_from_file_location('vet_clinic_assets', script)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return [asset['id'] for asset in module.ASSETS]


def title_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    d.text((72, 68), 'kernelCAD  /  ASSET CATALOG', fill=TEAL, font=font(20, BOLD))
    d.text((72, 148), 'VETERINARY CLINIC', fill=TEXT, font=font(48, BOLD))
    d.text((76, 236), '50 editable low-poly props for a small animal clinic scene', fill=TEXT, font=font(25))
    d.text((76, 292), 'Reception  ·  examination  ·  treatment  ·  imaging  ·  surgery', fill=MUTED, font=font(18))
    d.text((76, 326), 'Diagnostics  ·  inpatient care  ·  grooming', fill=MUTED, font=font(18))
    d.rounded_rectangle((72, 410, 1208, 550), radius=16, fill=PANEL, outline='#344651', width=2)
    d.text((100, 437), 'Native .kcad.ts sources with scale and color controls', fill=TEXT, font=font(23, BOLD))
    d.text((100, 490), 'CC0 1.0   /   millimetres   /   Z up   /   one material per asset', fill=TEAL, font=font(19))
    footer(d, 'Original kernelCAD scene geometry · local source, preview, and validation workflow')
    return im


def flow_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, '01 / clinic scene', 'A kit organized around real clinic work areas', 'The assets span the spaces and equipment that distinguish a small animal clinic.')
    stages = ['Reception +\nexam', 'Treatment +\nimaging', 'Surgery +\nsterilization', 'Diagnostics +\nsamples', 'Housing +\ngrooming']
    x0, y, w, h, gap = 58, 220, 208, 138, 36
    for i, stage in enumerate(stages):
        x = x0 + i * (w + gap)
        d.rounded_rectangle((x, y, x + w, y + h), radius=12, fill=PANEL, outline=TEAL if i in (0, 4) else '#40515d', width=2)
        for j, line in enumerate(stage.split('\n')):
            d.text((x + 16, y + 43 + j * 30), line, fill=TEXT, font=font(18, BOLD))
        if i < len(stages) - 1:
            ax = x + w + 5
            d.line((ax, y + h // 2, ax + gap - 8, y + h // 2), fill=TEAL, width=3)
            d.polygon([(ax + gap - 8, y + h // 2), (ax + gap - 18, y + h // 2 - 6), (ax + gap - 18, y + h // 2 + 6)], fill=TEAL)
    d.rounded_rectangle((100, 430, 1180, 550), radius=14, fill=PANEL, outline='#344651', width=1)
    d.text((132, 454), 'Scene anchors', fill=TEAL, font=font(16, BOLD))
    d.text((132, 489), 'Wet treatment table  ·  ultrasound cart  ·  anesthesia machine  ·  kennel bank  ·  grooming tub', fill=TEXT, font=font(15))
    footer(d, 'Workflow grouping is descriptive; the models are generic visualization props, not clinical equipment specifications.')
    return im


def source_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, '02 / source and parameters', 'A parameterized ultrasound cart', 'The native source defines metadata, scale and color controls, and the mesh shown here.')
    source = KIT / 'mobile-ultrasound-cart.kcad.ts'
    lines = source.read_text().splitlines()
    y = 145
    for line in lines[:28]:
        value = line.strip()
        if len(value) > 72:
            value = value[:69] + '…'
        d.text((56, y), value, fill=TEXT, font=font(11, MONO))
        y += 18
    x = 720
    d.rounded_rectangle((x, 154, 1208, 552), radius=12, fill=PANEL, outline='#344651', width=1)
    preview = Image.open(PREVIEWS / 'mobile-ultrasound-cart.png').convert('RGB')
    preview.thumbnail((450, 322), Image.Resampling.LANCZOS)
    im.paste(preview, (x + (488 - preview.width) // 2, 162 + (322 - preview.height) // 2))
    audit = json.loads((BUNDLE / 'source-audit.json').read_text())
    row = next(asset for asset in audit['assets'] if asset['id'] == 'mobile-ultrasound-cart')
    d.text((x + 18, 500), f"Default mesh preview · {row['triangles']} triangles", fill=TEXT, font=font(16, BOLD))
    d.text((x + 18, 529), 'Generated from mobile-ultrasound-cart.kcad.ts', fill=TEAL, font=font(12, MONO))
    footer(d, 'Controls in source: overall scale · asset color')
    return im


def variant_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, '03 / edit and render', 'Change scale and asset color', 'A second mesh is rendered from the same source with two changed parameter values.')
    cards = [
        ('Default', PREVIEWS / 'mobile-ultrasound-cart.png', 'scale 1.00 · color #70858b'),
        ('Edited variant', BUNDLE / 'ultrasound-cart-variant.png', 'scale 1.15 · color #4b817b'),
    ]
    for i, (title, path, detail) in enumerate(cards):
        x = 156 + i * 500
        d.rounded_rectangle((x, 154, x + 450, 566), radius=12, fill=PANEL, outline='#344651', width=1)
        preview = Image.open(path).convert('RGB')
        preview.thumbnail((420, 330), Image.Resampling.LANCZOS)
        im.paste(preview, (x + (450 - preview.width) // 2, 165 + (330 - preview.height) // 2))
        d.text((x + 18, 510), title, fill=TEXT, font=font(18, BOLD))
        d.text((x + 18, 540), detail, fill=TEAL, font=font(13, MONO))
    footer(d, 'Local parameter variant only · no deployed or clinical acceptance claim')
    return im


def contact_frame(group_number, title, ids):
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, f'04 / rendered catalog previews · set {group_number}', title, 'Each card is a default-parameter mesh preview from its indexed source.')
    card_w, card_h, gap_x, gap_y, x0, y0 = 220, 244, 12, 8, 54, 154
    for i, asset_id in enumerate(ids):
        col, row = i % 5, i // 5
        x, y = x0 + col * (card_w + gap_x), y0 + row * (card_h + gap_y)
        d.rounded_rectangle((x, y, x + card_w, y + card_h), radius=9, fill=PANEL, outline='#344651', width=1)
        preview = Image.open(PREVIEWS / f'{asset_id}.png').convert('RGB')
        preview.thumbnail((card_w - 14, 178), Image.Resampling.LANCZOS)
        im.paste(preview, (x + (card_w - preview.width) // 2, y + 4 + (178 - preview.height) // 2))
        title_text = asset_id.replace('-', ' ').title()
        if len(title_text) > 31:
            title_text = title_text[:28] + '…'
        d.text((x + 7, y + 192), title_text, fill=TEXT, font=font(11, BOLD))
        d.text((x + 7, y + 218), 'scale · color', fill=TEAL, font=font(9, MONO))
    footer(d, 'Rendered locally from the catalog sources; preview paths are stored in the generated index.')
    return im


def verification_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, '05 / local verification', 'Source, mesh, index, preview and page checks', 'Evidence is from this branch. The veterinary wave is not deployed.')
    audit = json.loads((BUNDLE / 'source-audit.json').read_text())
    pages = json.loads((BUNDLE / 'catalog-pages-check.json').read_text())
    tests = json.loads((BUNDLE / 'catalog-tests.json').read_text())
    index = json.loads((ROOT / 'catalog' / 'index.json').read_text())
    live = json.loads((BUNDLE / 'live-website-check.json').read_text())
    triangles = [asset['triangles'] for asset in audit['assets']]
    checks = [
        ('Generated catalog', f"{len(index['assets'])} rows · {len(index['kits'])} kits"),
        ('New sources and meshes', f"{audit['passed']} / {audit['expected']} pass · {min(triangles)}–{max(triangles)} triangles"),
        ('Parameters and material', 'scale + color · one material · base or wall origin verified'),
        ('Preview paths', f"{len([asset for asset in index['assets'] if asset.get('preview')])} indexed rows · 50 new PNGs"),
        ('Catalog integration suite', tests['summary']),
        ('Local kit pages', f"{pages['kitPagesChecked']} detail pages + preview copies checked"),
    ]
    d.rounded_rectangle((54, 153, 1226, 538), radius=18, fill=PANEL, outline='#344651', width=2)
    y = 177
    for label, value in checks:
        d.text((82, y), label, fill=TEAL, font=font(16, BOLD))
        d.text((480, y), value, fill=TEXT, font=font(16))
        y += 48
    d.text((82, 486), f"Live homepage baseline: {live['assetRows']} previewed rows · branch not deployed", fill=MUTED, font=font(14))
    footer(d, 'Local replay and validation only · no deployed behavior, clinical performance, or physical acceptance claim.')
    return im


def main():
    index = json.loads((ROOT / 'catalog' / 'index.json').read_text())
    rows = [asset for asset in index['assets'] if asset['kit'] == 'vet-clinic']
    order = source_order()
    if len(rows) != 50 or {asset['id'] for asset in rows} != set(order):
        raise SystemExit('expected 50 indexed assets in the recorded clinic workflow order')
    if not all((PREVIEWS / f'{asset_id}.png').is_file() for asset_id in order):
        raise SystemExit('render all 50 kit previews before capturing the demo')
    required = ['source-audit.json', 'catalog-pages-check.json', 'catalog-tests.json', 'live-website-check.json', 'ultrasound-cart-variant.png']
    if not all((BUNDLE / name).is_file() for name in required):
        raise SystemExit('run the mesh audit, local page check, integration suite and variant render before capture')

    group_titles = [
        'Reception and examination',
        'Treatment and diagnostic imaging',
        'Surgery and instrument processing',
        'Diagnostics and sample handling',
        'Inpatient housing and grooming',
    ]
    frames = [title_frame(), flow_frame(), source_frame(), variant_frame()]
    for i, title in enumerate(group_titles):
        frames.append(contact_frame(i + 1, title, order[i * 10:(i + 1) * 10]))
    frames.append(verification_frame())
    if len(frames) != 10 or sum(len(order[i * 10:(i + 1) * 10]) for i in range(5)) != 50:
        raise SystemExit('demo must cover all 50 assets in exactly 10 frames')

    frame_dir = BUNDLE / 'frames'
    frame_dir.mkdir(parents=True, exist_ok=True)
    for i, frame in enumerate(frames, 1):
        frame.save(frame_dir / f'frame-{i:02d}.png', optimize=True)
    video = BUNDLE / 'vet-clinic-kit.mp4'
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-framerate', '1/3',
        '-i', str(frame_dir / 'frame-%02d.png'), '-c:v', 'libx264', '-r', '24',
        '-pix_fmt', 'yuv420p', '-crf', '25', '-movflags', '+faststart', str(video),
    ], check=True)
    Image.open(frame_dir / 'frame-01.png').save(BUNDLE / 'poster.png', optimize=True)
    print(f'wrote {video.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
