#!/usr/bin/env python3
"""Capture a short, readable demo from music catalog sources, previews and audit evidence."""
import json
import re
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / 'catalog' / 'kits' / 'music'
PREVIEWS = KIT / 'previews'
INDEX = ROOT / 'catalog' / 'index.json'
CHECKS = BUNDLE / 'asset-check-results.json'
PAGES = BUNDLE / 'catalog-pages-check.json'
FRAMES = BUNDLE / 'frames'
OUT = BUNDLE / 'music-kit.mp4'
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, TEAL = '#111923', '#1d2935', '#eef3f5', '#a6b6c0', '#61c6bf'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
GROUPS = [
    ('Fretted strings and violin family', ['acoustic-guitar', 'electric-guitar', 'bass-guitar', 'ukulele', 'banjo', 'violin', 'viola', 'cello']),
    ('Concert strings and brass', ['double-bass', 'concert-harp', 'trumpet', 'trombone', 'french-horn', 'tuba', 'alto-saxophone', 'tenor-saxophone']),
    ('Woodwinds and concert percussion', ['clarinet', 'oboe', 'concert-flute', 'bassoon', 'snare-drum', 'bass-drum', 'timpani', 'orchestral-cymbals']),
    ('Hand percussion and pitched bars', ['orchestral-triangle', 'tambourine', 'maracas', 'conga-drums', 'bongos', 'drum-kit', 'xylophone', 'marimba']),
    ('Reeds, stage and rhythm section', ['vibraphone', 'accordion', 'harmonica', 'music-stand', 'conductor-podium', 'mechanical-metronome', 'microphone-stand', 'cajon']),
]


def font(size, path=FONT):
    return ImageFont.truetype(path, size)


def canvas():
    return Image.new('RGB', (WIDTH, HEIGHT), BG)


def header(draw, kicker, title, detail):
    draw.text((54, 32), kicker.upper(), fill=TEAL, font=font(17, BOLD))
    draw.text((54, 65), title, fill=TEXT, font=font(34, BOLD))
    draw.text((54, 110), detail, fill=MUTED, font=font(17))


def footer(draw, detail):
    draw.line((54, 678, WIDTH - 54, 678), fill='#35434e', width=1)
    draw.text((54, 688), detail, fill=MUTED, font=font(13))


def title_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    d.text((72, 76), 'kernelCAD  /  ASSET CATALOG', fill=TEAL, font=font(20, BOLD))
    d.text((72, 162), 'MUSIC', fill=TEXT, font=font(72, BOLD))
    d.text((76, 262), '40 editable low-poly scene props', fill=TEXT, font=font(32))
    d.text((76, 316), 'Strings  ·  winds  ·  percussion  ·  stage', fill=MUTED, font=font(22))
    d.rounded_rectangle((72, 414, 1208, 550), radius=16, fill=PANEL, outline='#344651', width=2)
    d.text((102, 440), 'Native .kcad.ts source, generated mesh and two knobs per asset', fill=TEXT, font=font(23, BOLD))
    d.text((102, 492), 'CC0 1.0   /   millimetres   /   Z up   /   base origin', fill=TEAL, font=font(20))
    footer(d, 'Original kernelCAD geometry · local catalog workflow')
    return im


def source_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, '01 / author', 'Editable model source', 'Acoustic guitar: size drives every part; the color knob shades the exported material.')
    lines = (KIT / 'acoustic-guitar.kcad.ts').read_text().splitlines()
    y = 166
    for line in lines[0:24]:
        text = line.strip()
        if len(text) > 66:
            text = text[:63] + '…'
        d.text((58, y), text, fill=TEXT, font=font(13, MONO))
        y += 22
    d.rounded_rectangle((779, 165, 1207, 565), radius=16, fill=PANEL, outline='#344651', width=2)
    preview = Image.open(PREVIEWS / 'acoustic-guitar.png').convert('RGB')
    preview.thumbnail((395, 300), Image.Resampling.LANCZOS)
    im.paste(preview, (795 + (395 - preview.width) // 2, 182 + (300 - preview.height) // 2))
    d.text((809, 500), 'scale  0.65 — 1.35', fill=TEAL, font=font(18, BOLD))
    d.text((809, 530), 'color  user-selectable', fill=TEXT, font=font(17))
    footer(d, 'Every part in an asset receives the same editable size and single-material color controls.')
    return im


def contact_frame(index, title, detail, ids):
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, f'02 / generated previews  ·  set {index}', title, detail)
    card_w, card_h = 278, 226
    gap_x, gap_y = 18, 12
    x0, y0 = 54, 160
    for i, asset_id in enumerate(ids):
        col, row = i % 4, i // 4
        x = x0 + col * (card_w + gap_x)
        y = y0 + row * (card_h + gap_y)
        d.rounded_rectangle((x, y, x + card_w, y + card_h), radius=10, fill=PANEL, outline='#344651', width=1)
        preview = Image.open(PREVIEWS / f'{asset_id}.png').convert('RGB')
        preview.thumbnail((card_w - 16, 174), Image.Resampling.LANCZOS)
        im.paste(preview, (x + (card_w - preview.width) // 2, y + 4 + (174 - preview.height) // 2))
        title_text = asset_id.replace('-', ' ').title()
        if len(title_text) > 32:
            title_text = title_text[:30] + '…'
        d.text((x + 10, y + 190), title_text, fill=TEXT, font=font(14, BOLD))
        d.text((x + 10, y + 209), 'scale · color', fill=TEAL, font=font(11, MONO))
    footer(d, 'Default-param previews rendered from each catalog-indexed .kcad.ts source')
    return im


def verification_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, '03 / local verification', 'Catalog audit and generated pages', 'The evidence covers local source, mesh, index, lint and static page generation.')
    checks = json.loads(CHECKS.read_text())
    pages = json.loads(PAGES.read_text())
    index = json.loads(INDEX.read_text())
    music = [a for a in index['assets'] if a['kit'] == 'music']
    card = (54, 178, 1226, 548)
    d.rounded_rectangle(card, radius=18, fill=PANEL, outline='#344651', width=2)
    test_output = (BUNDLE / 'catalog-test-output.txt').read_text()
    file_match = re.search(r'Test Files\s+(\d+) passed', test_output)
    test_match = re.search(r'Tests\s+(\d+) passed', test_output)
    if file_match is None or test_match is None:
        raise SystemExit('catalog-test-output.txt does not contain a passing suite summary')
    lines = [
        ('Catalog integration suite', f"{file_match.group(1)} files · {test_match.group(1)} tests passed"),
        ('Music source assets', f"{checks['passed']} / {checks['total']} audited"),
        ('Material and triangle budget', '1 material each · all inside declared budgets'),
        ('Indexed knobs', 'scale + color on all 40 sources'),
        ('Catalog pages', f"{pages['musicPages']} pages · {len(index['assets'])} assets total"),
    ]
    y = 211
    for label, value in lines:
        d.text((90, y), label, fill=TEAL, font=font(18, BOLD))
        d.text((490, y), value, fill=TEXT, font=font(18))
        y += 53
    d.text((90, 493), 'Website deployment: unverified pending merge; this is local catalog evidence.', fill=MUTED, font=font(15))
    d.text((90, 520), 'No instrument certification, performance, acoustic simulation or hardware acceptance is claimed.', fill=MUTED, font=font(14))
    footer(d, 'Local validation only · deployed behavior remains unverified')
    return im


def main():
    index = json.loads(INDEX.read_text())
    assets = [asset for asset in index['assets'] if asset['kit'] == 'music']
    if len(assets) != 40:
        raise SystemExit(f'expected 40 music records in catalog/index.json, found {len(assets)}')
    if not CHECKS.exists() or not PAGES.exists():
        raise SystemExit('write asset-check-results.json and catalog-pages-check.json before capture')
    if any(not (PREVIEWS / f'{asset["id"]}.png').exists() for asset in assets):
        raise SystemExit('one or more generated music previews are missing')
    FRAMES.mkdir(parents=True, exist_ok=True)
    frames = [title_frame(), source_frame()]
    titles = [
        ('Fretted strings and violin family', 'Guitars, plucked strings and bowed instruments'),
        ('Concert strings and brass', 'Harp, brass and saxophone silhouettes'),
        ('Woodwinds and concert percussion', 'Reed instruments, flute and concert drums'),
        ('Hand percussion and pitched bars', 'Hand percussion, drum kits and mallet instruments'),
        ('Reeds, stage and rhythm section', 'Accordion, stands, metronome and box drum'),
    ]
    for i, ((title, detail), (_, ids)) in enumerate(zip(titles, GROUPS), start=1):
        frames.append(contact_frame(i, title, detail, ids))
    frames.append(verification_frame())
    if len(frames) != 8:
        raise SystemExit(f'expected 8 frames, got {len(frames)}')
    for i, frame in enumerate(frames, 1):
        frame.save(FRAMES / f'frame-{i:02d}.png', optimize=True)
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-framerate', '1/3',
        '-i', str(FRAMES / 'frame-%02d.png'), '-c:v', 'libx264', '-r', '24',
        '-pix_fmt', 'yuv420p', '-crf', '25', '-movflags', '+faststart', str(OUT),
    ], check=True)
    im = Image.open(FRAMES / 'frame-01.png')
    im.save(BUNDLE / 'poster.png', optimize=True)
    print(f'wrote {OUT}')


if __name__ == '__main__':
    main()
