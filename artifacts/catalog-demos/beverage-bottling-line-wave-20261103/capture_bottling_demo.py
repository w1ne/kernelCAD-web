#!/usr/bin/env python3
"""Capture the source-to-preview workflow and results as a short MP4."""
import importlib.util
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / 'catalog' / 'kits' / 'beverage-bottling-line'
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
    script = BUNDLE / 'generate_bottling_assets.py'
    spec = importlib.util.spec_from_file_location('bottling_assets', script)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return [asset[0] for asset in module.ASSETS]


def title_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    d.text((72, 68), 'kernelCAD  /  ASSET CATALOG', fill=TEAL, font=font(20, BOLD))
    d.text((72, 148), 'BEVERAGE BOTTLING LINE', fill=TEXT, font=font(48, BOLD))
    d.text((76, 236), '50 editable low-poly assets for a complete factory scene', fill=TEXT, font=font(25))
    d.text((76, 292), 'Bottle preparation  ·  rinse / fill / cap  ·  label / inspect', fill=MUTED, font=font(18))
    d.text((76, 326), 'Case packing  ·  pallet handling  ·  beverage prep  ·  CIP', fill=MUTED, font=font(18))
    d.rounded_rectangle((72, 410, 1208, 550), radius=16, fill=PANEL, outline='#344651', width=2)
    d.text((100, 437), 'Native .kcad.ts source with scale and palette knobs', fill=TEXT, font=font(23, BOLD))
    d.text((100, 490), 'CC0 1.0   /   millimetres   /   Z up   /   one GLB material', fill=TEAL, font=font(19))
    footer(d, 'Original kernelCAD geometry · local source, index, and preview workflow')
    return im


def source_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, '01 / source and parameters', 'A parametric rotary filler', 'The source is the design record; the default and edited previews come from that source.')
    lines = (KIT / 'rotary-filler.kcad.ts').read_text().splitlines()
    y = 145
    for line in lines[:27]:
        value = line.strip()
        if len(value) > 74:
            value = value[:71] + '…'
        d.text((56, y), value, fill=TEXT, font=font(11, MONO))
        y += 18
    x = 720
    d.rounded_rectangle((x, 154, 1208, 552), radius=12, fill=PANEL, outline='#344651', width=1)
    preview = Image.open(PREVIEWS / 'rotary-filler.png').convert('RGB')
    preview.thumbnail((450, 322), Image.Resampling.LANCZOS)
    im.paste(preview, (x + (488 - preview.width) // 2, 162 + (322 - preview.height) // 2))
    d.text((x + 18, 500), 'Default mesh preview · 832 triangles', fill=TEXT, font=font(16, BOLD))
    d.text((x + 18, 529), 'Generated from rotary-filler.kcad.ts', fill=TEAL, font=font(12, MONO))
    footer(d, 'Knobs declared in source: scale · equipment color · safety accent')
    return im


def variant_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, '02 / edit and render', 'Change the scale and safety palette', 'A local variant export uses the same .kcad.ts source with two knob values changed.')
    cards = [
        ('Default', PREVIEWS / 'rotary-filler.png', 'scale 1.00 · accent #e3a23d'),
        ('Edited variant', BUNDLE / 'rotary-filler-variant.png', 'scale 1.20 · accent #347b8b'),
    ]
    for i, (title, path, detail) in enumerate(cards):
        x = 156 + i * 500
        d.rounded_rectangle((x, 154, x + 450, 566), radius=12, fill=PANEL, outline='#344651', width=1)
        preview = Image.open(path).convert('RGB')
        preview.thumbnail((420, 330), Image.Resampling.LANCZOS)
        im.paste(preview, (x + (450 - preview.width) // 2, 165 + (330 - preview.height) // 2))
        d.text((x + 18, 510), title, fill=TEXT, font=font(18, BOLD))
        d.text((x + 18, 540), detail, fill=TEAL, font=font(13, MONO))
    footer(d, 'Local parameter variant only · no deployed or manufacturing acceptance claim')
    return im


def flow_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, 'workflow / scene scope', 'One kit follows the beverage production flow', 'The 50 assets group equipment by real production stages and supporting tasks.')
    stages = ['PET prep', 'Rinse', 'Fill', 'Cap', 'Label +\ninspect', 'Case pack', 'Palletize']
    x0, y, w, h, gap = 60, 210, 145, 110, 28
    for i, stage in enumerate(stages):
        x = x0 + i * (w + gap)
        d.rounded_rectangle((x, y, x + w, y + h), radius=12, fill=PANEL, outline=TEAL if i in (0, 6) else '#40515d', width=2)
        lines = stage.split('\n')
        for j, line in enumerate(lines):
            d.text((x + 16, y + 34 + j * 27), line, fill=TEXT, font=font(17, BOLD))
        if i < len(stages) - 1:
            ax = x + w + 4
            d.line((ax, y + h // 2, ax + gap - 8, y + h // 2), fill=TEAL, width=3)
            d.polygon([(ax + gap - 8, y + h // 2), (ax + gap - 17, y + h // 2 - 6), (ax + gap - 17, y + h // 2 + 6)], fill=TEAL)
    d.rounded_rectangle((92, 400, 1188, 550), radius=14, fill=PANEL, outline='#344651', width=1)
    d.text((122, 425), 'Product preparation', fill=TEAL, font=font(16, BOLD))
    d.text((122, 458), 'Blend tank  ·  carbonation vessel  ·  flash pasteurizer  ·  sanitary filtration and pump', fill=TEXT, font=font(15))
    d.text((122, 496), 'Cleaning + quality', fill=TEAL, font=font(16, BOLD))
    d.text((325, 496), 'CIP supply / return  ·  valve manifold  ·  in-line sample station', fill=TEXT, font=font(15))
    footer(d, 'Stage names define the asset grouping; the models are stylized props, not process specifications.')
    return im


def contact_frame(group_number, title, ids):
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, f'02 / rendered catalog previews · set {group_number}', title, 'Each card is a real default-parameter preview from the indexed source file.')
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
        d.text((x + 7, y + 218), 'scale · body · accent', fill=TEAL, font=font(9, MONO))
    footer(d, 'Generated locally from the catalog source; previews are referenced by index rows.')
    return im


def verification_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, '03 / local verification', 'Source, mesh, index, preview, and test checks', 'Validated for this branch. The public catalog route has not been deployed.')
    audit = json.loads((BUNDLE / 'asset-check-results.json').read_text())
    pages = json.loads((BUNDLE / 'catalog-pages-check.json').read_text())
    tests = json.loads((BUNDLE / 'catalog-tests.json').read_text())
    live = json.loads((BUNDLE / 'live-website-check.json').read_text())
    checks = [
        ('Catalog sources and meshes', f"{audit['assetsAudited']} / {audit['assetsExpected']} audited"),
        ('Triangle budget and material', f"{audit['triangles']['min']}–{audit['triangles']['max']} triangles · one material each"),
        ('Editable parameters', 'scale + equipment color + safety accent'),
        ('Source hash and previews', f"{audit['assetsAudited']} hashes · {audit['previewFiles']} PNG previews"),
        ('Catalog integration suite', tests['summary']),
        ('Local generated pages', f"{pages['pageAndPreviewPairs']} new asset pages · {pages['assetsInIndex']} index rows"),
    ]
    d.rounded_rectangle((54, 153, 1226, 538), radius=18, fill=PANEL, outline='#344651', width=2)
    y = 177
    for label, value in checks:
        d.text((82, y), label, fill=TEAL, font=font(16, BOLD))
        d.text((480, y), value, fill=TEXT, font=font(16))
        y += 48
    d.text((82, 486), f"kernelcad.com/ HTTP {live['homepageStatus']} · /catalog/ HTTP {live['catalogStatus']} · branch not deployed", fill=MUTED, font=font(14))
    footer(d, 'Local replay and validation only · no deployed behavior, manufacturing performance, or physical acceptance claim.')
    return im


def main():
    index = json.loads((ROOT / 'catalog' / 'index.json').read_text())
    rows = {asset['id']: asset for asset in index['assets'] if asset['kit'] == 'beverage-bottling-line'}
    order = source_order()
    if len(order) != 50 or set(rows) != set(order):
        raise SystemExit('expected 50 indexed assets in the recorded process order')
    if not all((PREVIEWS / f'{asset_id}.png').is_file() for asset_id in order):
        raise SystemExit('render all 50 kit previews before capturing the demo')
    required = ['asset-check-results.json', 'catalog-pages-check.json', 'catalog-tests.json', 'live-website-check.json', 'rotary-filler-variant.png']
    if not all((BUNDLE / name).is_file() for name in required):
        raise SystemExit('run the audit, local page check, website check, and variant render before capture')

    group_titles = [
        'Container and bottle preparation',
        'Rinse, fill, and closure',
        'Label and inspect',
        'Case forming and packing',
        'Pallet, beverage prep, and sanitation',
    ]
    frames = [title_frame(), flow_frame(), source_frame(), variant_frame()]
    for i in range(5):
        ids = order[i * 10:(i + 1) * 10]
        frames.append(contact_frame(i + 1, group_titles[i], ids))
    frames.append(verification_frame())
    if len(frames) != 10 or sum(len(order[i * 10:(i + 1) * 10]) for i in range(5)) != 50:
        raise SystemExit('demo must cover all 50 assets in exactly 10 frames')

    frame_dir = BUNDLE / 'frames'
    frame_dir.mkdir(parents=True, exist_ok=True)
    for i, frame in enumerate(frames, 1):
        frame.save(frame_dir / f'frame-{i:02d}.png', optimize=True)
    video = BUNDLE / 'beverage-bottling-line-kit.mp4'
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-framerate', '1/3',
        '-i', str(frame_dir / 'frame-%02d.png'), '-c:v', 'libx264', '-r', '24',
        '-pix_fmt', 'yuv420p', '-crf', '25', '-movflags', '+faststart', str(video),
    ], check=True)
    Image.open(frame_dir / 'frame-01.png').save(BUNDLE / 'poster.png', optimize=True)
    print(f'wrote {video.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
