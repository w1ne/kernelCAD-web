#!/usr/bin/env python3
"""Inspect MP4 metadata and representative frames; retain the evidence."""

import json
from pathlib import Path
import subprocess
from PIL import Image, ImageDraw, ImageFont

BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "grid-substation-demo.mp4"
SHEET = BUNDLE / "preview-review/demo-frame-contact-sheet.png"
if not VIDEO.is_file():
    raise SystemExit("demo MP4 is missing")
probe = subprocess.run([
    "ffprobe", "-v", "error", "-show_entries", "format=duration,size:stream=codec_name,width,height,r_frame_rate",
    "-of", "json", str(VIDEO),
], capture_output=True, text=True, check=True)
metadata = json.loads(probe.stdout)
stream = next(item for item in metadata["streams"] if item.get("codec_type", "video") == "video")
duration = float(metadata["format"]["duration"])
if not (14 <= duration <= 17) or stream.get("width") != 1280 or stream.get("height") != 720:
    raise SystemExit(f"unexpected demo encoding metadata: duration={duration}, stream={stream}")

shots = []
for index, second in enumerate((2, 7, 12), start=1):
    image_path = BUNDLE / "preview-review" / f"demo-inspect-{index}.png"
    subprocess.run([
        "ffmpeg", "-y", "-ss", str(second), "-i", str(VIDEO), "-frames:v", "1",
        "-vf", "scale=480:270", str(image_path),
    ], capture_output=True, text=True, check=True)
    shots.append(Image.open(image_path).convert("RGB"))

sheet = Image.new("RGB", (480 * 3, 300), "#e9ece9")
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
labels = ["Hub search", "Asset detail", "Scale variant"]
for i, (image, label) in enumerate(zip(shots, labels)):
    sheet.paste(image, (480 * i, 0))
    draw.text((480 * i + 12, 276), label, fill="#18312f", font=font)
sheet.save(SHEET)

report = {
    "video": VIDEO.name,
    "bytes": VIDEO.stat().st_size,
    "durationSeconds": round(duration, 3),
    "codec": stream.get("codec_name"),
    "width": stream.get("width"),
    "height": stream.get("height"),
    "frameRate": stream.get("r_frame_rate"),
    "hasAudio": any(item.get("codec_type") == "audio" for item in metadata["streams"]),
    "representativeFrames": ["2s hub search", "7s asset detail", "12s scale variant"],
    "visualInspectionSheet": str(SHEET.relative_to(BUNDLE)),
}
report["passed"] = report["codec"] == "h264" and report["hasAudio"] is False and 14 <= duration <= 17
(BUNDLE / "demo-inspection.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
if not report["passed"]:
    raise SystemExit("MP4 inspection failed")
