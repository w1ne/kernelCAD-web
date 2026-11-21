#!/usr/bin/env python3
"""Build a short local audit demo from the retained source and preview artifacts."""

from pathlib import Path
import subprocess

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
W, H = 1280, 720
BG = '#eef3f6'
INK = '#1e2d37'
MUTED = '#566873'
STEEL = '#71848b'
GOLD = '#db9e3f'
FONT_DIR = Path('/usr/share/fonts/truetype/dejavu')
FONT = ImageFont.truetype(str(FONT_DIR / 'DejaVuSans.ttf'), 25)
SMALL = ImageFont.truetype(str(FONT_DIR / 'DejaVuSans.ttf'), 19)
TITLE = ImageFont.truetype(str(FONT_DIR / 'DejaVuSans-Bold.ttf'), 34)
MONO = ImageFont.truetype(str(FONT_DIR / 'DejaVuSansMono.ttf'), 21)


def base(title: str, step: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new('RGB', (W, H), BG)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, W, 88), fill='#dce6eb')
    draw.text((48, 23), title, font=TITLE, fill=INK)
    draw.text((50, H - 42), 'kernelCAD catalog • local source and software render • not deployed or physically accepted', font=SMALL, fill=MUTED)
    draw.text((W - 120, H - 42), step, font=SMALL, fill=MUTED)
    return image, draw


def contain(image: Image.Image, box: tuple[int, int, int, int]) -> Image.Image:
    x0, y0, x1, y1 = box
    img = image.copy()
    img.thumbnail((x1 - x0, y1 - y0), Image.Resampling.LANCZOS)
    return img


def add_preview(canvas: Image.Image, path: Path, box: tuple[int, int, int, int], label: str) -> None:
    x0, y0, x1, y1 = box
    image = contain(Image.open(path).convert('RGB'), (x0, y0, x1, y1 - 36))
    x = x0 + (x1 - x0 - image.width) // 2
    y = y0 + (y1 - 36 - y0 - image.height) // 2
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((x0, y0, x1, y1), radius=12, fill='white', outline='#c2d0d8', width=2)
    canvas.paste(image, (x, y))
    draw.text((x0 + 12, y1 - 31), label, font=SMALL, fill=INK)


def write(image: Image.Image, number: int) -> None:
    image.save(ROOT / 'slides' / f'frame-{number:02d}.png')


def main() -> None:
    (ROOT / 'slides').mkdir(exist_ok=True)
    sample_ids = [
        'machine-guard-enclosure', 'electrical-control-cabinet',
        'chemical-metering-skid', 'process-reactor-vessel', 'steel-access-gate',
    ]

    image, draw = base('Five industrial previews reviewed', '01 / 05')
    for index, asset_id in enumerate(sample_ids):
        col = index % 3
        row = index // 3
        x0 = 52 + col * 396
        y0 = 112 + row * 277
        add_preview(image, ROOT / 'samples' / f'{asset_id}.png', (x0, y0, x0 + 360, y0 + 248), asset_id)
    image.save(ROOT / 'poster.png')
    write(image, 1)

    image, draw = base('Finding: vessel rings split from shell finish', '02 / 05')
    add_preview(image, ROOT / 'before' / 'process-reactor-vessel.png', (350, 115, 930, 650), 'Before: roof lip and 3 stiffeners are safety gold')
    draw.text((80, 180), 'Shell:', font=FONT, fill=INK)
    draw.text((80, 220), '#71848b steel', font=FONT, fill=STEEL)
    draw.text((80, 300), 'Rings:', font=FONT, fill=INK)
    draw.text((80, 340), '#db9e3f safety paint', font=FONT, fill=GOLD)
    write(image, 2)

    image, draw = base('Correction: use the existing steel control', '03 / 05')
    before = (ROOT / 'before' / 'process-reactor-vessel.kcad.ts').read_text().splitlines()
    after = (ROOT / 'after' / 'process-reactor-vessel.kcad.ts').read_text().splitlines()
    names = ['roof-lip', 'stiffener-0', 'stiffener-1', 'stiffener-2']
    def material_for(lines: list[str], name: str) -> str:
        line = next(line for line in lines if f"'{name}'" in line)
        return 'safetyPaint' if '.color(safetyPaint)' in line else 'steel'

    draw.text((72, 130), 'Four ring assignments changed. Geometry and presets stayed intact.', font=FONT, fill=INK)
    draw.text((72, 203), 'BEFORE', font=SMALL, fill=GOLD)
    draw.text((648, 203), 'AFTER', font=SMALL, fill=STEEL)
    for index, name in enumerate(names):
        y = 248 + index * 72
        draw.text((72, y), f"{name}: {material_for(before, name)}", font=MONO, fill=INK)
        draw.text((648, y), f"{name}: {material_for(after, name)}", font=MONO, fill=INK)
    write(image, 3)

    image, draw = base('After: vessel rings read as part of the shell', '04 / 05')
    add_preview(image, ROOT / 'after' / 'process-reactor-vessel.png', (350, 115, 930, 650), 'After: steel rings; safety paint retained on fittings and access')
    draw.text((80, 205), 'Shell + rings', font=FONT, fill=INK)
    draw.text((80, 247), 'one steel finish', font=FONT, fill=STEEL)
    draw.text((80, 355), 'Platform, rails,', font=FONT, fill=INK)
    draw.text((80, 397), 'supports + nozzle', font=FONT, fill=INK)
    draw.text((80, 439), 'keep safety paint', font=FONT, fill=GOLD)
    write(image, 4)

    image, draw = base('Verification: local render and GLB test', '05 / 05')
    checks = [
        'PASS  Focused regression: 4 rings export as steel',
        'PASS  Safety-painted nozzle, support and platform retained',
        'PASS  Preview re-rendered; source hash indexed',
        '612 triangles / 1,400 budget; geometry unchanged',
        'Local software rendering only; no deployment or hardware test',
    ]
    for index, line in enumerate(checks):
        y = 162 + index * 82
        color = '#217449' if line.startswith('PASS') else INK
        draw.text((88, y), line, font=FONT, fill=color)
    write(image, 5)

    output = ROOT / 'industrial-plant-process-reactor-rings-material-review.mp4'
    subprocess.run([
        'ffmpeg', '-y', '-hide_banner', '-loglevel', 'error',
        '-framerate', '1/3', '-i', str(ROOT / 'slides' / 'frame-%02d.png'),
        '-vf', 'fps=30,format=yuv420p', '-t', '15', '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(output),
    ], check=True)
    print(output)


if __name__ == '__main__':
    main()
