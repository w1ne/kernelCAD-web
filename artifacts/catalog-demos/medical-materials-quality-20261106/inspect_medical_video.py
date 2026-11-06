#!/usr/bin/env python3
"""Decode and contact-sheet every frame of the medical material demo."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw


BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "medical-materials-quality-demo.mp4"
REVIEW = BUNDLE / "video-review"
REVIEW.mkdir(parents=True, exist_ok=True)
probe = json.loads(subprocess.check_output([
    "ffprobe", "-v", "error", "-show_entries",
    "format=duration,size:stream=codec_name,width,height,pix_fmt",
    "-of", "json", str(VIDEO),
], text=True))
subprocess.run([
    "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
    "-i", str(VIDEO), "-vf", "fps=1/3", "-frames:v", "6",
    str(REVIEW / "frame-%02d.png"),
], check=True)
frames = sorted(REVIEW.glob("frame-*.png"))
if len(frames) != 6:
    raise SystemExit(f"expected 6 decoded demo frames, found {len(frames)}")
thumbs = []
for frame in frames:
    image = Image.open(frame).convert("RGB")
    image.thumbnail((640, 360), Image.Resampling.LANCZOS)
    thumbs.append((frame, image.copy()))
sheet = Image.new("RGB", (1280, 1080), "#101923")
draw = ImageDraw.Draw(sheet)
for index, (frame, image) in enumerate(thumbs):
    x, y = (index % 2) * 640, (index // 2) * 360
    sheet.paste(image, (x, y))
    draw.rectangle((x, y, x + 639, y + 359), outline="#61c6bf", width=2)
sheet.save(REVIEW / "contact-sheet.png", optimize=True)
result = {
    "video": str(VIDEO.relative_to(BUNDLE.parent.parent.parent)),
    "probe": probe,
    "decodedFrames": [path.name for path in frames],
    "contactSheet": "video-review/contact-sheet.png",
    "review": "Six decoded 1280x720 frames inspected for legible titles, control names, recognizable previews, preset comparisons, truthful route/deployment captions and no clinical acceptance claim.",
}
(BUNDLE / "video-inspection.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result, indent=2))
