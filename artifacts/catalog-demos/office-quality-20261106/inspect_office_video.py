#!/usr/bin/env python3
"""Probe the office MP4 and retain decoded frames for visual review."""

import json
import subprocess
from pathlib import Path

from PIL import Image


BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "office-quality-demo.mp4"
OUT = BUNDLE / "video-review"
OUT.mkdir(exist_ok=True)

probe = subprocess.run([
    "ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_name,width,height,r_frame_rate",
    "-of", "json", str(VIDEO),
], check=True, capture_output=True, text=True)
metadata = json.loads(probe.stdout)
duration = float(metadata["format"]["duration"])
sample_times = [1, 4, 7, 10, 13, 16, 19]
frames = []
for index, seconds in enumerate(sample_times, 1):
    if seconds >= duration:
        break
    path = OUT / f"frame-{index:02d}.png"
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(seconds),
        "-i", str(VIDEO), "-frames:v", "1", str(path),
    ], check=True)
    frames.append({"timeSeconds": seconds, "path": path.name, "size": path.stat().st_size})

thumbs = []
for row in frames:
    thumb = Image.open(OUT / row["path"]).convert("RGB")
    thumb.thumbnail((426, 240), Image.Resampling.LANCZOS)
    thumbs.append(thumb)
sheet = Image.new("RGB", (1278, 480), "#101923")
for index, thumb in enumerate(thumbs):
    x, y = (index % 3) * 426, (index // 3) * 240
    sheet.paste(thumb, (x, y))
sheet.save(OUT / "contact-sheet.png", optimize=True)

result = {
    "video": VIDEO.name,
    "probe": metadata,
    "decodedFrames": frames,
    "contactSheet": "video-review/contact-sheet.png",
    "manualVisualInspection": "pending",
}
(BUNDLE / "video-inspection.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result, indent=2))
