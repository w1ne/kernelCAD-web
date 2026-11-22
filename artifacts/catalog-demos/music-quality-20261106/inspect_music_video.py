#!/usr/bin/env python3
"""Decode and record representative frames from the finished local MP4."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "music-quality-demo.mp4"
OUT = BUNDLE / "video-review"
OUT.mkdir(parents=True, exist_ok=True)
metadata = json.loads(subprocess.check_output([
    "ffprobe", "-v", "error", "-show_entries", "format=duration:stream=width,height,codec_name,avg_frame_rate",
    "-of", "json", str(VIDEO),
], text=True))
stream = next(stream for stream in metadata["streams"] if stream.get("codec_name") == "h264")
duration = float(metadata["format"]["duration"])
times = [1.5, 4.5, 7.5, 10.5, 13.5, 16.5]
frames = []
for i, second in enumerate(times, 1):
    path = OUT / f"frame-{i:02d}.png"
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(second),
        "-i", str(VIDEO), "-frames:v", "1", str(path),
    ], check=True)
    frames.append(Image.open(path).convert("RGB"))

thumb_w, thumb_h = 480, 270
sheet = Image.new("RGB", (thumb_w * 3, thumb_h * 2), "#101923")
for i, frame in enumerate(frames):
    frame.thumbnail((thumb_w, thumb_h), Image.Resampling.LANCZOS)
    x, y = (i % 3) * thumb_w, (i // 3) * thumb_h
    sheet.paste(frame, (x, y))
sheet.save(OUT / "contact-sheet.png", optimize=True)

report = {
    "video": str(VIDEO.relative_to(ROOT)),
    "durationSeconds": duration,
    "width": stream["width"],
    "height": stream["height"],
    "codec": stream["codec_name"],
    "frameRate": stream["avg_frame_rate"],
    "decodedSamplesSeconds": times,
    "sampleCount": len(frames),
    "contactSheet": str((OUT / "contact-sheet.png").relative_to(ROOT)),
    "review": "Decoded from final H.264 MP4; visual review pending.",
}
(BUNDLE / "video-inspection.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
