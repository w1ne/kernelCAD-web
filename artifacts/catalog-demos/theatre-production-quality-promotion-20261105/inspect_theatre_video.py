#!/usr/bin/env python3
"""Decode MP4 sample frames into a contact sheet for visual inspection."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "theatre-production-quality-promotion.mp4"
FRAMES = BUNDLE / "decoded-frames"
FRAMES.mkdir(exist_ok=True)
durations = [1, 4, 7, 10, 13, 16]
for i, seconds in enumerate(durations, start=1):
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(seconds),
        "-i", str(VIDEO), "-frames:v", "1", str(FRAMES / f"frame-{i:02d}.png"),
    ], check=True)

thumb_w, thumb_h = 480, 270
sheet = Image.new("RGB", (thumb_w * 2, thumb_h * 3), "#111923")
draw = ImageDraw.Draw(sheet)
caption = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
for i, seconds in enumerate(durations):
    frame = Image.open(FRAMES / f"frame-{i + 1:02d}.png").convert("RGB")
    frame.thumbnail((thumb_w, thumb_h), Image.Resampling.LANCZOS)
    x, y = (i % 2) * thumb_w, (i // 2) * thumb_h
    sheet.paste(frame, (x, y))
    draw.text((x + 8, y + thumb_h - 20), f"decoded at {seconds}s", fill="#ffffff", font=caption)
sheet.save(BUNDLE / "decoded-video-contact-sheet.png")
probe = subprocess.run([
    "ffprobe", "-v", "error", "-show_entries", "format=duration,size:stream=width,height,codec_name,nb_frames",
    "-of", "json", str(VIDEO),
], check=True, capture_output=True, text=True)
report = {"decodedFrames": len(durations), "sampleSeconds": durations, "probe": json.loads(probe.stdout)}
(BUNDLE / "video-inspection.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
