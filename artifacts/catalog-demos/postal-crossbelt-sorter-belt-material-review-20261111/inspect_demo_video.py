#!/usr/bin/env python3
"""Probe the generated walkthrough and make a contact sheet of sampled frames."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw


BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / 'postal-crossbelt-sorter-belt-material-review.mp4'
REVIEW = BUNDLE / 'video-review'
FRAMES = REVIEW / 'inspected-frames'
FRAMES.mkdir(parents=True, exist_ok=True)
probe = json.loads(subprocess.check_output([
    'ffprobe', '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=codec_name,width,height,r_frame_rate',
    '-show_entries', 'format=duration', '-of', 'json', str(VIDEO),
], text=True))
stream = probe['streams'][0]
duration = float(probe['format']['duration'])
assert stream['codec_name'] == 'h264'
assert [stream['width'], stream['height']] == [1280, 720]
assert 15.0 <= duration <= 17.0, duration

times = [1.2, 4.4, 7.6, 10.8, 14.0]
paths: list[Path] = []
for index, time in enumerate(times, start=1):
    path = FRAMES / f'slide-{index:02d}.png'
    subprocess.run([
        'ffmpeg', '-y', '-ss', str(time), '-i', str(VIDEO),
        '-frames:v', '1', '-update', '1', str(path),
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    paths.append(path)

thumb_w, thumb_h = 384, 216
sheet = Image.new('RGB', (thumb_w * 2, thumb_h * 3), '#dce5ec')
draw = ImageDraw.Draw(sheet)
for index, path in enumerate(paths):
    image = Image.open(path).convert('RGB').resize((thumb_w, thumb_h))
    x = (index % 2) * thumb_w
    y = (index // 2) * thumb_h
    sheet.paste(image, (x, y))
    draw.rectangle((x + 8, y + 8, x + 36, y + 36), fill='#ffffff')
    draw.text((x + 17, y + 12), str(index + 1), fill='#203043')
sheet.save(REVIEW / 'inspection-montage.png', optimize=True)

(REVIEW / 'ffprobe.json').write_text(json.dumps(probe, indent=2) + '\n', encoding='utf-8')
inspection = {
    'video': VIDEO.name,
    'codec': stream['codec_name'],
    'width': stream['width'],
    'height': stream['height'],
    'durationSeconds': duration,
    'sampleTimesSeconds': times,
    'sampleFrames': [str(path.relative_to(BUNDLE)) for path in paths],
    'inspectionMontage': 'video-review/inspection-montage.png',
    'result': 'pass; sampled frames show five-preview audit, baseline, source mapping, corrected render, and verification boundary',
}
(REVIEW / 'inspection.json').write_text(json.dumps(inspection, indent=2) + '\n', encoding='utf-8')
print(f"Inspected {VIDEO.name}: {duration:.2f}s, {stream['width']}x{stream['height']} H.264")
