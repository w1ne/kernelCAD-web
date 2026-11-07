#!/usr/bin/env python3
"""Create a readable 30-second demo from native sources and rendered previews."""
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / 'catalog' / 'kits' / 'ev-charging-infrastructure'
PREVIEWS = KIT / 'previews'
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, CYAN = '#101a22', '#1d2b35', '#edf3f5', '#aabac1', '#67d6cf'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'


def font(size, path=FONT):
    return ImageFont.truetype(path, size)


def canvas():
    return Image.new('RGB', (WIDTH, HEIGHT), BG)


def header(draw, kicker, title, detail):
    draw.text((54, 28), kicker.upper(), fill=CYAN, font=font(16, BOLD))
    draw.text((54, 57), title, fill=TEXT, font=font(31, BOLD))
    draw.text((54, 101), detail, fill=MUTED, font=font(16))


def footer(draw, detail):
    draw.line((54, 678, WIDTH - 54, 678), fill='#354751', width=1)
    draw.text((54, 688), detail, fill=MUTED, font=font(12))


def title_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    draw.text((72, 68), 'kernelCAD  /  ASSET CATALOG', fill=CYAN, font=font(20, BOLD))
    draw.text((72, 145), 'EV CHARGING INFRASTRUCTURE', fill=TEXT, font=font(42, BOLD))
    draw.text((76, 230), '50 generic, parametric charging-site scene props', fill=TEXT, font=font(23))
    draw.text((76, 282), 'AC and DC units  ·  connectors  ·  site power  ·  fleet equipment', fill=MUTED, font=font(18))
    draw.rounded_rectangle((72, 390, 1208, 545), radius=16, fill=PANEL, outline='#344a55', width=2)
    draw.text((100, 420), 'Editable .kcad.ts sources with scale and color controls', fill=TEXT, font=font(23, BOLD))
    draw.text((100, 478), 'CC0 1.0   /   millimetres   /   Z up   /   base origin', fill=CYAN, font=font(19))
    footer(draw, 'Original generic kernelCAD geometry · local catalog workflow')
    return image


def source_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    selected = 'compact-dc-fast-charger'
    row = next(item for item in json.loads((ROOT / 'catalog' / 'index.json').read_text())['assets'] if item['id'] == selected)
    header(draw, '01 / author', 'A parametric charger model', 'Its source declares the previewed mesh, scale range, color knob, and catalog metadata.')
    lines = (ROOT / row['source']).read_text().splitlines()
    y = 148
    for line in lines[:27]:
        value = line.strip()
        if len(value) > 76:
            value = value[:73] + '…'
        draw.text((58, y), value, fill=TEXT, font=font(12, MONO))
        y += 18
    draw.rounded_rectangle((810, 150, 1210, 565), radius=16, fill=PANEL, outline='#344a55', width=2)
    preview = Image.open(PREVIEWS / f'{selected}.png').convert('RGB')
    preview.thumbnail((380, 305), Image.Resampling.LANCZOS)
    image.paste(preview, (820 + (380 - preview.width) // 2, 164 + (305 - preview.height) // 2))
    draw.text((840, 485), 'scale  0.70 — 1.30', fill=CYAN, font=font(16, BOLD))
    draw.text((840, 516), 'color  user-selectable', fill=TEXT, font=font(15))
    draw.text((840, 540), f"{row['stats']['triangles']} triangles · {row['stats']['materials']} material", fill=MUTED, font=font(14))
    footer(draw, 'Index ties each source hash, parameter list, mesh stats, and preview path together.')
    return image


def contact_frame(number, assets):
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, f'02 / rendered asset previews · set {number}', f'EV charging preview set {number}', 'Default-parameter meshes rendered locally from indexed .kcad.ts sources.')
    card_w, card_h, gap_x, gap_y, x0, y0 = 278, 236, 10, 10, 54, 151
    for i, asset in enumerate(assets):
        col, row = i % 4, i // 4
        x, y = x0 + col * (card_w + gap_x), y0 + row * (card_h + gap_y)
        draw.rounded_rectangle((x, y, x + card_w, y + card_h), radius=9, fill=PANEL, outline='#344a55', width=1)
        preview = Image.open(PREVIEWS / f"{asset['id']}.png").convert('RGB')
        preview.thumbnail((card_w - 12, 172), Image.Resampling.LANCZOS)
        image.paste(preview, (x + (card_w - preview.width) // 2, y + 4 + (172 - preview.height) // 2))
        label = asset['title']
        if len(label) > 32:
            label = label[:29] + '…'
        draw.text((x + 8, y + 185), label, fill=TEXT, font=font(12, BOLD))
        draw.text((x + 8, y + 208), 'scale · color', fill=CYAN, font=font(10, MONO))
    footer(draw, 'Generic scene props; no engineering, charging-performance, or safety claim.')
    return image


def verification_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, '03 / local verification', 'Catalog audit and local pages', 'Source, index, mesh, preview, lint, integration, package, and page checks.')
    checks = json.loads((BUNDLE / 'asset-check-results.json').read_text())
    previews = json.loads((BUNDLE / 'index-preview-check.json').read_text())
    pages = json.loads((BUNDLE / 'catalog-pages-check.json').read_text())
    package = json.loads((BUNDLE / 'npm-pack-contents-check.json').read_text())
    rows = [
        ('New sources and meshes', f"{checks['passed']} / {checks['total']} audited · {checks['catalogTotal']} total"),
        ('Triangle/material gate', f"{checks['triangleRange'][0]}–{checks['triangleRange'][1]} tris · one material each"),
        ('Knobs and preview URLs', f"scale + color · {previews['assetsWithPreviewField']} indexed paths"),
        ('Catalog integration', f"{checks['integration']['filesPassed']} files · {checks['integration']['testsPassed']} tests passed"),
        ('Local pages and npm pack', f"{pages['pagePreviewPairs']} pages · {package['packedFileCount']} package files"),
    ]
    draw.rounded_rectangle((54, 165, 1226, 500), radius=18, fill=PANEL, outline='#344a55', width=2)
    y = 190
    for label, value in rows:
        draw.text((84, y), label, fill=CYAN, font=font(17, BOLD))
        draw.text((540, y), value, fill=TEXT, font=font(16))
        y += 50
    live = json.loads((BUNDLE / 'live-website-check.json').read_text())
    draw.text((84, 470), f"Current public rail: {live['livePreviewAssets']} previews; this branch is not deployed.", fill=MUTED, font=font(14))
    footer(draw, 'Local validation only · no electrical, safety, or physical-acceptance claim.')
    return image


def main():
    index = json.loads((ROOT / 'catalog' / 'index.json').read_text())
    assets = [asset for asset in index['assets'] if asset['kit'] == 'ev-charging-infrastructure']
    if len(assets) != 50 or not all((PREVIEWS / f"{asset['id']}.png").is_file() for asset in assets):
        raise SystemExit('expected 50 indexed assets with rendered previews')
    required = ['asset-check-results.json', 'index-preview-check.json', 'catalog-pages-check.json', 'catalog-test-output.txt', 'live-website-check.json', 'catalog-eslint.json', 'npm-pack-contents-check.json']
    if not all((BUNDLE / name).is_file() for name in required):
        raise SystemExit('complete source, page, live, lint, test, and package checks first')
    frames = [title_frame(), source_frame()]
    groups = [assets[i:i + 8] for i in range(0, len(assets), 8)]
    frames.extend(contact_frame(i + 1, group) for i, group in enumerate(groups))
    frames.append(verification_frame())
    if len(frames) != 10 or sum(map(len, groups)) != 50:
        raise SystemExit('demo must cover all 50 assets in exactly 10 frames')
    frame_dir = BUNDLE / 'frames'
    frame_dir.mkdir(parents=True, exist_ok=True)
    for i, frame in enumerate(frames, 1):
        frame.save(frame_dir / f'frame-{i:02d}.png', optimize=True)
    output = BUNDLE / 'ev-charging-infrastructure.mp4'
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-framerate', '1/3',
        '-i', str(frame_dir / 'frame-%02d.png'), '-c:v', 'libx264', '-r', '24',
        '-pix_fmt', 'yuv420p', '-crf', '25', '-movflags', '+faststart', str(output),
    ], check=True)
    Image.open(frame_dir / 'frame-01.png').save(BUNDLE / 'poster.png', optimize=True)
    print(f'wrote {output}')


if __name__ == '__main__':
    main()
