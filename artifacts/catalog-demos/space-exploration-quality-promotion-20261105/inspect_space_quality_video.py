#!/usr/bin/env python3
"""Decode and summarize the generated MP4 for visual inspection."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageOps, ImageDraw, ImageFont


BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "space-exploration-quality-promotion.mp4"
REVIEW = BUNDLE / "video-review"
REVIEW.mkdir(exist_ok=True)

probe = json.loads(subprocess.check_output([
    "ffprobe", "-v", "error", "-show_entries",
    "format=duration:stream=codec_name,width,height,r_frame_rate,nb_frames",
    "-of", "json", str(VIDEO),
], text=True))
subprocess.run([
    "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(VIDEO),
    "-vf", "fps=2/5", "-frames:v", "7", str(REVIEW / "decoded-%02d.png"),
], check=True)

frames = sorted(REVIEW.glob("decoded-*.png"))
if len(frames) != 7:
    raise SystemExit(f"expected 7 decoded frames, got {len(frames)}")
thumbs = []
for path in frames:
    image = Image.open(path).convert("RGB")
    image.thumbnail((480, 270), Image.Resampling.LANCZOS)
    tile = Image.new("RGB", (500, 300), "#19232c")
    tile.paste(image, ((500-image.width)//2, 6))
    ImageDraw.Draw(tile).text((12, 279), path.name, fill="#eef3f5", font=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 13))
    thumbs.append(tile)
sheet = Image.new("RGB", (1000, 900), "#111923")
for i, tile in enumerate(thumbs):
    sheet.paste(tile, ((i % 2) * 500, (i // 2) * 300))
sheet.save(REVIEW / "contact-sheet.png", optimize=True)
result = {"video": VIDEO.name, "probe": probe, "decodedFrames": len(frames), "contactSheet": "video-review/contact-sheet.png"}
(BUNDLE / "video-inspection.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
