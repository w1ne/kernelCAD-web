#!/usr/bin/env python3
"""Decode and retain representative frames from the local demo MP4."""

import json
import subprocess
from pathlib import Path

from PIL import Image

BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "photo-video-studio-quality-demo.mp4"
OUT = BUNDLE / "video-review"
OUT.mkdir(exist_ok=True)

probe = subprocess.run([
    "ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_name,width,height,r_frame_rate",
    "-of", "json", str(VIDEO),
], check=True, capture_output=True, text=True)
metadata = json.loads(probe.stdout)
frames = []
for index, seconds in enumerate((1, 4, 7, 10, 13, 16), 1):
    path = OUT / f"frame-{index:02d}.png"
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(seconds),
        "-i", str(VIDEO), "-frames:v", "1", str(path),
    ], check=True)
    frames.append({"timeSeconds": seconds, "path": path.name, "size": path.stat().st_size})

thumbs = []
for row in frames:
    image = Image.open(OUT / row["path"]).convert("RGB")
    image.thumbnail((426, 240), Image.Resampling.LANCZOS)
    thumbs.append(image)
sheet = Image.new("RGB", (1278, 480), "#101923")
for i, thumb in enumerate(thumbs):
    x, y = (i % 3) * 426, (i // 3) * 240
    sheet.paste(thumb, (x, y))
sheet.save(OUT / "contact-sheet.png", optimize=True)

result = {
    "video": str(VIDEO.relative_to(BUNDLE.parents[2])),
    "probe": metadata,
    "decodedFrames": frames,
    "contactSheet": "video-review/contact-sheet.png",
    "manualVisualInspection": "pending",
}
(BUNDLE / "video-inspection.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result, indent=2))
