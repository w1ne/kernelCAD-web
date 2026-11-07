#!/usr/bin/env python3
"""Decode the generated MP4 and retain a contact sheet for visual review."""

import argparse
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw

BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "apiary-kit.mp4"
parser = argparse.ArgumentParser()
parser.add_argument("--manual-inspection-passed", action="store_true")
args = parser.parse_args()

probe = json.loads(subprocess.check_output([
    "ffprobe", "-v", "error", "-show_entries", "format=duration:stream=width,height,avg_frame_rate,pix_fmt",
    "-of", "json", str(VIDEO),
], text=True))
stream = next(item for item in probe["streams"] if item.get("codec_type", "video") == "video")
decoded = BUNDLE / "video-review" / "decoded"
decoded.mkdir(parents=True, exist_ok=True)
subprocess.run([
    "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(VIDEO),
    "-vf", "fps=1/3", str(decoded / "frame-%02d.png"),
], check=True)
frames = sorted(decoded.glob("frame-*.png"))
if len(frames) != 10:
    raise SystemExit(f"expected 10 decoded demo frames, found {len(frames)}")

thumb_w, thumb_h, margin = 384, 216, 12
sheet = Image.new("RGB", (5 * thumb_w + 6 * margin, 2 * (thumb_h + 24) + 3 * margin), "#111923")
draw = ImageDraw.Draw(sheet)
for index, path in enumerate(frames):
    image = Image.open(path).convert("RGB")
    image.thumbnail((thumb_w, thumb_h), Image.Resampling.LANCZOS)
    col, row = index % 5, index // 5
    x, y = margin + col * (thumb_w + margin), margin + row * (thumb_h + 24 + margin)
    sheet.paste(image, (x, y))
    draw.text((x, y + thumb_h + 3), f"Frame {index + 1:02d}", fill="#eef3f5")
sheet.save(BUNDLE / "video-review" / "contact-sheet.png", optimize=True)

result = {
    "video": str(VIDEO.relative_to(BUNDLE)),
    "durationSeconds": round(float(probe["format"]["duration"]), 2),
    "width": stream["width"],
    "height": stream["height"],
    "frameRate": stream["avg_frame_rate"],
    "pixelFormat": stream["pix_fmt"],
    "decodedFrames": len(frames),
    "contactSheet": "video-review/contact-sheet.png",
    "manualInspectionPassed": args.manual_inspection_passed,
}
(BUNDLE / "video-review" / "video-inspection.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
