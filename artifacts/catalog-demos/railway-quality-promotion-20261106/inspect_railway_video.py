#!/usr/bin/env python3
"""Decode the MP4 demo and retain sampled frames and inspection metadata."""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "railway-quality-promotion.mp4"
OUT = BUNDLE / "video-review"
parser = argparse.ArgumentParser()
parser.add_argument("--manual-inspection-passed", action="store_true")
args = parser.parse_args()

if not VIDEO.is_file():
    raise SystemExit(f"missing video: {VIDEO}")
OUT.mkdir(parents=True, exist_ok=True)
for old in OUT.glob("decoded-*.png"):
    old.unlink()

subprocess.run([
    "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(VIDEO),
    "-vf", "fps=1/3,scale=480:-1", "-frames:v", "6", str(OUT / "decoded-%02d.png"),
], check=True)
frames = sorted(OUT.glob("decoded-*.png"))
if len(frames) != 6:
    raise SystemExit(f"expected 6 frames, got {len(frames)}")

thumb_w, thumb_h, columns = 480, 270, 2
sheet = Image.new("RGB", (thumb_w * columns, thumb_h * 3), "#17232d")
draw = ImageDraw.Draw(sheet)
label_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 15)
for index, path in enumerate(frames):
    frame = Image.open(path).convert("RGB")
    frame.thumbnail((thumb_w, thumb_h - 22), Image.Resampling.LANCZOS)
    x, y = (index % columns) * thumb_w, (index // columns) * thumb_h
    sheet.paste(frame, (x, y))
    draw.text((x + 8, y + thumb_h - 20), f"sample {index + 1:02d}", fill="#eef3f5", font=label_font)
sheet.save(OUT / "contact-sheet.png", optimize=True)

probe = json.loads(subprocess.check_output([
    "ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(VIDEO),
], text=True))
stream = next(item for item in probe["streams"] if item["codec_type"] == "video")
report = {
    "video": str(VIDEO.relative_to(ROOT)),
    "bytes": VIDEO.stat().st_size,
    "sha256": hashlib.sha256(VIDEO.read_bytes()).hexdigest(),
    "codec": stream["codec_name"],
    "width": stream["width"],
    "height": stream["height"],
    "pixelFormat": stream["pix_fmt"],
    "durationSeconds": float(probe["format"]["duration"]),
    "sampledFrames": [str(path.relative_to(ROOT)) for path in frames],
    "contactSheet": str((OUT / "contact-sheet.png").relative_to(ROOT)),
    "manualVisualInspection": args.manual_inspection_passed,
}
(OUT / "video-inspection.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
