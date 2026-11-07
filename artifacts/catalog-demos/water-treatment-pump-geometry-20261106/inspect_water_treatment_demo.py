#!/usr/bin/env python3
"""Decode and inspect the generated local water-treatment demo video."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw

BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "water-treatment-pump-geometry.mp4"
REVIEW = BUNDLE / "video-review"
REVIEW.mkdir(parents=True, exist_ok=True)

probe = subprocess.run([
    "ffprobe", "-v", "error", "-select_streams", "v:0",
    "-show_entries", "stream=width,height,avg_frame_rate,duration",
    "-show_entries", "format=duration", "-of", "json", str(VIDEO),
], check=True, capture_output=True, text=True)
metadata = json.loads(probe.stdout)
stream = metadata["streams"][0]
duration = float(metadata["format"]["duration"])
if stream["width"] != 1280 or stream["height"] != 720 or duration < 14:
    raise SystemExit(f"unexpected video metadata: {metadata}")

decoded = []
for index, timestamp in enumerate((1.5, 4.5, 7.5, 10.5, 13.5), 1):
    frame = REVIEW / f"decoded-{index:02d}.png"
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(timestamp),
        "-i", str(VIDEO), "-frames:v", "1", str(frame),
    ], check=True)
    decoded.append(frame)

thumbs = []
for path in decoded:
    image = Image.open(path).convert("RGB")
    image.thumbnail((640, 360), Image.Resampling.LANCZOS)
    thumbs.append(image.copy())
sheet = Image.new("RGB", (1280, 1080), "#101923")
draw = ImageDraw.Draw(sheet)
for index, image in enumerate(thumbs):
    x = (index % 2) * 640
    y = (index // 2) * 360
    sheet.paste(image, (x, y))
sheet.save(REVIEW / "contact-sheet.png", optimize=True)

result = {
    "video": "water-treatment-pump-geometry.mp4",
    "metadata": {"width": stream["width"], "height": stream["height"], "frameRate": stream["avg_frame_rate"], "durationSeconds": duration},
    "decodedFrames": [str(path.relative_to(BUNDLE)) for path in decoded],
    "contactSheet": "video-review/contact-sheet.png",
    "decoded": True,
}
(BUNDLE / "video-inspection.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result, indent=2))
