#!/usr/bin/env python3
"""Inspect the generated MP4 duration, dimensions, and representative frames."""
import hashlib
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BUNDLE = Path(__file__).resolve().parent
video = BUNDLE / 'archaeology-fieldwork-kit.mp4'
review = BUNDLE / 'video-review'
review.mkdir(parents=True, exist_ok=True)
probe = json.loads(subprocess.check_output([
    'ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,nb_read_frames,r_frame_rate',
    '-show_entries', 'format=duration', '-of', 'json', str(video),
]))
stream = probe['streams'][0]
frames_dir = review / 'decoded-frames'
frames_dir.mkdir(parents=True, exist_ok=True)
subprocess.run([
    'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(video),
    '-vf', 'fps=1/3', '-frames:v', '10', str(frames_dir / 'decoded-%02d.png'),
], check=True)
frames = sorted(frames_dir.glob('decoded-*.png'))
thumb_w, thumb_h, gap = 360, 203, 14
sheet = Image.new('RGB', (5 * thumb_w + 6 * gap, 2 * (thumb_h + 30) + 3 * gap), '#101922')
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
for i, path in enumerate(frames):
    image = Image.open(path).convert('RGB')
    image.thumbnail((thumb_w, thumb_h), Image.Resampling.LANCZOS)
    col, row = i % 5, i // 5
    x, y = gap + col * (thumb_w + gap), gap + row * (thumb_h + 30 + gap)
    sheet.paste(image, (x + (thumb_w - image.width) // 2, y))
    draw.text((x, y + thumb_h + 5), f'Frame {i + 1}', fill='#eef3f5', font=font)
sheet.save(review / 'contact-sheet.png', optimize=True)
duration = float(probe['format']['duration'])
result = {
    'video': video.name,
    'sha256': hashlib.sha256(video.read_bytes()).hexdigest(),
    'durationSeconds': duration,
    'width': stream['width'],
    'height': stream['height'],
    'frameRate': stream['r_frame_rate'],
    'encodedFrames': int(stream['nb_read_frames']),
    'sampledFrames': len(frames),
    'sampleContactSheet': 'video-review/contact-sheet.png',
    'passed': 29 <= duration <= 31 and stream['width'] == 1280 and stream['height'] == 720 and len(frames) == 10,
}
(review / 'video-inspection.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
if not result['passed']:
    raise SystemExit(1)
