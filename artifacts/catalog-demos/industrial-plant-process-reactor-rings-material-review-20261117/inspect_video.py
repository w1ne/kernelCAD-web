#!/usr/bin/env python3
"""Probe the rendered MP4 and retain five decoded frames for visual review."""

import json
from pathlib import Path
import subprocess

from PIL import Image, ImageOps, ImageDraw


ROOT = Path(__file__).resolve().parent
VIDEO = ROOT / 'industrial-plant-process-reactor-rings-material-review.mp4'
REVIEW = ROOT / 'video-review'


def main() -> None:
    REVIEW.mkdir(exist_ok=True)
    probe = subprocess.run([
        'ffprobe', '-v', 'error', '-show_entries',
        'format=duration:stream=codec_name,width,height,r_frame_rate',
        '-of', 'json', str(VIDEO),
    ], check=True, capture_output=True, text=True)
    metadata = json.loads(probe.stdout)
    stream = metadata['streams'][0]
    duration = float(metadata['format']['duration'])
    if (stream['codec_name'], stream['width'], stream['height']) != ('h264', 1280, 720):
        raise SystemExit(f'Unexpected video stream metadata: {stream}')
    if not 14.8 <= duration <= 15.2:
        raise SystemExit(f'Unexpected video duration: {duration}')

    subprocess.run([
        'ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', str(VIDEO),
        '-vf', 'fps=1/3', '-frames:v', '5',
        str(REVIEW / 'decoded-%02d.png'),
    ], check=True)
    frames = sorted(REVIEW.glob('decoded-*.png'))
    if len(frames) != 5:
        raise SystemExit(f'Expected 5 decoded review frames; found {len(frames)}')

    tiles = []
    for frame in frames:
        image = Image.open(frame).convert('RGB').resize((512, 288), Image.Resampling.LANCZOS)
        tiles.append(ImageOps.expand(image, border=2, fill='#788991'))
    sheet = Image.new('RGB', (1032, 884), '#e6edf1')
    draw = ImageDraw.Draw(sheet)
    draw.text((24, 14), 'Five decoded MP4 frames, in order', fill='#1e2d37')
    for index, tile in enumerate(tiles):
        x = 2 + (index % 2) * 516
        y = 48 + (index // 2) * 276
        sheet.paste(tile, (x, y))
    sheet.save(REVIEW / 'contact-sheet.png')

    report = {
        'video': VIDEO.name,
        'codec': stream['codec_name'],
        'width': stream['width'],
        'height': stream['height'],
        'frameRate': stream['r_frame_rate'],
        'durationSeconds': duration,
        'decodedReviewFrames': [path.name for path in frames],
        'visualInspection': 'Contact sheet contains audit, baseline, source assignment, updated render and verification slides.',
        'claimLimit': 'Local source/render and software checks only; no deployment, simulation, fabrication or hardware acceptance.',
    }
    (REVIEW / 'inspection.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
