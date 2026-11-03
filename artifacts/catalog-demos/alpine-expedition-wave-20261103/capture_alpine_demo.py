#!/usr/bin/env python3
"""Create a readable 30-second local workflow demo from sources and previews."""
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / 'catalog' / 'kits' / 'alpine-expedition'
PREVIEWS = KIT / 'previews'
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, ICE = '#101922', '#1b2a34', '#eef3f5', '#aabac1', '#8ad9dd'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'


def font(size, path=FONT):
    return ImageFont.truetype(path, size)


def canvas():
    return Image.new('RGB', (WIDTH, HEIGHT), BG)


def header(draw, kicker, title, detail):
    draw.text((54, 26), kicker.upper(), fill=ICE, font=font(15, BOLD))
    draw.text((54, 54), title, fill=TEXT, font=font(29, BOLD))
    draw.text((54, 98), detail, fill=MUTED, font=font(15))


def footer(draw, detail):
    draw.line((54, 678, WIDTH - 54, 678), fill='#354751', width=1)
    draw.text((54, 688), detail, fill=MUTED, font=font(11))


def title_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    draw.text((72, 65), 'kernelCAD  /  ASSET CATALOG', fill=ICE, font=font(20, BOLD))
    draw.text((72, 140), 'ALPINE EXPEDITION', fill=TEXT, font=font(45, BOLD))
    draw.text((76, 218), '50 original low-poly mountaineering scene props', fill=TEXT, font=font(22))
    draw.text((76, 266), 'Shelter  ·  climbing  ·  snow travel  ·  rescue  ·  field equipment', fill=MUTED, font=font(17))
    draw.rounded_rectangle((72, 365, 1208, 536), radius=16, fill=PANEL, outline='#344a55', width=2)
    draw.text((100, 396), 'Editable kernelCAD source with scale and color controls', fill=TEXT, font=font(22, BOLD))
    draw.text((100, 455), 'CC0 1.0   /   millimetres   /   Z up   /   one material per asset', fill=ICE, font=font(18))
    footer(draw, 'Original generic scene geometry · local catalog workflow · no equipment rating claim')
    return image


def source_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, '01 / source to mesh', 'A parametric shelter model', 'Native .kcad.ts source and its generated default-value preview.')
    lines = (KIT / 'basecamp-dome-tent.kcad.ts').read_text().splitlines()
    y = 143
    for line in lines[:27]:
        value = line.strip()
        if len(value) > 68:
            value = value[:65] + '…'
        draw.text((58, y), value, fill=TEXT, font=font(11, MONO))
        y += 18
    draw.rounded_rectangle((790, 145, 1215, 570), radius=16, fill=PANEL, outline='#344a55', width=2)
    preview = Image.open(PREVIEWS / 'basecamp-dome-tent.png').convert('RGB')
    preview.thumbnail((395, 310), Image.Resampling.LANCZOS)
    image.paste(preview, (805 + (395 - preview.width) // 2, 160 + (310 - preview.height) // 2))
    draw.text((827, 495), 'scale  0.75 — 1.25', fill=ICE, font=font(16, BOLD))
    draw.text((827, 527), 'color  user-selectable', fill=TEXT, font=font(15))
    footer(draw, 'The generated index records source hash, knobs, mesh stats, and the preview path.')
    return image


def contact_frame(number, assets):
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, f'02 / rendered asset previews · set {number}', f'Alpine expedition preview set {number}', 'Default-parameter meshes rendered from indexed .kcad.ts sources.')
    card_w, card_h, gap_x, gap_y, x0, y0 = 276, 235, 12, 8, 54, 150
    for i, asset in enumerate(assets):
        col, row = i % 4, i // 4
        x, y = x0 + col * (card_w + gap_x), y0 + row * (card_h + gap_y)
        draw.rounded_rectangle((x, y, x + card_w, y + card_h), radius=9, fill=PANEL, outline='#344a55', width=1)
        preview = Image.open(PREVIEWS / f"{asset['id']}.png").convert('RGB')
        preview.thumbnail((card_w - 16, 174), Image.Resampling.LANCZOS)
        image.paste(preview, (x + (card_w - preview.width) // 2, y + 3 + (174 - preview.height) // 2))
        label = asset['title']
        if len(label) > 31:
            label = label[:28] + '…'
        draw.text((x + 8, y + 183), label, fill=TEXT, font=font(11, BOLD))
        draw.text((x + 8, y + 207), 'scale · color', fill=ICE, font=font(10, MONO))
    footer(draw, 'Stylized props for scene composition · not rated or suitable for safety decisions.')
    return image


def verification_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, '03 / local verification', 'Catalog audit and handoff', 'Source, index, mesh, preview, integration, page, package, and video checks.')
    mesh = json.loads((BUNDLE / 'asset-check-results.json').read_text())
    previews = json.loads((BUNDLE / 'index-preview-check.json').read_text())
    pages = json.loads((BUNDLE / 'catalog-pages-check.json').read_text())
    tests = json.loads((BUNDLE / 'catalog-tests.json').read_text())
    package = json.loads((BUNDLE / 'npm-pack-contents-check.json').read_text())
    live = json.loads((BUNDLE / 'live-website-check.json').read_text())
    checks = [
        ('Assets in branch index', f"{mesh['total']} new · {mesh['catalogTotal']} total"),
        ('Preview paths and PNGs', f"{previews['assetsWithPreviewField']} indexed · {previews['previewFiles']} files"),
        ('Mesh gate', f"{mesh['triangleRange'][0]}–{mesh['triangleRange'][1]} tris · one material · Z=0"),
        ('Knobs and catalog suite', f"scale + color · {tests['testFilesPassed']}/{tests['testFilesTotal']} files · {tests['testsPassed']} tests"),
        ('Local catalog pages', f"{pages['pageAndPreviewPairs']} page/preview pairs · hub lists kit"),
        ('Built npm artifact', f"{package['alpineSources']} sources + {package['alpinePreviews']} previews · package.json export only"),
    ]
    draw.rounded_rectangle((54, 145, 1226, 520), radius=18, fill=PANEL, outline='#344a55', width=2)
    y = 168
    for label, value in checks:
        draw.text((82, y), label, fill=ICE, font=font(15, BOLD))
        draw.text((475, y), value, fill=TEXT, font=font(14))
        y += 48
    draw.text((82, 474), f"Live homepage snapshot: {live['livePreviewAssets']} previews; this branch is not deployed.", fill=MUTED, font=font(13))
    footer(draw, 'Local validation only · no deployment, field performance, safety rating, or physical acceptance claim.')
    return image


def main():
    index = json.loads((ROOT / 'catalog' / 'index.json').read_text())
    assets = [asset for asset in index['assets'] if asset['kit'] == 'alpine-expedition']
    if len(assets) != 50 or not all((PREVIEWS / f"{asset['id']}.png").is_file() for asset in assets):
        raise SystemExit('expected 50 indexed assets with rendered previews')
    required = [
        'asset-check-results.json', 'index-preview-check.json', 'catalog-pages-check.json',
        'catalog-tests.json', 'live-website-check.json', 'npm-pack-contents-check.json',
    ]
    if not all((BUNDLE / name).is_file() for name in required):
        raise SystemExit('complete local source, audit, page, live, and package checks first')
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
    output = BUNDLE / 'alpine-expedition-kit.mp4'
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-framerate', '1/3',
        '-i', str(frame_dir / 'frame-%02d.png'), '-c:v', 'libx264', '-r', '24',
        '-pix_fmt', 'yuv420p', '-crf', '25', '-movflags', '+faststart', str(output),
    ], check=True)
    Image.open(frame_dir / 'frame-01.png').save(BUNDLE / 'poster.png', optimize=True)
    print(f'wrote {output}')


if __name__ == '__main__':
    main()
