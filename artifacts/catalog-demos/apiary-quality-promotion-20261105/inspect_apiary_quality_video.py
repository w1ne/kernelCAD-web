#!/usr/bin/env python3
"""Decode the MP4 and assemble a contact sheet for visual review."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "apiary-quality-promotion.mp4"
REVIEW = BUNDLE / "video-review"
REVIEW.mkdir(exist_ok=True)
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 13)

probe = json.loads(
    subprocess.check_output(
        [
            "ffprobe", "-v", "error", "-show_entries",
            "format=duration:stream=codec_name,width,height,r_frame_rate,nb_frames",
            "-of", "json", str(VIDEO),
        ],
        text=True,
    )
)
subprocess.run(
    [
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(VIDEO),
        "-vf", "fps=1/3.4", "-frames:v", "6", str(REVIEW / "decoded-%02d.png"),
    ],
    check=True,
)

frames = sorted(REVIEW.glob("decoded-*.png"))
if len(frames) < 5:
    raise SystemExit(f"expected at least five decoded frames, got {len(frames)}")

tile_w, tile_h = 420, 256
sheet = Image.new("RGB", (tile_w * 3, tile_h * 2), "#111923")
for i, path in enumerate(frames):
    image = Image.open(path).convert("RGB")
    image.thumbnail((tile_w - 12, tile_h - 32), Image.Resampling.LANCZOS)
    x, y = (i % 3) * tile_w, (i // 3) * tile_h
    sheet.paste(image, (x + (tile_w - image.width) // 2, y + 4))
    ImageDraw.Draw(sheet).text((x + 12, y + tile_h - 23), path.name, fill="#eef3f5", font=font)
sheet.save(REVIEW / "contact-sheet.png", optimize=True)

result = {
    "video": VIDEO.name,
    "probe": probe,
    "decodedFrames": len(frames),
    "contactSheet": "video-review/contact-sheet.png",
    "visuallyReviewed": False,
}
(BUNDLE / "video-inspection.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
