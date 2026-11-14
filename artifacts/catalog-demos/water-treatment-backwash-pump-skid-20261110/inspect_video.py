#!/usr/bin/env python3
"""Decode the MP4, inspect stream metadata and save a frame contact sheet."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw


BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "backwash-pump-skid-demo.mp4"
OUT = BUNDLE / "video-review"
OUT.mkdir(parents=True, exist_ok=True)

probe = json.loads(subprocess.run([
    "ffprobe", "-v", "error", "-show_entries",
    "stream=codec_name,width,height,pix_fmt,r_frame_rate:format=duration,format_name",
    "-of", "json", str(VIDEO),
], check=True, capture_output=True, text=True).stdout)
streams = probe.get("streams", [])
video_stream = next((stream for stream in streams if stream.get("codec_name")), {})
subprocess.run([
    "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(VIDEO),
    "-vf", "fps=1/3", "-vsync", "0", "-frames:v", "5",
    str(OUT / "decoded-%02d.png"),
], check=True)
decoded = sorted(OUT.glob("decoded-*.png"))
images = [Image.open(path).convert("RGB") for path in decoded]
if not images:
    raise SystemExit("MP4 decode produced no frames")

thumb_w, thumb_h = 480, 270
sheet = Image.new("RGB", (thumb_w * 2, (thumb_h + 30) * 3), "#101923")
draw = ImageDraw.Draw(sheet)
for index, image in enumerate(images):
    image.thumbnail((thumb_w, thumb_h), Image.Resampling.LANCZOS)
    x = (index % 2) * thumb_w
    y = (index // 2) * (thumb_h + 30)
    sheet.paste(image, (x, y))
    draw.text((x + 8, y + thumb_h + 5), f"decoded frame {index + 1}", fill="#eef3f5")
sheet_path = OUT / "contact-sheet.png"
sheet.save(sheet_path, optimize=True)

duration = float(probe.get("format", {}).get("duration", 0))
inspection = {
    "video": str(VIDEO.relative_to(BUNDLE)),
    "probe": probe,
    "decodedFrames": [str(path.relative_to(BUNDLE)) for path in decoded],
    "contactSheet": str(sheet_path.relative_to(BUNDLE)),
    "checks": {
        "h264": video_stream.get("codec_name") == "h264",
        "1280x720": video_stream.get("width") == 1280 and video_stream.get("height") == 720,
        "durationApproximately15Seconds": 14.9 <= duration <= 15.1,
        "allFiveFramesDecoded": len(decoded) == 5,
    },
}
inspection["pass"] = all(inspection["checks"].values())
(OUT / "inspection.json").write_text(json.dumps(inspection, indent=2) + "\n", encoding="utf-8")
print(json.dumps(inspection, indent=2))
if not inspection["pass"]:
    raise SystemExit(1)
