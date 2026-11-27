#!/usr/bin/env python3
"""Inspect video metadata and extract one frame from each demo slide."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "review-demo.mp4"
OUT = BUNDLE / "video-review"
OUT.mkdir(exist_ok=True)
probe = subprocess.run(
    ["ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", str(VIDEO)],
    check=True,
    capture_output=True,
    text=True,
)
metadata = json.loads(probe.stdout)
(OUT / "ffprobe.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")

frames = []
for index, seconds in enumerate((1, 5, 9, 13), start=1):
    frame = OUT / f"frame-{index:02}.png"
    subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(seconds),
            "-i", str(VIDEO), "-frames:v", "1", str(frame),
        ],
        check=True,
    )
    frames.append(Image.open(frame).convert("RGB"))

sheet = Image.new("RGB", (1280, 760), "#e7edf2")
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
for index, frame in enumerate(frames):
    x = (index % 2) * 640
    y = (index // 2) * 380
    sheet.paste(frame.resize((640, 360), Image.Resampling.LANCZOS), (x, y))
    draw.text((x + 14, y + 362), f"Frame {index + 1} · t={index * 4 + 1}s", font=font, fill="#172b3a")
sheet.save(OUT / "frames-contact-sheet.png", optimize=True)
print(f"Video: {metadata['format'].get('duration')}s; extracted {len(frames)} slide frames.")
