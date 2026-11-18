#!/usr/bin/env python3
"""Decode representative MP4 frames and record visual-review evidence."""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
VIDEO = BUNDLE / 'vet-clinic-kit.mp4'
REVIEW = BUNDLE / 'video-review'
parser = argparse.ArgumentParser()
parser.add_argument('--manual-inspection-passed', action='store_true')
args = parser.parse_args()
if not VIDEO.is_file():
    raise SystemExit(f'missing demo video: {VIDEO}')
REVIEW.mkdir(parents=True, exist_ok=True)
for old in REVIEW.glob('decoded-*.png'):
    old.unlink()
subprocess.run([
    'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(VIDEO),
    '-vf', 'fps=1/3,scale=426:240', '-frames:v', '10', str(REVIEW / 'decoded-%02d.png'),
], check=True)
frames = sorted(REVIEW.glob('decoded-*.png'))
if len(frames) != 10:
    raise SystemExit(f'expected 10 decoded frames, got {len(frames)}')
sheet = Image.new('RGB', (1278, 960), '#111923')
draw = ImageDraw.Draw(sheet)
label_font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
for i, path in enumerate(frames):
    frame = Image.open(path).convert('RGB').resize((426, 240), Image.Resampling.LANCZOS)
    x, y = (i % 3) * 426, (i // 3) * 240
    sheet.paste(frame, (x, y))
    draw.rectangle((x, y + 218, x + 426, y + 240), fill='#111923')
    draw.text((x + 8, y + 221), f'frame {i + 1:02d}', fill='#eef3f5', font=label_font)
sheet.save(REVIEW / 'contact-sheet.png', optimize=True)
probe = json.loads(subprocess.check_output([
    'ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(VIDEO),
], text=True))
stream = next(item for item in probe['streams'] if item['codec_type'] == 'video')
report = {
    'video': str(VIDEO.relative_to(ROOT)),
    'bytes': VIDEO.stat().st_size,
    'sha256': hashlib.sha256(VIDEO.read_bytes()).hexdigest(),
    'codec': stream['codec_name'],
    'width': stream['width'],
    'height': stream['height'],
    'pixelFormat': stream['pix_fmt'],
    'durationSeconds': float(probe['format']['duration']),
    'decodedFrameSamples': [str(path.relative_to(ROOT)) for path in frames],
    'contactSheet': str((REVIEW / 'contact-sheet.png').relative_to(ROOT)),
    'manualVisualInspection': args.manual_inspection_passed,
}
(REVIEW / 'video-inspection.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
