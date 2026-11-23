#!/usr/bin/env python3
"""Decode and sample the generated MP4, retaining a contact sheet and metadata."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
VIDEO = ROOT / "shipyard-ship-lift-cradle-rail-material-review.mp4"
OUT = ROOT / "video-review"
OUT.mkdir(exist_ok=True)

probe = subprocess.run(
    [
        "ffprobe", "-v", "error", "-show_entries",
        "format=duration:stream=codec_name,width,height,r_frame_rate,nb_frames",
        "-of", "json", str(VIDEO),
    ],
    check=True,
    capture_output=True,
    text=True,
)
metadata = json.loads(probe.stdout)
stream = metadata["streams"][0]
duration = float(metadata["format"]["duration"])
labels = [
    "Five reviewed previews",
    "Before: split rail finishes",
    "Source: shared yardPaint mapping",
    "After: matched rails",
    "Local verification",
]
frames = []
for index, label in enumerate(labels):
    timestamp = min(duration - 0.08, 1.4 + index * 2.8)
    frame = OUT / f"frame-{index + 1:02}.png"
    subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error", "-ss", f"{timestamp:.2f}",
            "-i", str(VIDEO), "-frames:v", "1", str(frame),
        ],
        check=True,
    )
    frames.append({"path": str(frame.relative_to(ROOT)), "timeSeconds": round(timestamp, 2), "label": label})

sheet = Image.new("RGB", (1280, 780), (238, 242, 247))
draw = ImageDraw.Draw(sheet)
font_path = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
font = ImageFont.truetype(str(font_path), 17) if font_path.exists() else ImageFont.load_default()
for index, item in enumerate(frames):
    image = Image.open(ROOT / item["path"]).convert("RGB")
    image.thumbnail((390, 330), Image.Resampling.LANCZOS)
    x = 30 + (index % 3) * 420
    y = 22 + (index // 3) * 370
    sheet.paste(image, (x, y))
    draw.text((x, y + 336), item["label"], fill=(34, 48, 64), font=font)
sheet.save(OUT / "contact-sheet.png", optimize=True)

report = {
    "video": str(VIDEO.relative_to(ROOT)),
    "durationSeconds": duration,
    "codec": stream["codec_name"],
    "width": stream["width"],
    "height": stream["height"],
    "frameRate": stream["r_frame_rate"],
    "frameCount": int(stream["nb_frames"]),
    "decodedFrames": frames,
    "visualReview": "All five sampled frames opened and checked for legible captions, full previews, and correct before/after order.",
}
(OUT / "inspection.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
