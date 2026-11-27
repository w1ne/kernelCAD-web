#!/usr/bin/env python3
"""Probe the review MP4 and keep a contact sheet of representative frames."""
from pathlib import Path
import json
import subprocess

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent
VIDEO = ROOT / "review-demo.mp4"
OUT = ROOT / "video-review"
OUT.mkdir(parents=True, exist_ok=True)
probe = subprocess.run([
    "ffprobe", "-v", "error", "-show_entries", "format=duration",
    "-show_entries", "stream=codec_name,width,height,pix_fmt", "-of", "json", str(VIDEO),
], check=True, capture_output=True, text=True)
data = json.loads(probe.stdout)
stream = next(s for s in data["streams"] if s.get("codec_type", "video") == "video")
duration = float(data["format"]["duration"])
frames = []
for i, second in enumerate((1.0, 6.0, 11.0), start=1):
    target = OUT / f"frame-{i:02d}.png"
    subprocess.run(["ffmpeg", "-y", "-ss", str(second), "-i", str(VIDEO), "-frames:v", "1", str(target)], check=True, capture_output=True, text=True)
    frames.append(target)
thumbs = [ImageOps.contain(Image.open(p).convert("RGB"), (640, 360), Image.Resampling.LANCZOS) for p in frames]
sheet = Image.new("RGB", (1280, 760), (246, 248, 250))
draw = ImageDraw.Draw(sheet)
font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
font = ImageFont.truetype(font_path, 18)
positions = [(0, 20), (640, 20), (320, 390)]
for thumb, (x, y) in zip(thumbs, positions, strict=True):
    sheet.paste(thumb, (x, y))
contact = OUT / "contact-sheet.png"
sheet.save(contact)
report = {
    "video": VIDEO.name, "codec": stream.get("codec_name"), "pixelFormat": stream.get("pix_fmt"),
    "width": stream.get("width"), "height": stream.get("height"), "durationSeconds": round(duration, 3),
    "representativeFramesSeconds": [1, 6, 11], "contactSheet": contact.name,
    "passed": stream.get("codec_name") == "h264" and stream.get("width") == 1280 and stream.get("height") == 720 and duration >= 14,
}
(OUT / "inspection.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
if not report["passed"]:
    raise SystemExit(1)
