#!/usr/bin/env python3
"""Decode and inspect structural properties of the local demo video."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw


OUT = Path(__file__).resolve().parent
VIDEO = OUT / "standard-components-installation-quality.mp4"
REVIEW = OUT / "video-review"
REVIEW.mkdir(exist_ok=True)
review_notes_path = REVIEW / "review-notes.md"

probe = subprocess.run(
    [
        "ffprobe", "-v", "error", "-show_entries",
        "format=duration:stream=codec_name,width,height,r_frame_rate",
        "-of", "json", str(VIDEO),
    ],
    check=True,
    capture_output=True,
    text=True,
)
metadata = json.loads(probe.stdout)
stream = next(row for row in metadata["streams"] if row.get("codec_name") == "h264")
duration = float(metadata["format"]["duration"])
samples = []
for index in range(6):
    timestamp = 1.25 + index * 2.5
    path = REVIEW / f"sample-{index + 1:02d}.png"
    subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", str(timestamp), "-i", str(VIDEO), "-frames:v", "1", str(path)],
        check=True,
    )
    with Image.open(path) as image:
        image.load()
        samples.append(image.convert("RGB"))

thumbs = []
for index, sample in enumerate(samples):
    sample.thumbnail((400, 225), Image.Resampling.LANCZOS)
    tile = Image.new("RGB", (400, 250), (255, 255, 255))
    tile.paste(sample, ((400 - sample.width) // 2, 0))
    ImageDraw.Draw(tile).text((12, 229), f"sample {index + 1} · {1.25 + index * 2.5:.2f}s", fill=(25, 39, 58))
    thumbs.append(tile)
sheet = Image.new("RGB", (1224, 512), (238, 243, 248))
for index, thumb in enumerate(thumbs):
    sheet.paste(thumb, (8 + (index % 3) * 408, 8 + (index // 3) * 252))
sheet.save(REVIEW / "decoded-samples.png")

report = {
    "video": str(VIDEO.relative_to(OUT)),
    "durationSeconds": duration,
    "codec": stream["codec_name"],
    "width": stream["width"],
    "height": stream["height"],
    "frameRate": stream["r_frame_rate"],
    "decodedSamples": [path.name for path in sorted(REVIEW.glob("sample-*.png"))],
    "contactSheet": "video-review/decoded-samples.png",
    "structuralChecksPass": stream["width"] == 1280 and stream["height"] == 720 and stream["codec_name"] == "h264" and 14.8 <= duration <= 15.2 and len(samples) == 6,
    "humanVisualReview": "passed" if review_notes_path.is_file() else "pending",
    "reviewNotes": "video-review/review-notes.md" if review_notes_path.is_file() else None,
}
(OUT / "mp4-inspection.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
if not report["structuralChecksPass"]:
    raise SystemExit(1)
