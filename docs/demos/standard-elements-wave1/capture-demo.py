#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
#
# Compose an annotated still-sequence demo from the checked local model render.

import hashlib
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
WIDTH, HEIGHT = 1920, 1080
INK = '#f3f6f8'
MUTED = '#c0cbd3'
ACCENT = '#62d7ff'
BG = '#141a20'
CARD = '#202a33'


def first_existing(paths):
    for path in paths:
        if Path(path).exists():
            return path
    raise FileNotFoundError(f'no usable font in {paths}')


FONT_PATH = first_existing([
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
])
FONT_BOLD_PATH = first_existing([
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
])
MONO_PATH = first_existing([
    '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf',
])


def font(size, bold=False, mono=False):
    path = MONO_PATH if mono else (FONT_BOLD_PATH if bold else FONT_PATH)
    return ImageFont.truetype(path, size)


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def header(draw, title, eyebrow):
    draw.text((110, 70), eyebrow.upper(), font=font(24, bold=True), fill=ACCENT)
    draw.text((110, 112), title, font=font(54, bold=True), fill=INK)


def centered_image(canvas, path, box):
    image = Image.open(path).convert('RGB')
    image.thumbnail((box[2], box[3]), Image.Resampling.LANCZOS)
    x = box[0] + (box[2] - image.width) // 2
    y = box[1] + (box[3] - image.height) // 2
    canvas.paste(image, (x, y))


def title_slide():
    canvas = Image.new('RGB', (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(canvas)
    header(draw, 'Standard mechanical elements', 'KernelCAD · Wave 1')
    draw.text((112, 300), '12 reusable families', font=font(46, bold=True), fill=INK)
    draw.text((112, 375), '80+ stocked sizes · named mate connectors · parametric lengths',
              font=font(30), fill=MUTED)
    draw.rounded_rectangle((110, 500, 1810, 850), radius=24, fill=CARD)
    draw.text((160, 568), 'Build with lib.standard.*', font=font(38, bold=True), fill=ACCENT)
    draw.text((160, 645), 'Linear guides · T-slot framing · shaft hardware · belt drive',
              font=font(30), fill=INK)
    draw.text((160, 740), 'Shown: a local model assembled from the committed example source.',
              font=font(24), fill=MUTED)
    return canvas


def assembly_slide():
    canvas = Image.new('RGB', (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(canvas)
    header(draw, 'A linear guide assembly', 'Native KernelCAD parts')
    centered_image(canvas, HERE / 'assembly.hero.png', (110, 210, 1700, 620))
    draw = ImageDraw.Draw(canvas)
    draw.text((112, 880), '2020 extrusion  ·  MGN12 rail + carriage  ·  20-M3 T-nut  ·  GT2 pulley',
              font=font(25, bold=True), fill=INK)
    draw.text((112, 940), 'The T-nut seats in the profile slot; the carriage travels on the rail.',
              font=font(24), fill=MUTED)
    return canvas


def source_slide():
    canvas = Image.new('RGB', (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(canvas)
    header(draw, 'Specify stock size and motion', 'Committed .kcad.ts example')
    draw.rounded_rectangle((110, 230, 1810, 790), radius=22, fill=CARD)
    lines = [
        "const rail = await lib.standard.linearRail({",
        "  size: 'MGN12', lengthMm: 300,",
        '});',
        "const carriage = await lib.standard.linearCarriage({ size: 'MGN12H' });",
        "slide.mate('slide', 'rail.rail-axis', 'carriage.rail-mate',",
        "  'prismatic', { pose: travel, limitsMm: [0, 80] });",
    ]
    y = 285
    for line in lines:
        draw.text((155, y), line, font=font(27, mono=True), fill=ACCENT if 'size:' in line else INK)
        y += 70
    draw.text((112, 865), 'Stock dimensions and named connectors resolve through the library API.',
              font=font(25), fill=MUTED)
    return canvas


def verification_slide():
    canvas = Image.new('RGB', (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(canvas)
    header(draw, 'Local checks passed', 'Evaluation and assembly review')
    items = [
        ('5', 'named parts in the example'),
        ('80 mm', 'declared carriage travel'),
        ('0 / 0', 'error diagnostics / clash pairs'),
    ]
    x = 110
    for value, label in items:
        draw.rounded_rectangle((x, 300, x + 520, 650), radius=20, fill=CARD)
        draw.text((x + 42, 360), value, font=font(58, bold=True), fill=ACCENT)
        draw.text((x + 42, 475), label, font=font(25), fill=INK)
        x += 565
    draw.text((112, 755), '6 info notes: point connectors do not compare hole diameters; geometric mate alignment still runs.',
              font=font(21), fill=MUTED)
    draw.text((112, 830), 'Local evaluation and geometry review only.', font=font(27, bold=True), fill=INK)
    draw.text((112, 885), 'No deployed-platform behavior, hardware test, or manufacturing acceptance is claimed.',
              font=font(21), fill=MUTED)
    return canvas


def main():
    frames = [
        (title_slide(), 3.0),
        (assembly_slide(), 5.0),
        (source_slide(), 4.0),
        (verification_slide(), 4.0),
    ]
    frame_dir = HERE / 'frames'
    frame_dir.mkdir(exist_ok=True)
    for index, (frame, _duration) in enumerate(frames):
        frame.save(frame_dir / f'{index:02d}.png')

    concat = frame_dir / 'slides.txt'
    concat.write_text('\n'.join(
        value
        for index, (_frame, duration) in enumerate(frames)
        for value in (f"file '{index:02d}.png'", f'duration {duration}')
    ) + f"\nfile '{len(frames) - 1:02d}.png'\n")
    output = HERE / 'demo.mp4'
    subprocess.run([
        'ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', str(concat),
        '-vf', 'fps=24,format=yuv420p', '-c:v', 'libx264', '-crf', '18',
        '-movflags', '+faststart', str(output),
    ], check=True)

    source = ROOT / 'examples/parts/standard-elements-wave1.kcad.ts'
    verification = HERE / 'verification.json'
    evidence = {
        'checkedAt': datetime.now(timezone.utc).isoformat(),
        'video': output.name,
        'videoSha256': sha256(output),
        'durationSec': sum(duration for _frame, duration in frames),
        'canvas': f'{WIDTH}x{HEIGHT}',
        'fps': 24,
        'source': str(source.relative_to(ROOT)),
        'sourceSha256': sha256(source),
        'verificationSha256': sha256(verification),
        'inputSha256': {
            'assembly.hero.png': sha256(HERE / 'assembly.hero.png'),
            **{f'frames/{index:02d}.png': sha256(frame_dir / f'{index:02d}.png')
               for index in range(len(frames))},
        },
        'invocations': [
            'npx tsx src/agent/cli/index.ts render examples/parts/standard-elements-wave1.kcad.ts --preset studio --background dark --width 1800 --height 1200 --no-watermark -o docs/demos/standard-elements-wave1/assembly.hero.png',
            'npx tsx src/agent/cli/index.ts render inspect examples/parts/standard-elements-wave1.kcad.ts docs/demos/standard-elements-wave1/inspect --channels rgb --views iso,right,top --width 1200 --height 900 --no-watermark',
            'npx tsx docs/demos/standard-elements-wave1/verify.mts',
            'python3 docs/demos/standard-elements-wave1/capture-demo.py',
        ],
        'provenance': 'Annotated still sequence composed from a deterministic local KernelCAD render and local evaluate_script/review_cad results. No screen recording, deployed-platform capture, hardware test, or manufacturing acceptance.',
    }
    (HERE / 'video-evidence.json').write_text(json.dumps(evidence, indent=2) + '\n')
    print(json.dumps({'ok': True, 'video': str(output), 'durationSec': evidence['durationSec']}))


if __name__ == '__main__':
    main()
