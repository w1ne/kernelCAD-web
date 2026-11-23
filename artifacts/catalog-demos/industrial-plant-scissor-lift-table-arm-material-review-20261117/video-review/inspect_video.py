#!/usr/bin/env python3
"""Capture representative frames and ffprobe metadata for the handoff video."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent.parent
VIDEO = ROOT / "industrial-plant-scissor-lift-table-arm-material-review.mp4"
TIMES = [1.4, 4.2, 7.0, 9.8, 12.6]
LABELS = ["audit scope", "before", "after", "GLB regression", "local result"]


def font(size: int) -> ImageFont.FreeTypeFont:
    candidates = [
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
        Path("/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


metadata = subprocess.check_output(
    ["ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", str(VIDEO)],
    text=True,
)
(ROOT / "video-review" / "ffprobe.json").write_text(metadata + "\n", encoding="utf-8")

frames = []
for index, seconds in enumerate(TIMES, start=1):
    path = ROOT / "video-review" / f"frame-{index:02d}.png"
    subprocess.run(
        [
            "ffmpeg", "-y", "-v", "error", "-ss", str(seconds), "-i", str(VIDEO),
            "-frames:v", "1", str(path),
        ],
        check=True,
    )
    frames.append((path, Image.open(path).convert("RGB")))

sheet = Image.new("RGB", (1620, 720), (238, 242, 247))
draw = ImageDraw.Draw(sheet)
for index, (path, image) in enumerate(frames):
    col, row = index % 3, index // 3
    x, y = 20 + col * 535, 20 + row * 350
    image.thumbnail((515, 290), Image.Resampling.LANCZOS)
    sheet.paste(image, (x + (515 - image.width) // 2, y))
    draw.text((x, y + 298), f"{LABELS[index]} · {TIMES[index]:.1f}s · {path.name}", fill=(34, 48, 64), font=font(17))
sheet.save(ROOT / "video-review" / "frames-inspected.png", optimize=True)
