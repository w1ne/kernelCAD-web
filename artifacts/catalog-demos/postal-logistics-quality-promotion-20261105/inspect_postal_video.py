#!/usr/bin/env python3
"""Decode the MP4 and create a contact sheet for visual inspection."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "postal-logistics-quality-promotion.mp4"
REVIEW = BUNDLE / "video-review"
REVIEW.mkdir(parents=True, exist_ok=True)
probe = json.loads(subprocess.check_output([
    "ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
    "stream=codec_name,width,height,r_frame_rate,pix_fmt:format=duration", "-of", "json", str(VIDEO),
], text=True))
stream = probe["streams"][0]
subprocess.run([
    "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(VIDEO),
    "-vf", "fps=1/4", "-frames:v", "6", str(REVIEW / "decoded-%02d.png"),
], check=True)
files = sorted(REVIEW.glob("decoded-*.png"))
if len(files) != 6:
    raise SystemExit(f"expected six decoded review frames, got {len(files)}")
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18)
thumb_w, thumb_h = 600, 337
sheet = Image.new("RGB", (thumb_w * 2 + 36, (thumb_h + 44) * 3 + 32), "#101820")
draw = ImageDraw.Draw(sheet)
for index, path in enumerate(files):
    image = Image.open(path).convert("RGB")
    image.thumbnail((thumb_w, thumb_h), Image.Resampling.LANCZOS)
    col, row = index % 2, index // 2
    x, y = 12 + col * (thumb_w + 12), 12 + row * (thumb_h + 44)
    sheet.paste(image, (x, y))
    draw.text((x, y + thumb_h + 5), f"decoded {index + 1:02d} · t={index * 4}s", fill="#f1f4f5", font=font)
sheet.save(REVIEW / "contact-sheet.png", optimize=True)
result = {
    "video": VIDEO.name,
    "codec": stream["codec_name"],
    "width": stream["width"],
    "height": stream["height"],
    "frameRate": stream["r_frame_rate"],
    "pixelFormat": stream["pix_fmt"],
    "durationSeconds": round(float(probe["format"]["duration"]), 2),
    "decodedReviewFrames": len(files),
    "visualReview": "All six decoded cards are assembled in video-review/contact-sheet.png for direct inspection.",
}
(REVIEW / "video-inspection.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
