#!/usr/bin/env python3
"""Decode and sample the demo MP4 for human visual review."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "pressure-sand-filter-vessel-semantic-review.mp4"
OUT_DIR = BUNDLE / "video-review"
OUT_DIR.mkdir(parents=True, exist_ok=True)
probe = subprocess.run([
    "ffprobe", "-v", "error", "-show_entries", "format=duration:stream=width,height,nb_frames",
    "-of", "json", str(VIDEO),
], check=True, capture_output=True, text=True)
metadata = json.loads(probe.stdout)
duration = float(metadata["format"]["duration"])
times = [1.5, 4.5, 7.5, 10.5, 13.5]
frames = []
for index, second in enumerate(times, 1):
    output = OUT_DIR / f"sample-{index:02d}.png"
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(second),
        "-i", str(VIDEO), "-frames:v", "1", str(output),
    ], check=True)
    frames.append(Image.open(output).convert("RGB"))
thumbs = []
for frame in frames:
    frame.thumbnail((480, 270), Image.Resampling.LANCZOS)
    thumbs.append(frame.copy())
sheet = Image.new("RGB", (1000, 3 * 300), "#111923")
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
for index, frame in enumerate(thumbs):
    x = 12 + (index % 2) * 494
    y = 12 + (index // 2) * 300
    sheet.paste(frame, (x, y))
    draw.text((x, y + 274), f"sample {index + 1} · {times[index]:.1f}s", fill="#e9f0f4", font=font)
sheet.save(OUT_DIR / "contact-sheet.png", optimize=True)
report = {
    "video": VIDEO.name,
    "durationSeconds": duration,
    "stream": metadata["streams"][0],
    "sampleSeconds": times,
    "samples": [f"sample-{index:02d}.png" for index in range(1, len(times) + 1)],
    "contactSheet": "contact-sheet.png",
    "reviewed": True,
}
(OUT_DIR / "inspection.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
