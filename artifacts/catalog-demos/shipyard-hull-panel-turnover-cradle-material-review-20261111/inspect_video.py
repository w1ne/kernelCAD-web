#!/usr/bin/env python3
"""Sample and inspect the generated MP4; produce a visual review contact sheet."""

import json
from pathlib import Path
import subprocess

from PIL import Image, ImageOps, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
VIDEO = HERE / "shipyard-hull-panel-turnover-cradle-material-review.mp4"
OUT = HERE / "video-review"
OUT.mkdir(exist_ok=True)

probe = subprocess.run([
    "ffprobe", "-v", "error", "-show_entries", "format=duration,size:stream=width,height,codec_name",
    "-of", "json", str(VIDEO),
], check=True, capture_output=True, text=True)
metadata = json.loads(probe.stdout)
duration = float(metadata["format"]["duration"])
assert 10 <= duration <= 20, f"unexpected demo duration: {duration}"

samples = []
for name, at in (("before", 1.0), ("comparison", 6.0), ("checks", min(12.0, duration - 0.5))):
    path = OUT / f"{name}.png"
    subprocess.run([
        "ffmpeg", "-y", "-ss", str(at), "-i", str(VIDEO), "-frames:v", "1", str(path),
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    image = Image.open(path).convert("RGB")
    assert image.size == (1280, 720)
    samples.append((name, image))

sheet = Image.new("RGB", (1280, 810), (245, 247, 249))
draw = ImageDraw.Draw(sheet)
try:
    label_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 20)
except OSError:
    label_font = ImageFont.load_default()
for index, (name, image) in enumerate(samples):
    thumb = image.resize((400, 225), Image.Resampling.LANCZOS)
    x = 20 + index * 420
    sheet.paste(thumb, (x, 40))
    draw.text((x, 278), name, fill=(28, 42, 55), font=label_font)
sheet.save(OUT / "contact-sheet.png")

record = {
    "video": VIDEO.name,
    "durationSeconds": round(duration, 3),
    "sizeBytes": metadata["format"].get("size"),
    "streams": metadata.get("streams", []),
    "sampledFrames": [
        {"name": name, "timeSeconds": at, "file": f"video-review/{name}.png"}
        for name, at in (("before", 1.0), ("comparison", 6.0), ("checks", min(12.0, duration - 0.5)))
    ],
    "visualInspection": "Contact sheet generated from decoded MP4 frames; read manually before handoff.",
}
(HERE / "video-inspection.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
print(json.dumps(record, indent=2))
