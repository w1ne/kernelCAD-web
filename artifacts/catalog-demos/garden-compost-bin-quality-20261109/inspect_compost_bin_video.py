#!/usr/bin/env python3
"""Probe the demo MP4, decode four samples, and build a review contact sheet."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


OUT = Path(__file__).resolve().parent
VIDEO = OUT / "compost-bin-quality.mp4"
REVIEW = OUT / "video-review"
REVIEW.mkdir(parents=True, exist_ok=True)


def run(args: list[str]) -> str:
    result = subprocess.run(args, check=True, capture_output=True, text=True)
    return result.stdout


probe = json.loads(run([
    "ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
    "stream=codec_name,width,height,r_frame_rate,pix_fmt,duration", "-of", "json", str(VIDEO),
]))
stream = probe["streams"][0]
if stream["codec_name"] != "h264" or stream["width"] != 1280 or stream["height"] != 720:
    raise SystemExit(f"unexpected video stream: {stream}")
if stream["r_frame_rate"] != "30/1" or stream["pix_fmt"] != "yuv420p":
    raise SystemExit(f"unexpected frame settings: {stream}")

samples = []
for index, seconds in enumerate([1.5, 4.5, 7.5, 10.5], start=1):
    image_path = REVIEW / f"sample-{index}.png"
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", str(seconds), "-i", str(VIDEO), "-frames:v", "1", str(image_path)])
    digest = hashlib.sha256(image_path.read_bytes()).hexdigest()
    samples.append({"second": seconds, "path": image_path.name, "sha256": digest})

font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 17)
sheet = Image.new("RGB", (1280, 760), (236, 242, 248))
draw = ImageDraw.Draw(sheet)
for index, sample in enumerate(samples):
    x = (index % 2) * 640
    y = (index // 2) * 380
    image = Image.open(REVIEW / sample["path"]).convert("RGB").resize((620, 349), Image.Resampling.LANCZOS)
    sheet.paste(image, (x + 10, y + 10))
    draw.text((x + 12, y + 359), f"decoded sample at {sample['second']} s", font=font, fill=(25, 39, 58))
sheet.save(REVIEW / "contact-sheet.png")

report = {"file": VIDEO.name, "bytes": VIDEO.stat().st_size, "stream": stream, "samples": samples,
          "contactSheet": "video-review/contact-sheet.png"}
(OUT / "mp4-inspection.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
