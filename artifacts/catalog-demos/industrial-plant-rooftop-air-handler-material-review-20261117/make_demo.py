#!/usr/bin/env python3
"""Build a short local before/after review clip from the actual catalog renders."""

from pathlib import Path
import subprocess
import textwrap

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
FRAMES = ROOT / 'video-review' / 'frames'
OUTPUT = ROOT / 'industrial-plant-rooftop-air-handler-material-review.mp4'
WIDTH, HEIGHT = 1280, 720


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    path = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def wrapped(draw: ImageDraw.ImageDraw, text: str, xy: tuple[int, int], fnt, fill: str, width: int, line_gap: int = 8) -> int:
    x, y = xy
    for paragraph in text.split('\n'):
        for line in textwrap.wrap(paragraph, width=width) or ['']:
            draw.text((x, y), line, font=fnt, fill=fill)
            y += fnt.size + line_gap
    return y


def frame(title: str, eyebrow: str, caption: str, image_path: Path | None = None) -> Image.Image:
    image = Image.new('RGB', (WIDTH, HEIGHT), '#f2f5f6')
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, WIDTH, 96), fill='#263741')
    draw.rectangle((0, 96, WIDTH, 104), fill='#d9a744')
    draw.text((52, 26), 'kernelCAD  /  industrial plant', font=font(25, True), fill='#ffffff')
    draw.text((52, 130), eyebrow.upper(), font=font(17, True), fill='#7b632d')
    draw.text((52, 164), title, font=font(36, True), fill='#263741')

    if image_path is not None:
        preview = Image.open(image_path).convert('RGB')
        preview.thumbnail((540, 490), Image.Resampling.LANCZOS)
        x = 50 + (540 - preview.width) // 2
        y = 230 + (490 - preview.height) // 2
        image.paste(preview, (x, y))
        text_x, text_y = 650, 248
        wrapped(draw, caption, (text_x, text_y), font(24), '#263741', 37, 13)
    else:
        wrapped(draw, caption, (72, 248), font(27), '#263741', 71, 15)

    draw.rectangle((0, HEIGHT - 66, WIDTH, HEIGHT), fill='#263741')
    draw.text(
        (52, HEIGHT - 47),
        'Local preview + software regression. No simulation, deployment, or hardware acceptance claimed.',
        font=font(17),
        fill='#ffffff',
    )
    return image


def main() -> None:
    FRAMES.mkdir(parents=True, exist_ok=True)
    content = [
        frame(
            'Rooftop air handler',
            'Material review · 17 November 2026',
            'Workflow: render the edited .kcad.ts source, compare the default preview, then check exported GLB part colors.',
        ),
        frame(
            'Before · default render',
            'Original material assignment',
            'The center casing, access doors, and fan housings all used safetyPaint. The steel-gray side casing and yellow base made the center bay stand out.',
            ROOT / 'before' / 'rooftop-air-handler.png',
        ),
        frame(
            'After · default render',
            'Material controls separated by part',
            'The casing and doors use steel. Dark fanHardware separates the fans. The base retains safetyPaint. The geometry remains at 320 triangles.',
            ROOT / 'after' / 'rooftop-air-handler.png',
        ),
        frame(
            'Verification',
            'Local checks',
            'GLB color regression: 1 passed. Industrial-plant ESLint: clean. Kit quality gate: 60/60. Catalog index rebuilt from source and preview.',
        ),
    ]
    for index, card in enumerate(content):
        card.save(FRAMES / f'{index:02d}.png')
    subprocess.run(
        [
            'ffmpeg', '-y', '-hide_banner', '-loglevel', 'error',
            '-framerate', '1/3', '-i', str(FRAMES / '%02d.png'),
            '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-crf', '22',
            '-movflags', '+faststart', str(OUTPUT),
        ],
        check=True,
    )
    print(f'created {OUTPUT}')


if __name__ == '__main__':
    main()
