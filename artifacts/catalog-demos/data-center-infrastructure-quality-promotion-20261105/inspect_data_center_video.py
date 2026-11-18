#!/usr/bin/env python3
"""Decode and record representative video frames for visual review."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

bundle = Path(__file__).resolve().parent
video = bundle / "data-center-infrastructure-quality-promotion.mp4"
review = bundle / "video-review"
review.mkdir(exist_ok=True)
metadata = json.loads(subprocess.run([
    "ffprobe", "-v", "error", "-show_entries", "format=duration,size:stream=width,height,codec_name,nb_frames",
    "-of", "json", str(video),
], check=True, capture_output=True, text=True).stdout)
stream = metadata["streams"][0]
if stream["width"] != 1280 or stream["height"] != 720 or stream["codec_name"] != "h264":
    raise SystemExit("unexpected demo format")

samples = []
for i, at in enumerate((1.5, 4.5, 7.5, 10.5, 13.5, 16.5), start=1):
    output = review / f"decoded-{i:02d}.png"
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(at),
        "-i", str(video), "-frames:v", "1", str(output),
    ], check=True)
    samples.append(output)

sheet = Image.new("RGB", (1280, 750), "#111923")
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 15)
for i, path in enumerate(samples):
    image = Image.open(path).convert("RGB")
    image.thumbnail((405, 225), Image.Resampling.LANCZOS)
    x = 16 + (i % 3) * 421
    y = 16 + (i // 3) * 365
    sheet.paste(image, (x, y))
    draw.text((x, y + 232), f"Sample {i + 1} · {i * 3}-{(i + 1) * 3}s", fill="#eef3f5", font=font)
sheet.save(review / "contact-sheet.png", optimize=True)
metadata.update({"video": video.name, "sampleSeconds": [1.5, 4.5, 7.5, 10.5, 13.5, 16.5], "decodedFrames": len(samples)})
(bundle / "video-inspection.json").write_text(json.dumps(metadata, indent=2) + "\n")
print(json.dumps(metadata, indent=2))
