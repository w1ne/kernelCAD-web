#!/usr/bin/env python3
"""Create a short native-source, preview and verification walkthrough MP4."""
import importlib.util
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / 'catalog' / 'kits' / 'shipyard'
PREVIEWS = KIT / 'previews'
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, TEAL = '#111923', '#1d2935', '#eef3f5', '#a6b6c0', '#61c6bf'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'

original = ROOT / 'artifacts' / 'catalog-demos' / 'shipyard-wave-20261103' / 'generate_shipyard_assets.py'
spec = importlib.util.spec_from_file_location('shipyard_assets', original)
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)
ASSETS = base.ASSETS
ORDER = [asset['id'] for asset in ASSETS]
GROUPS = [(group, [asset['id'] for asset in ASSETS if asset['group'] == group]) for group in dict.fromkeys(asset['group'] for asset in ASSETS)]


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


def title_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    d.text((72, 68), 'kernelCAD  /  ASSET CATALOG', fill=TEAL, font=font(20, BOLD))
    d.text((72, 148), 'SHIPYARD  /  QUALITY PASS', fill=TEXT, font=font(42, BOLD))
    d.text((76, 236), '70 existing props promoted with material zones and profiles', fill=TEXT, font=font(24))
    d.text((76, 292), 'Drydock  ·  hull fabrication  ·  outfitting  ·  coating', fill=MUTED, font=font(18))
    d.text((76, 326), 'Yard movement  ·  inspection  ·  refit support', fill=MUTED, font=font(18))
    d.rounded_rectangle((72, 410, 1208, 550), radius=16, fill=PANEL, outline='#344651', width=2)
    d.text((100, 437), 'Native .kcad.ts sources with component-specific color controls', fill=TEXT, font=font(23, BOLD))
    d.text((100, 490), 'CC0 1.0   /   scale   /   2–4 material colors   /   two finish presets', fill=TEAL, font=font(19))
    footer(d, 'Existing catalog entries only · local source, preview, and validation workflow')
    return im


def flow_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, '01 / shipyard kit', 'Six connected yard-work zones', 'The catalog covers dock operations, plate fabrication, services, coating, material movement and inspection.')
    labels = ['Yard +\ndock', 'Plate\nfabrication', 'Yard\nservices', 'Surface\ncoating', 'Material\nmovement', 'Inspection\n+ refit']
    x0, y, w, h, gap = 58, 220, 174, 138, 28
    for i, label in enumerate(labels):
        x = x0 + i * (w + gap)
        d.rounded_rectangle((x, y, x + w, y + h), radius=12, fill=PANEL, outline=TEAL if i in (0, 5) else '#40515d', width=2)
        for j, line in enumerate(label.split('\n')):
            d.text((x + 13, y + 42 + j * 29), line, fill=TEXT, font=font(17, BOLD))
        if i < len(labels) - 1:
            ax = x + w + 4
            d.line((ax, y + h // 2, ax + gap - 7, y + h // 2), fill=TEAL, width=3)
            d.polygon([(ax + gap - 7, y + h // 2), (ax + gap - 17, y + h // 2 - 6), (ax + gap - 17, y + h // 2 + 6)], fill=TEAL)
    d.rounded_rectangle((100, 430, 1180, 550), radius=14, fill=PANEL, outline='#344651', width=1)
    d.text((132, 454), 'Scene anchors', fill=TEAL, font=font(16, BOLD))
    d.text((132, 489), 'Caisson gate  ·  plate roller  ·  coating pot  ·  block transporter  ·  survey gear', fill=TEXT, font=font(15))
    footer(d, 'Workflow grouping is descriptive; props do not specify shipyard engineering or operational procedures.')
    return im


def source_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, '02 / native source and controls', 'A caisson gate with readable material zones', 'The source exposes scale, hull finish, structural steel and buoyancy coating.')
    source = KIT / 'dock-gate-caisson.kcad.ts'
    y = 145
    for line in source.read_text().splitlines()[:31]:
        value = line.strip()
        if len(value) > 72:
            value = value[:69] + '…'
        d.text((56, y), value, fill=TEXT, font=font(11, MONO))
        y += 17
    x = 720
    d.rounded_rectangle((x, 154, 1208, 552), radius=12, fill=PANEL, outline='#344651', width=1)
    preview = Image.open(PREVIEWS / 'dock-gate-caisson.png').convert('RGB')
    preview.thumbnail((450, 322), Image.Resampling.LANCZOS)
    im.paste(preview, (x + (488 - preview.width) // 2, 162 + (322 - preview.height) // 2))
    audit = json.loads((BUNDLE / 'quality-audit.json').read_text())
    row = next(asset for asset in audit['assets'] if asset['id'] == 'dock-gate-caisson')
    d.text((x + 18, 500), f"Default mesh preview · {row['triangles']} triangles", fill=TEXT, font=font(16, BOLD))
    d.text((x + 18, 529), 'Generated from dock-gate-caisson.kcad.ts', fill=TEAL, font=font(11, MONO))
    footer(d, 'Controls in source: scale · yard finish · structural steel · buoyancy coating')
    return im


def variant_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, '03 / edit and render', 'Change scale and the component palette', 'The local variant uses the same source with a blue hull, pale steel ribs and safety-yellow flotation.')
    cards = [
        ('Catalog default', PREVIEWS / 'dock-gate-caisson.png', 'scale 1.00 · yard finish'),
        ('Local color variant', BUNDLE / 'quality-variant.png', 'scale 1.12 · three visible zones'),
    ]
    for i, (title, path, detail) in enumerate(cards):
        x = 156 + i * 500
        d.rounded_rectangle((x, 154, x + 450, 566), radius=12, fill=PANEL, outline='#344651', width=1)
        preview = Image.open(path).convert('RGB')
        preview.thumbnail((420, 330), Image.Resampling.LANCZOS)
        im.paste(preview, (x + (450 - preview.width) // 2, 165 + (330 - preview.height) // 2))
        d.text((x + 18, 510), title, fill=TEXT, font=font(18, BOLD))
        d.text((x + 18, 540), detail, fill=TEAL, font=font(13, MONO))
    footer(d, 'Local source variant only · no deployed or operational acceptance claim')
    return im


def contact_frame(number, ids):
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, f'04 / rendered catalog previews · set {number}', f'Shipyard assets {number * 10 - 9:02d}–{number * 10:02d}', 'Each card shows the source mesh with separate material colors.')
    card_w, card_h, gap_x, gap_y, x0, y0 = 220, 244, 12, 8, 54, 154
    for i, asset_id in enumerate(ids):
        col, row = i % 5, i // 5
        x, y = x0 + col * (card_w + gap_x), y0 + row * (card_h + gap_y)
        d.rounded_rectangle((x, y, x + card_w, y + card_h), radius=9, fill=PANEL, outline='#344651', width=1)
        preview = Image.open(PREVIEWS / f'{asset_id}.png').convert('RGB')
        preview.thumbnail((card_w - 14, 178), Image.Resampling.LANCZOS)
        im.paste(preview, (x + (card_w - preview.width) // 2, y + 4 + (178 - preview.height) // 2))
        title = asset_id.replace('-', ' ').title()
        if len(title) > 31:
            title = title[:28] + '…'
        d.text((x + 7, y + 192), title, fill=TEXT, font=font(11, BOLD))
        d.text((x + 7, y + 218), 'materials · presets', fill=TEAL, font=font(9, MONO))
    footer(d, 'Rendered locally from the catalog sources; preview paths are stored in the generated index.')
    return im


def verification_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, '05 / local verification', 'Source, mesh, index, preview and page checks', 'Evidence is from this branch. Deployed behavior is not verified.')
    audit = json.loads((BUNDLE / 'quality-audit.json').read_text())
    pages = json.loads((BUNDLE / 'catalog-pages-check.json').read_text())
    tests = json.loads((BUNDLE / 'catalog-tests.json').read_text())
    index_check = json.loads((BUNDLE / 'catalog-index-check.json').read_text())
    public = json.loads((BUNDLE / 'public-check.json').read_text())
    triangles = [asset['triangles'] for asset in audit['assets']]
    index = json.loads((ROOT / 'catalog' / 'index.json').read_text())
    checks = [
        ('Generated catalog', f"{len(index['assets'])} rows · {len(index['kits'])} kits"),
        ('Existing sources and meshes', f"{audit['passed']} / {audit['expected']} pass · {min(triangles)}–{max(triangles)} tris"),
        ('Parameters and presets', '2–4 material colors · two presets per source'),
        ('Source hashes and previews', f"{index_check['shipyardAssets']} sources · {index_check['refreshedPreviews']} refreshed PNGs"),
        ('Catalog integration suite', tests['summary']),
        ('Local kit pages', f"{pages['kitPagesChecked']} detail pages + preview copies checked"),
    ]
    d.rounded_rectangle((54, 153, 1226, 538), radius=18, fill=PANEL, outline='#344651', width=2)
    y = 177
    for label, value in checks:
        d.text((82, y), label, fill=TEAL, font=font(16, BOLD))
        d.text((480, y), value, fill=TEXT, font=font(16))
        y += 48
    d.text((82, 486), f"Public site: homepage {public['homepageStatus']} · catalog route {public['catalogStatus']} · branch not deployed", fill=MUTED, font=font(14))
    footer(d, 'Local previews and validation only · deployed behavior and operational acceptance are not established.')
    return im


def main():
    index = json.loads((ROOT / 'catalog' / 'index.json').read_text())
    rows = [asset for asset in index['assets'] if asset['kit'] == 'shipyard']
    if len(rows) != 70 or {asset['id'] for asset in rows} != set(ORDER):
        raise SystemExit('expected 70 indexed shipyard assets in the recorded source order')
    if not all((PREVIEWS / f'{asset_id}.png').is_file() for asset_id in ORDER):
        raise SystemExit('render all 70 shipyard previews before capturing the demo')
    required = ['quality-audit.json', 'catalog-pages-check.json', 'catalog-tests.json', 'catalog-index-check.json', 'public-check.json', 'quality-variant.png']
    if not all((BUNDLE / name).is_file() for name in required):
        raise SystemExit('run the mesh audit, local page check, integration suite, index check, public check and variant render before capture')
    frames = [title_frame(), flow_frame(), source_frame(), variant_frame()]
    for i in range(7):
        frames.append(contact_frame(i + 1, ORDER[i * 10:(i + 1) * 10]))
    frames.append(verification_frame())
    if len(frames) != 12:
        raise SystemExit('demo must show the source workflow, seven preview sheets and verification in exactly 12 frames')
    frame_dir = BUNDLE / 'frames'
    frame_dir.mkdir(parents=True, exist_ok=True)
    for i, frame in enumerate(frames, 1):
        frame.save(frame_dir / f'frame-{i:02d}.png', optimize=True)
    video = BUNDLE / 'shipyard-quality.mp4'
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-framerate', '1/3',
        '-i', str(frame_dir / 'frame-%02d.png'), '-c:v', 'libx264', '-r', '24',
        '-pix_fmt', 'yuv420p', '-crf', '25', '-movflags', '+faststart', str(video),
    ], check=True)
    Image.open(frame_dir / 'frame-01.png').save(BUNDLE / 'poster.png', optimize=True)
    print(f'wrote {video.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
