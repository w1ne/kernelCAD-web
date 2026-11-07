#!/usr/bin/env python3
"""Capture the authored sports kit, generated previews and local audit result."""
import json
import subprocess
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
PREVIEWS = ROOT / 'catalog' / 'kits' / 'sports' / 'previews'
INDEX = ROOT / 'catalog' / 'index.json'
CHECKS = BUNDLE / 'asset-check-results.json'
PAGES = BUNDLE / 'catalog-pages-check.json'
FRAMES = BUNDLE / 'frames'
OUT = BUNDLE / 'sports-kit.mp4'
WIDTH, HEIGHT = 1280, 720
BG = '#111923'
PANEL = '#1d2935'
TEXT = '#eef3f5'
MUTED = '#a6b6c0'
TEAL = '#61c6bf'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'

GROUPS = [
    ('Balls and goal frames', ['basketball', 'basketball-hoop', 'soccer-ball', 'soccer-goal', 'american-football', 'baseball', 'baseball-bat', 'baseball-glove']),
    ('Court and racket gear', ['batting-helmet', 'tennis-racket', 'tennis-ball', 'tennis-net', 'volleyball', 'volleyball-net', 'badminton-racket', 'shuttlecock']),
    ('Bat, stick and board sports', ['cricket-bat', 'cricket-wicket', 'hockey-stick', 'hockey-puck', 'lacrosse-stick', 'golf-club', 'golf-bag', 'skateboard']),
    ('Strength and mobility', ['inline-skate', 'jump-rope', 'dumbbell', 'kettlebell', 'barbell', 'weight-plate', 'yoga-mat', 'yoga-block']),
    ('Training and awards', ['exercise-ball', 'foam-roller', 'gym-bench', 'treadmill', 'starting-block', 'track-hurdle', 'sports-water-bottle', 'trophy-cup']),
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
    d.text((72, 162), 'SPORTS', fill=TEXT, font=font(72, BOLD))
    d.text((76, 262), '40 editable low-poly scene props', fill=TEXT, font=font(32))
    d.text((76, 316), 'Court  ·  field  ·  racket  ·  fitness  ·  awards', fill=MUTED, font=font(22))
    d.rounded_rectangle((72, 414, 1208, 550), radius=16, fill=PANEL, outline='#344651', width=2)
    d.text((102, 440), 'Native .kcad.ts source, generated mesh and two knobs per asset', fill=TEXT, font=font(23, BOLD))
    d.text((102, 492), 'CC0 1.0   /   millimetres   /   Z up   /   base origin', fill=TEAL, font=font(20))
    footer(d, 'Original kernelCAD geometry · local catalog workflow')
    return im


def source_frame(assets):
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, '01 / author', 'Editable model source', 'Basketball hoop source: two controls drive the same generated geometry and material.')
    source_path = ROOT / 'catalog' / 'kits' / 'sports' / 'basketball-hoop.kcad.ts'
    source = source_path.read_text().splitlines()
    wanted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
    y = 162
    for number in wanted:
        line = source[number - 1] if number <= len(source) else ''
        shown = textwrap.shorten(line.strip(), width=71, placeholder=' …')
        d.text((58, y), shown, fill=TEXT, font=font(13, MONO))
        y += 25
    d.rounded_rectangle((774, 168, 1207, 568), radius=16, fill=PANEL, outline='#344651', width=2)
    asset = next(a for a in assets if a['id'] == 'basketball-hoop')
    preview = Image.open(PREVIEWS / (asset['id'] + '.png')).convert('RGB')
    preview.thumbnail((395, 300), Image.Resampling.LANCZOS)
    im.paste(preview, (793 + (395 - preview.width) // 2, 187 + (300 - preview.height) // 2))
    d.text((805, 500), 'scale  0.65 — 1.35', fill=TEAL, font=font(18, BOLD))
    d.text((805, 530), 'color  user-selectable', fill=TEXT, font=font(17))
    footer(d, 'The scale knob changes geometry; color changes the single exported material.')
    return im


def contact_frame(index, title, detail, ids, rows_by_id):
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, f'02 / generated previews  ·  set {index}', title, detail)
    card_w, card_h = 278, 226
    gap_x, gap_y = 18, 12
    x0, y0 = 54, 160
    for i, asset_id in enumerate(ids):
        asset = rows_by_id[asset_id]
        col, row = i % 4, i // 4
        x = x0 + col * (card_w + gap_x)
        y = y0 + row * (card_h + gap_y)
        d.rounded_rectangle((x, y, x + card_w, y + card_h), radius=10, fill=PANEL, outline='#344651', width=1)
        preview = Image.open(PREVIEWS / (asset_id + '.png')).convert('RGB')
        preview.thumbnail((card_w - 16, 174), Image.Resampling.LANCZOS)
        px = x + (card_w - preview.width) // 2
        py = y + 4 + (174 - preview.height) // 2
        im.paste(preview, (px, py))
        label = asset['title']
        if len(label) > 32:
            label = label[:30] + '…'
        d.text((x + 10, y + 189), label, fill=TEXT, font=font(15, BOLD))
        d.text((x + 10, y + 208), 'scale · color', fill=TEAL, font=font(11, MONO))
    footer(d, 'Default-param GLB previews rendered from each committed .kcad.ts source')
    return im


def verification_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, '03 / local verification', 'Catalog audit and generated pages', 'The claims here are limited to local source, mesh, index and page generation.')
    checks = json.loads(CHECKS.read_text())
    pages = json.loads(PAGES.read_text())
    index = json.loads(INDEX.read_text())
    sports = [a for a in index['assets'] if a['kit'] == 'sports']
    card = (54, 178, 1226, 548)
    d.rounded_rectangle(card, radius=18, fill=PANEL, outline='#344651', width=2)
    lines = [
        ('Sports sources and exports', f"{checks['passed']} / {checks['total']} passed"),
        ('Material and mesh budget', '1 material each · all inside budget'),
        ('Index knobs', 'scale + color on every sports asset'),
        ('Catalog index', f"{len(sports)} sports / {len(index['assets'])} total assets"),
        ('Generated static pages', f"{pages['sportsPages']} sports pages with previews"),
    ]
    y = 211
    for label, value in lines:
        d.text((90, y), label, fill=TEAL, font=font(18, BOLD))
        d.text((490, y), value, fill=TEXT, font=font(18))
        y += 53
    d.text((90, 493), 'Live /catalog/ check: HTTP 404 · this branch is not deployed.', fill=MUTED, font=font(16))
    d.text((90, 520), 'No simulation, sporting certification or hardware acceptance is claimed.', fill=MUTED, font=font(15))
    footer(d, 'Local validation only · deployed behavior remains unverified')
    return im


def main():
    index = json.loads(INDEX.read_text())
    assets = [a for a in index['assets'] if a['kit'] == 'sports']
    if len(assets) != 40:
        raise SystemExit(f'expected 40 sports records in catalog/index.json, found {len(assets)}')
    if not CHECKS.exists() or not PAGES.exists():
        raise SystemExit('write asset-check-results.json and catalog-pages-check.json before capture')
    rows_by_id = {a['id']: a for a in assets}
    if any(not (PREVIEWS / f'{a["id"]}.png').exists() for a in assets):
        raise SystemExit('one or more generated sports previews are missing')
    FRAMES.mkdir(parents=True, exist_ok=True)
    frames = [title_frame(), source_frame(assets)]
    titles = [
        ('Balls and goals', 'Court, field and ball silhouettes'),
        ('Court and racket gear', 'Nets, rackets and shuttlecock'),
        ('Bat, stick and board sports', 'Cricket, hockey, golf and skating'),
        ('Strength and mobility', 'Free weights, mat and training aids'),
        ('Training and awards', 'Cardio, track, hydration and trophy'),
    ]
    for i, ((title, detail), (_, ids)) in enumerate(zip(titles, GROUPS), start=1):
        frames.append(contact_frame(i, title, detail, ids, rows_by_id))
    frames.append(verification_frame())
    if len(frames) != 8:
        raise SystemExit(f'expected 8 frames, got {len(frames)}')
    for i, frame in enumerate(frames, 1):
        frame.save(FRAMES / f'frame-{i:02d}.png', optimize=True)
    command = [
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-framerate', '1/3',
        '-i', str(FRAMES / 'frame-%02d.png'), '-c:v', 'libx264', '-r', '24',
        '-pix_fmt', 'yuv420p', '-crf', '25', '-movflags', '+faststart', str(OUT),
    ]
    subprocess.run(command, check=True)
    print(f'wrote {OUT} with {len(frames)} frames and {len(assets)} assets')


if __name__ == '__main__':
    main()
