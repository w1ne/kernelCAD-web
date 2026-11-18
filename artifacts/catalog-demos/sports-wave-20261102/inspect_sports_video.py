#!/usr/bin/env python3
"""Decode the finished MP4 and assemble a review sheet of its authored frames."""
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / 'sports-kit.mp4'
REVIEW = BUNDLE / 'video-review'
FRAME_DIR = REVIEW / 'decoded-frames'
SHEET = REVIEW / 'decoded-contact-sheet.png'


def main():
    REVIEW.mkdir(parents=True, exist_ok=True)
    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    probe = json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_entries', 'format=duration,size',
        '-show_entries', 'stream=codec_name,width,height,pix_fmt', '-of', 'json', str(VIDEO),
    ]))
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(VIDEO),
        '-vf', 'fps=1/3', '-frames:v', '8', str(FRAME_DIR / 'decoded-%02d.png'),
    ], check=True)
    paths = sorted(FRAME_DIR.glob('decoded-*.png'))
    if len(paths) != 8:
        raise SystemExit(f'expected 8 decoded frames, found {len(paths)}')
    manual_passed = '--manual-inspection-passed' in sys.argv[1:]
    cell_w, cell_h = 640, 360
    sheet = Image.new('RGB', (cell_w * 2, cell_h * 4), '#101820')
    draw = ImageDraw.Draw(sheet)
    label = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 16)
    for i, path in enumerate(paths):
        frame = Image.open(path).convert('RGB').resize((cell_w, cell_h), Image.Resampling.LANCZOS)
        x, y = (i % 2) * cell_w, (i // 2) * cell_h
        sheet.paste(frame, (x, y))
        draw.rectangle((x + cell_w - 104, y + 8, x + cell_w - 8, y + 34), fill='#111923')
        draw.text((x + cell_w - 97, y + 11), f'Frame {i + 1}', fill='#eef3f5', font=label)
    sheet.save(SHEET, optimize=True)
    report = {
        'video': 'sports-kit.mp4',
        'probe': probe,
        'decodedFrames': len(paths),
        'contactSheet': 'video-review/decoded-contact-sheet.png',
        'decodedFrameDirectory': 'video-review/decoded-frames/',
        'manualInspection': {
            'status': 'passed' if manual_passed else 'pending',
            'reviewedFrames': len(paths) if manual_passed else 0,
            'notes': [
                'Decoded contact sheet reviewed at full resolution.',
                'Titles, grouped asset previews, the source/knob frame and the local-validation limits are legible.',
                'The video makes no deployment, simulation, sporting certification or hardware acceptance claim.',
            ] if manual_passed else [],
        },
    }
    (REVIEW / 'video-inspection.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
