#!/usr/bin/env python3
"""Decode representative MP4 frames and write a compact inspection record."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "grid-substation-silhouette-refinement.mp4"
REVIEW = BUNDLE / "video-review"
REVIEW.mkdir(exist_ok=True)

probe = json.loads(subprocess.check_output([
    "ffprobe", "-v", "error", "-show_entries", "format=duration,size",
    "-show_entries", "stream=width,height,codec_name", "-of", "json", str(VIDEO),
], text=True))
stream = probe["streams"][0]
frames = []
for number, second in enumerate((1, 4, 7, 10, 13), start=1):
    output = REVIEW / f"decoded-{number:02d}.png"
    subprocess.run([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", str(second),
        "-i", str(VIDEO), "-frames:v", "1", str(output),
    ], check=True)
    with Image.open(output) as image:
        frames.append({"timeSeconds": second, "path": output.name, "width": image.width, "height": image.height})

font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
thumbs = []
for frame in frames:
    image = Image.open(REVIEW / frame["path"]).convert("RGB")
    thumbs.append(ImageOps.contain(image, (480, 270), method=Image.Resampling.LANCZOS))
contact = Image.new("RGB", (1000, 880), (232, 238, 243))
draw = ImageDraw.Draw(contact)
for index, image in enumerate(thumbs):
    x = 10 + (index % 2) * 495
    y = 28 + (index // 2) * 286
    contact.paste(image, (x, y))
    draw.text((x, y - 20), f"{frames[index]['timeSeconds']}s", font=font, fill=(32, 45, 57))
contact_path = REVIEW / "contact-sheet.png"
contact.save(contact_path, optimize=True)

record = {
    "video": VIDEO.name,
    "durationSeconds": float(probe["format"]["duration"]),
    "bytes": int(probe["format"]["size"]),
    "codec": stream["codec_name"],
    "width": stream["width"],
    "height": stream["height"],
    "decodedFrames": frames,
    "contactSheet": contact_path.relative_to(BUNDLE).as_posix(),
    "inspectionMethod": "ffprobe metadata plus five decoded frames for visual inspection",
}
(BUNDLE / "video-inspection.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
print(json.dumps(record, indent=2))
