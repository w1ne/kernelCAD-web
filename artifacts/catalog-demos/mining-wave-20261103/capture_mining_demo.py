#!/usr/bin/env python3
"""Create a short local workflow demo from mining sources and real previews."""
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / 'catalog' / 'kits' / 'mining'
PREVIEWS = KIT / 'previews'
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, OCHRE = '#111923', '#1d2935', '#eef3f5', '#a6b6c0', '#e2af57'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'


def font(size, path=FONT):
    return ImageFont.truetype(path, size)


def canvas():
    return Image.new('RGB', (WIDTH, HEIGHT), BG)


def header(draw, kicker, title, detail):
    draw.text((54, 28), kicker.upper(), fill=OCHRE, font=font(16, BOLD))
    draw.text((54, 57), title, fill=TEXT, font=font(31, BOLD))
    draw.text((54, 101), detail, fill=MUTED, font=font(16))


def footer(draw, detail):
    draw.line((54, 678, WIDTH - 54, 678), fill='#35434e', width=1)
    draw.text((54, 688), detail, fill=MUTED, font=font(12))


def title_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    draw.text((72, 68), 'kernelCAD  /  ASSET CATALOG', fill=OCHRE, font=font(20, BOLD))
    draw.text((72, 145), 'MINING & MINERAL PROCESSING', fill=TEXT, font=font(48, BOLD))
    draw.text((76, 230), '50 editable low-poly underground, surface, and process-plant props', fill=TEXT, font=font(23))
    draw.text((76, 282), 'Extraction  ·  crushing  ·  screening  ·  separation  ·  dewatering', fill=MUTED, font=font(18))
    draw.rounded_rectangle((72, 390, 1208, 545), radius=16, fill=PANEL, outline='#344651', width=2)
    draw.text((100, 420), 'Native .kcad.ts models with scale and color knobs', fill=TEXT, font=font(23, BOLD))
    draw.text((100, 478), 'CC0 1.0   /   millimetres   /   Z up   /   base origin', fill=OCHRE, font=font(19))
    footer(draw, 'Original kernelCAD geometry · local catalog workflow')
    return image


def source_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, '01 / author', 'A real parametric source model', 'Jaw crusher: scale changes dimensions; color is an editable single palette.')
    source = (KIT / 'jaw-crusher-module.kcad.ts').read_text().splitlines()
    y = 145
    for line in source[:25]:
        value = line.strip()
        if len(value) > 69:
            value = value[:66] + '…'
        draw.text((58, y), value, fill=TEXT, font=font(12, MONO))
        y += 19
    draw.rounded_rectangle((790, 150, 1210, 570), radius=16, fill=PANEL, outline='#344651', width=2)
    preview = Image.open(PREVIEWS / 'jaw-crusher-module.png').convert('RGB')
    preview.thumbnail((388, 315), Image.Resampling.LANCZOS)
    image.paste(preview, (801 + (388 - preview.width) // 2, 165 + (315 - preview.height) // 2))
    draw.text((825, 500), 'scale  0.70 — 1.30', fill=OCHRE, font=font(17, BOLD))
    draw.text((825, 531), 'color  user-selectable', fill=TEXT, font=font(16))
    footer(draw, 'The generated index records preview URL, source hash, knobs, and measured mesh stats.')
    return image


def contact_frame(group_number, title, assets):
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, f'02 / generated previews · set {group_number}', title, 'Default-parameter mesh previews rendered from the indexed .kcad.ts sources.')
    card_w, card_h, gap_x, gap_y, x0, y0 = 276, 235, 12, 8, 54, 155
    for index, asset in enumerate(assets):
        col, row = index % 4, index // 4
        x, y = x0 + col * (card_w + gap_x), y0 + row * (card_h + gap_y)
        draw.rounded_rectangle((x, y, x + card_w, y + card_h), radius=9, fill=PANEL, outline='#344651', width=1)
        preview = Image.open(PREVIEWS / f"{asset['id']}.png").convert('RGB')
        preview.thumbnail((card_w - 16, 178), Image.Resampling.LANCZOS)
        image.paste(preview, (x + (card_w - preview.width) // 2, y + 4 + (178 - preview.height) // 2))
        label = asset['title']
        if len(label) > 32:
            label = label[:29] + '…'
        draw.text((x + 8, y + 190), label, fill=TEXT, font=font(12, BOLD))
        draw.text((x + 8, y + 211), 'scale · color', fill=OCHRE, font=font(10, MONO))
    footer(draw, 'Original low-poly scene props; rendered locally from their source models.')
    return image


def verification_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, '03 / local verification', 'Catalog audit and local pages', 'Source, index, meshes, preview paths, lint, integration suite, and local pages checked.')
    checks = json.loads((BUNDLE / 'asset-check-results.json').read_text())
    preview_check = json.loads((BUNDLE / 'index-preview-check.json').read_text())
    pages = json.loads((BUNDLE / 'catalog-pages-check.json').read_text())
    lines = [
        ('Mining sources and meshes', f"{checks['passed']} / {checks['total']} audited · {checks['catalogTotal']} total"),
        ('Triangle/material gate', f"{checks['triangleRange'][0]}–{checks['triangleRange'][1]} tris · one material each"),
        ('Knobs and previews', f"scale + color · {preview_check['assetsWithPreviewField']} indexed preview paths"),
        ('Catalog integration suite', f"{checks['integration']['filesPassed']} files · {checks['integration']['testsPassed']} tests passed"),
        ('Local generated pages', f"{pages['pageAndPreviewPairs']} mining pages · hub lists kit"),
    ]
    draw.rounded_rectangle((54, 165, 1226, 500), radius=18, fill=PANEL, outline='#344651', width=2)
    y = 190
    for label, value in lines:
        draw.text((84, y), label, fill=OCHRE, font=font(17, BOLD))
        draw.text((540, y), value, fill=TEXT, font=font(16))
        y += 50
    live = json.loads((BUNDLE / 'live-website-check.json').read_text())
    draw.text((84, 470), f"Current live rail: {live['assetsWithPreview']} previews; this branch is not deployed.", fill=MUTED, font=font(14))
    footer(draw, 'Local validation only · no deployed behavior, operating-performance, or physical-acceptance claims.')
    return image


def main():
    index = json.loads((ROOT / 'catalog' / 'index.json').read_text())
    assets = [asset for asset in index['assets'] if asset['kit'] == 'mining']
    if len(assets) != 50 or not all((PREVIEWS / f"{asset['id']}.png").is_file() for asset in assets):
        raise SystemExit('expected all 50 catalog assets and rendered previews before capture')
    required = [
        'asset-check-results.json', 'index-preview-check.json', 'catalog-pages-check.json',
        'catalog-test-output.txt', 'live-website-check.json', 'catalog-eslint.json',
    ]
    if not all((BUNDLE / name).is_file() for name in required):
        raise SystemExit('run catalog, lint, page, and live-site checks before capture')
    frames = [title_frame(), source_frame()]
    groups = [(f'Catalog preview set {i // 8 + 1}', assets[i:i + 8]) for i in range(0, len(assets), 8)]
    frames.extend(contact_frame(i, title, group) for i, (title, group) in enumerate(groups, 1))
    frames.append(verification_frame())
    if len(frames) != 10 or sum(len(group) for _, group in groups) != 50:
        raise SystemExit('demo must cover all 50 assets in exactly 10 frames')
    frame_dir = BUNDLE / 'frames'
    frame_dir.mkdir(parents=True, exist_ok=True)
    for i, frame in enumerate(frames, 1):
        frame.save(frame_dir / f'frame-{i:02d}.png', optimize=True)
    output = BUNDLE / 'mining-kit.mp4'
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-framerate', '1/3',
        '-i', str(frame_dir / 'frame-%02d.png'), '-c:v', 'libx264', '-r', '24',
        '-pix_fmt', 'yuv420p', '-crf', '25', '-movflags', '+faststart', str(output),
    ], check=True)
    Image.open(frame_dir / 'frame-01.png').save(BUNDLE / 'poster.png', optimize=True)
    print(f'wrote {output}')


if __name__ == '__main__':
    main()
