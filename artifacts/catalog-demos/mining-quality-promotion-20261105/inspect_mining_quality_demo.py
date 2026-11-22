#!/usr/bin/env python3
"""Decode and inspect representative frames from the generated MP4."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BUNDLE = Path(__file__).resolve().parent
video = BUNDLE / "mining-quality-promotion.mp4"
review = BUNDLE / "video-review"
review.mkdir(parents=True, exist_ok=True)
probe = json.loads(subprocess.check_output([
    "ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_name,width,height,nb_frames",
    "-of", "json", str(video),
], text=True))
stream = probe["streams"][0]
subprocess.run([
    "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(video),
    "-vf", "fps=1/3", "-frames:v", "6", str(review / "decoded-%02d.png"),
], check=True)
frames = sorted(review.glob("decoded-*.png"))
if len(frames) != 6:
    raise SystemExit(f"expected 6 decoded story frames, found {len(frames)}")

thumb_w, thumb_h = 480, 270
sheet = Image.new("RGB", (thumb_w * 2, thumb_h * 3), "#101b24")
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18)
for i, path in enumerate(frames):
    image = Image.open(path).convert("RGB")
    image.thumbnail((thumb_w, thumb_h), Image.Resampling.LANCZOS)
    x, y = (i % 2) * thumb_w, (i // 2) * thumb_h
    sheet.paste(image, (x, y))
    draw.rectangle((x, y + thumb_h - 28, x + thumb_w, y + thumb_h), fill="#101b24")
    draw.text((x + 10, y + thumb_h - 25), f"Decoded frame {i + 1}", fill="#f2f5f6", font=font)
sheet.save(review / "contact-sheet.png", optimize=True)

inspection = {
    "video": video.name,
    "durationSeconds": float(probe["format"]["duration"]),
    "codec": stream["codec_name"],
    "width": stream["width"],
    "height": stream["height"],
    "decodedStoryFrames": len(frames),
    "contactSheet": "video-review/contact-sheet.png",
    "visualInspection": "Contact sheet decoded for human review.",
}
(review / "video-inspection.json").write_text(json.dumps(inspection, indent=2) + "\n")
print(json.dumps(inspection, indent=2))
