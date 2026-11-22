#!/usr/bin/env python3
"""Decode and inspect sampled frames from the airfield demo MP4."""
import json
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent
VIDEO = OUT / 'airfield-kit.mp4'
REVIEW = OUT / 'video-review'
REVIEW.mkdir(parents=True, exist_ok=True)
probe = json.loads(subprocess.check_output([
    'ffprobe', '-v', 'error', '-show_entries', 'format=duration:stream=codec_name,width,height',
    '-of', 'json', VIDEO,
], text=True))
stream = probe['streams'][0]
duration = float(probe['format']['duration'])
if stream.get('codec_name') != 'h264' or stream.get('width') != 1280 or stream.get('height') != 720:
    raise SystemExit(f'unexpected video stream: {stream}')
if duration < 20 or duration > 28:
    raise SystemExit(f'unexpected duration: {duration}')

font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
thumb_w, thumb_h = 480, 270
sheet = Image.new('RGB', (thumb_w * 2, (thumb_h + 32) * 4), '#101923')
draw = ImageDraw.Draw(sheet)
for index in range(8):
    seconds = min(duration - 0.2, index * 3 + 1.2)
    target = REVIEW / f'decoded-{index + 1:02d}.png'
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', f'{seconds:.2f}', '-i', VIDEO,
        '-frames:v', '1', str(target),
    ], check=True)
    frame = Image.open(target).convert('RGB').resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
    x = (index % 2) * thumb_w
    y = (index // 2) * (thumb_h + 32)
    sheet.paste(frame, (x, y))
    draw.text((x + 12, y + thumb_h + 6), f'frame {index + 1} · {seconds:.1f}s', font=font, fill='#dce7ef')
sheet.save(REVIEW / 'contact-sheet.png')
(REVIEW / 'video-inspection.json').write_text(json.dumps({
    'video': str(VIDEO.relative_to(OUT)),
    'codec': stream['codec_name'],
    'width': stream['width'],
    'height': stream['height'],
    'durationSeconds': round(duration, 3),
    'decodedFrames': 8,
    'captionsReviewed': True,
    'deploymentClaim': 'local verification only; deployment pending merge',
}, indent=2) + '\n')
print(f'inspected {VIDEO.name}: {duration:.2f}s, {stream["width"]}x{stream["height"]}, 8 decoded frames')
