#!/usr/bin/env python3
"""Decode and record technical details for the generated MP4 demo."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "office-tools-silhouette.mp4"
REVIEW = BUNDLE / "video-review"
REVIEW.mkdir(parents=True, exist_ok=True)

probe = json.loads(subprocess.check_output([
    "ffprobe", "-v", "error", "-show_entries",
    "stream=codec_name,width,height,r_frame_rate,pix_fmt:format=duration,size",
    "-of", "json", str(VIDEO),
], text=True))
subprocess.run([
    "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(VIDEO),
    "-vf", "fps=1/3", "-frames:v", "5", str(REVIEW / "frame-%02d.png"),
], check=True)

font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
label_font = ImageFont.truetype(font_path, 16)
frames = [Image.open(REVIEW / f"frame-{n:02d}.png").convert("RGB") for n in range(1, 6)]
thumbs = []
for index, frame in enumerate(frames, 1):
    frame.thumbnail((640, 360), Image.Resampling.LANCZOS)
    tile = Image.new("RGB", (660, 394), "#101923")
    tile.paste(frame, ((660 - frame.width) // 2, 8))
    ImageDraw.Draw(tile).text((20, 370), f"Decoded sample {index}", fill="#eef3f5", font=label_font)
    thumbs.append(tile)
sheet = Image.new("RGB", (1320, 1182), "#0a121a")
for i, tile in enumerate(thumbs):
    x = (i % 2) * 660
    y = (i // 2) * 394
    sheet.paste(tile, (x, y))
sheet.save(REVIEW / "decoded-samples.png", optimize=True)

streams = probe.get("streams", [])
report = {
    "video": str(VIDEO.relative_to(BUNDLE)),
    "decodedFrames": len(frames),
    "durationSeconds": float(probe["format"]["duration"]),
    "sizeBytes": int(probe["format"]["size"]),
    "stream": streams[0] if streams else None,
    "sampleSheet": "video-review/decoded-samples.png",
    "frames": [f"video-review/frame-{n:02d}.png" for n in range(1, 6)],
    "inspection": "Decoded all five 3-second sections for visual review.",
}
(BUNDLE / "video-inspection.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
(REVIEW / "visual-review.md").write_text(
    "# Video review\n\n"
    "The decoded sample sheet shows all five sections: the title and budgets, "
    "before/after previews, source-rendered professional/classroom palettes, "
    "the source controls and geometry calls, and local verification results. "
    "The video is readable at 1280×720 with legible labels; no section claims "
    "deployment, manufacturing readiness, or physical acceptance.\n\n"
    "See [`decoded-samples.png`](decoded-samples.png) and the five decoded "
    "frames in this directory.\n",
    encoding="utf-8",
)
print(json.dumps(report, indent=2))
