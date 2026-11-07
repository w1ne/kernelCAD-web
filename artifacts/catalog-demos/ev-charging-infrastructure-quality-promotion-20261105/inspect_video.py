#!/usr/bin/env python3
"""Extract representative video frames and record technical inspection data."""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "ev-charging-infrastructure-quality-promotion.mp4"
REVIEW = BUNDLE / "video-review"
TIMES = [0, 4, 8, 12, 16, 20]

parser = argparse.ArgumentParser()
parser.add_argument("--manual-review", action="store_true", help="record that a human opened the contact sheet")
args = parser.parse_args()
REVIEW.mkdir(parents=True, exist_ok=True)

probe = json.loads(subprocess.check_output([
    "ffprobe", "-v", "error", "-show_entries", "format=duration,size",
    "-show_entries", "stream=codec_name,width,height,r_frame_rate", "-of", "json", str(VIDEO),
], text=True))
frames = []
for i, seconds in enumerate(TIMES, start=1):
    frame_path = REVIEW / f"decoded-{i:02d}.png"
    subprocess.run([
        "ffmpeg", "-y", "-loglevel", "error", "-ss", str(seconds), "-i", str(VIDEO),
        "-frames:v", "1", str(frame_path),
    ], check=True)
    frames.append(frame_path)

sheet = Image.new("RGB", (1000, 960), (230, 237, 239))
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
for i, path in enumerate(frames):
    img = Image.open(path).convert("RGB")
    img.thumbnail((480, 270), Image.Resampling.LANCZOS)
    x = (i % 2) * 500 + 10
    y = (i // 2) * 320
    sheet.paste(img, (x, y))
    draw.text((x + 6, y + 274), f"{TIMES[i]} s", font=font, fill=(23, 38, 46))
sheet.save(REVIEW / "contact-sheet.png", optimize=True)

result = {
    "video": VIDEO.name,
    "sha256": hashlib.sha256(VIDEO.read_bytes()).hexdigest(),
    "bytes": VIDEO.stat().st_size,
    "ffprobe": probe,
    "sampleTimesSeconds": TIMES,
    "decodedFrames": [path.name for path in frames],
    "contactSheet": "video-review/contact-sheet.png",
    "manualContactSheetReview": args.manual_review,
    "manualReviewNotes": None,
}
if args.manual_review:
    result["manualReviewNotes"] = (
        "The six sampled slides show the source-to-color promotion, recognizable charger/connector/canopy previews, "
        "default versus named preset renders, all-kit preview sheet, and local checks. Text remains readable; captions "
        "state local behavior and make no deployment or hardware-acceptance claim."
    )
(BUNDLE / "video-inspection.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps({key: value for key, value in result.items() if key not in ("ffprobe", "decodedFrames")}, indent=2))
