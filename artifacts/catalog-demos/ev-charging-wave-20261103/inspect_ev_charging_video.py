#!/usr/bin/env python3
"""Decode the MP4 and retain representative frames and video metadata."""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
VIDEO = BUNDLE / 'ev-charging-infrastructure.mp4'
parser = argparse.ArgumentParser()
parser.add_argument('--manual-inspection-passed', action='store_true')
args = parser.parse_args()
if not VIDEO.is_file():
    raise SystemExit(f'missing demo video: {VIDEO}')
review = BUNDLE / 'video-review'
review.mkdir(parents=True, exist_ok=True)
for old in review.glob('decoded-*.png'):
    old.unlink()
subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(VIDEO), '-vf', 'fps=1/3,scale=426:240', '-frames:v', '10', str(review / 'decoded-%02d.png')], check=True)
frames = sorted(review.glob('decoded-*.png'))
if len(frames) != 10:
    raise SystemExit(f'expected 10 decoded frames, got {len(frames)}')
sheet = Image.new('RGB', (1278, 960), '#101a22')
draw = ImageDraw.Draw(sheet)
label_font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
for i, path in enumerate(frames):
    frame = Image.open(path).convert('RGB').resize((426, 240), Image.Resampling.LANCZOS)
    x, y = (i % 3) * 426, (i // 3) * 240
    sheet.paste(frame, (x, y))
    draw.rectangle((x, y + 218, x + 426, y + 240), fill='#101a22')
    draw.text((x + 8, y + 221), f'frame {i + 1:02d}', fill='#edf3f5', font=label_font)
sheet.save(review / 'contact-sheet.png', optimize=True)
probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(VIDEO)], text=True))
stream = next(item for item in probe['streams'] if item['codec_type'] == 'video')
result = {
    'video': str(VIDEO.relative_to(ROOT)),
    'bytes': VIDEO.stat().st_size,
    'sha256': hashlib.sha256(VIDEO.read_bytes()).hexdigest(),
    'codec': stream['codec_name'],
    'width': stream['width'],
    'height': stream['height'],
    'pixelFormat': stream['pix_fmt'],
    'durationSeconds': float(probe['format']['duration']),
    'decodedFrameSamples': [str(path.relative_to(ROOT)) for path in frames],
    'contactSheet': str((review / 'contact-sheet.png').relative_to(ROOT)),
    'manualVisualInspection': args.manual_inspection_passed,
}
(review / 'video-inspection.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
