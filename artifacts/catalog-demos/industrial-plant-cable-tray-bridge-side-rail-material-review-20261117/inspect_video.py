#!/usr/bin/env python3
"""Decode and assemble representative frames for a visual MP4 check."""

from pathlib import Path
import shutil
import subprocess

from PIL import Image, ImageDraw, ImageFont


BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "industrial-plant-cable-tray-bridge-side-rail-material-review.mp4"
OUT = BUNDLE / "video-review"
OUT.mkdir(exist_ok=True)
ffmpeg = shutil.which("ffmpeg")
if not ffmpeg:
    raise SystemExit("ffmpeg is required to decode the review frames")

font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
labels = ["Preview audit · 2.5 s", "Before / after · 7.5 s", "Checks · 12.5 s"]
frames = []
for index, seconds in enumerate((2.5, 7.5, 12.5), start=1):
    path = OUT / f"frame-{index:02d}.png"
    subprocess.run([
        ffmpeg, "-y", "-v", "error", "-ss", str(seconds), "-i", str(VIDEO),
        "-frames:v", "1", str(path),
    ], check=True)
    frames.append(Image.open(path).convert("RGB"))

thumb_w, thumb_h = 640, 360
sheet = Image.new("RGB", (thumb_w * 3, thumb_h + 52), "#eaf1f6")
draw = ImageDraw.Draw(sheet)
for index, (frame, label) in enumerate(zip(frames, labels, strict=True)):
    frame.thumbnail((thumb_w, thumb_h), Image.Resampling.LANCZOS)
    sheet.paste(frame, (index * thumb_w, 0))
    draw.text((index * thumb_w + 12, thumb_h + 12), label, font=font, fill="#183044")

target = OUT / "contact-sheet.png"
sheet.save(target)
print(target.relative_to(BUNDLE))
