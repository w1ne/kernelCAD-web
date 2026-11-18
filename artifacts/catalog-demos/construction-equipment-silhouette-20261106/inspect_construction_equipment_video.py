#!/usr/bin/env python3
"""Decode, sample and contact-sheet the construction-equipment demo video."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "construction-equipment-silhouette-refinement.mp4"
REVIEW = BUNDLE / "video-review"
REVIEW.mkdir(parents=True, exist_ok=True)

probe = subprocess.run(
    [
        "ffprobe", "-v", "error", "-show_entries",
        "format=duration,size:stream=codec_name,width,height,r_frame_rate",
        "-of", "json", str(VIDEO),
    ],
    check=True,
    capture_output=True,
    text=True,
)
metadata = json.loads(probe.stdout)
subprocess.run(["ffmpeg", "-v", "error", "-i", str(VIDEO), "-f", "null", "-"], check=True)
for path in REVIEW.glob("sample-*.png"):
    path.unlink()
subprocess.run(
    [
        "ffmpeg", "-y", "-v", "error", "-i", str(VIDEO),
        "-vf", "fps=1/3", "-frames:v", "7",
        str(REVIEW / "sample-%02d.png"),
    ],
    check=True,
)

samples = sorted(REVIEW.glob("sample-*.png"))
if len(samples) != 7:
    raise SystemExit(f"expected 7 decoded video samples, found {len(samples)}")

font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
label_font = ImageFont.truetype(font_path, 15) if Path(font_path).exists() else ImageFont.load_default()
sheet = Image.new("RGB", (1320, 420), "#101827")
draw = ImageDraw.Draw(sheet)
for index, sample in enumerate(samples):
    col = index % 4
    row = index // 4
    x = 12 + col * 327
    y = 12 + row * 204
    with Image.open(sample) as original:
        thumb = original.convert("RGB").resize((315, 177), Image.Resampling.LANCZOS)
    sheet.paste(thumb, (x, y))
    draw.text((x + 3, y + 179), f"sample {index + 1} · {index * 3}s", font=label_font, fill="#edf2f7")
sheet.save(REVIEW / "contact-sheet.png")

review = {
    "status": "decoded",
    "video": str(VIDEO.relative_to(BUNDLE)),
    "metadata": metadata,
    "sampleCount": len(samples),
    "samples": [path.name for path in samples],
    "contactSheet": "video-review/contact-sheet.png",
    "visualNotes": [
        "Before/after cards use the retained original previews and the final kit previews.",
        "Palette cards show the highVisibility source preset in distinct material zones.",
        "Shape-choice cards show the rendered mast/lamp, rotor, bin-count and silo-height changes.",
        "The final frame distinguishes local source renders and checks from deployment and equipment acceptance.",
    ],
}
(REVIEW / "review.json").write_text(json.dumps(review, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"status": review["status"], "sampleCount": len(samples), "contactSheet": review["contactSheet"], "metadata": metadata}, indent=2))
