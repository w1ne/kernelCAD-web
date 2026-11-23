#!/usr/bin/env python3
"""Extract review frames and a compact contact sheet from the handoff MP4."""
from pathlib import Path
import json
import subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
VIDEO = ROOT / "construction-portable-core-drill-bit-material-review.mp4"
OUT = ROOT / "video-review"
OUT.mkdir(exist_ok=True)
probe = subprocess.run([
    "ffprobe", "-v", "error", "-show_entries",
    "format=duration,size:stream=codec_name,width,height,r_frame_rate,pix_fmt",
    "-of", "json", str(VIDEO),
], check=True, capture_output=True, text=True)
metadata = json.loads(probe.stdout)
(OUT / "ffprobe.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
for index, second in enumerate((1, 7, 13), start=1):
    frame = OUT / f"frame-{index:02d}.png"
    subprocess.run([
        "ffmpeg", "-y", "-ss", str(second), "-i", str(VIDEO), "-frames:v", "1",
        "-update", "1", str(frame),
    ], check=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
try:
    font = ImageFont.truetype(font_path, 18)
except OSError:
    font = ImageFont.load_default()
frames = [Image.open(OUT / f"frame-{i:02d}.png").convert("RGB") for i in range(1, 4)]
thumbs = []
for frame in frames:
    frame.thumbnail((560, 315), Image.Resampling.LANCZOS)
    thumbs.append(frame.copy())
sheet = Image.new("RGB", (1200, 720), "white")
draw = ImageDraw.Draw(sheet)
for i, (frame, pos, label) in enumerate(zip(thumbs, ((24, 40), (616, 40), (320, 395)), ("00:01 · preview audit", "00:07 · before / after", "00:13 · verification and scope"), strict=True)):
    sheet.paste(frame, pos)
    draw.text((pos[0], pos[1] + 320), label, font=font, fill=(35, 49, 61))
sheet.save(OUT / "frames-contact-sheet.png")
print(json.dumps(metadata, indent=2))
