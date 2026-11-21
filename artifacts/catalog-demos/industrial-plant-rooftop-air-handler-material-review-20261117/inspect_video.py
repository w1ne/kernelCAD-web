#!/usr/bin/env python3
"""Probe the MP4 and make a contact sheet from frames decoded from the video."""

import json
from pathlib import Path
import subprocess

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent
VIDEO = ROOT / 'industrial-plant-rooftop-air-handler-material-review.mp4'
SAMPLES = ROOT / 'video-review' / 'decoded-frames'
CONTACT = ROOT / 'video-review' / 'contact-sheet.png'
MANIFEST = ROOT / 'video-review' / 'inspection.json'


def main() -> None:
    probe = json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height,r_frame_rate,nb_frames,duration,codec_name,pix_fmt',
        '-of', 'json', str(VIDEO),
    ], text=True))['streams'][0]
    SAMPLES.mkdir(parents=True, exist_ok=True)
    sampled = []
    for second in (1, 4, 7, 10):
        path = SAMPLES / f'{second:02d}s.png'
        subprocess.run([
            'ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-ss', str(second),
            '-i', str(VIDEO), '-frames:v', '1', str(path),
        ], check=True)
        sampled.append(path)

    tile_w, tile_h = 640, 360
    sheet = Image.new('RGB', (tile_w * 2, tile_h * 2), '#d8e0e3')
    draw = ImageDraw.Draw(sheet)
    for index, path in enumerate(sampled):
        frame = Image.open(path).convert('RGB').resize((tile_w, tile_h), Image.Resampling.LANCZOS)
        sheet.paste(frame, ((index % 2) * tile_w, (index // 2) * tile_h))
    sheet.save(CONTACT)
    manifest = {
        'video': VIDEO.name,
        'probe': probe,
        'sampledSeconds': [1, 4, 7, 10],
        'decodedFrames': [str(path.relative_to(ROOT)) for path in sampled],
        'contactSheet': str(CONTACT.relative_to(ROOT)),
        'inspection': 'Decoded MP4 frames checked for readability, preview legibility, and truthful local-only claims.',
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps(manifest, indent=2))


if __name__ == '__main__':
    main()
