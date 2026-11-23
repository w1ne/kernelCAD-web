#!/usr/bin/env python3
"""Decode the audit video and retain a contact sheet for visual inspection."""

import hashlib
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "industrial-plant-inline-flow-meter-material-review.mp4"
OUT = BUNDLE / "video-review"
TIMES = [0, 3, 6, 9, 12]

OUT.mkdir(parents=True, exist_ok=True)
probe = json.loads(subprocess.check_output([
    "ffprobe", "-v", "error", "-show_entries", "format=duration:stream=width,height,codec_name",
    "-of", "json", str(VIDEO),
], text=True))
stream = next(item for item in probe["streams"] if item.get("codec_name") == "h264")
duration = float(probe["format"]["duration"])
frames = []
for index, seconds in enumerate(TIMES, 1):
    path = OUT / f"decoded-{index:02d}.png"
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(seconds),
        "-i", str(VIDEO), "-frames:v", "1", str(path),
    ], check=True)
    image = Image.open(path).convert("RGB")
    if image.size != (stream["width"], stream["height"]):
        raise SystemExit(f"decoded frame has the wrong dimensions: {image.size}")
    frames.append(image)

sheet = Image.new("RGB", (1280, 520), "#101923")
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
for index, (seconds, image) in enumerate(zip(TIMES, frames)):
    image.thumbnail((400, 225), Image.Resampling.LANCZOS)
    x, y = 20 + (index % 3) * 420, 42 + (index // 3) * 255
    sheet.paste(image, (x, y))
    draw.text((x, y - 24), f"{seconds:02d}s", fill="#eef3f5", font=font)
sheet.save(OUT / "contact-sheet.png", optimize=True)
report = {
    "video": VIDEO.name,
    "decodedOn": datetime.now(timezone.utc).date().isoformat(),
    "codec": stream["codec_name"],
    "width": stream["width"],
    "height": stream["height"],
    "durationSeconds": round(duration, 3),
    "sampleTimesSeconds": TIMES,
    "decodedFrames": len(frames),
    "sampleSha256": [hashlib.sha256((OUT / f"decoded-{index:02d}.png").read_bytes()).hexdigest() for index in range(1, len(TIMES) + 1)],
    "manualReview": "Pending: inspect the decoded contact sheet before handoff.",
}
(OUT / "inspection.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"codec": report["codec"], "size": [report["width"], report["height"]], "durationSeconds": report["durationSeconds"], "decodedFrames": len(frames)}))
