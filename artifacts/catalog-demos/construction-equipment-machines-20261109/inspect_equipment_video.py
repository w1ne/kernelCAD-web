#!/usr/bin/env python3
"""Probe and decode the MP4 so the handoff records inspected video evidence."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image


OUT = Path(__file__).resolve().parent
VIDEO = OUT / "construction-equipment-machines.mp4"
REVIEW = OUT / "video-review"
REVIEW.mkdir(exist_ok=True)

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
stream = metadata["streams"][0]
duration = float(metadata["format"]["duration"])
if stream["codec_name"] != "h264" or stream["width"] != 1280 or stream["height"] != 720:
    raise SystemExit(f"unexpected video stream metadata: {stream}")
if not 14.8 <= duration <= 15.2:
    raise SystemExit(f"unexpected MP4 duration: {duration}")

samples = []
for i, seconds in enumerate([1, 3.5, 6, 8.5, 11, 13.5], 1):
    path = REVIEW / f"sample-{i:02}.png"
    subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", str(seconds), "-i", str(VIDEO), "-frames:v", "1", str(path)],
        check=True,
    )
    with Image.open(path) as image:
        if image.size != (1280, 720):
            raise SystemExit(f"sample {i} decoded at {image.size}")
        samples.append({"timeSeconds": seconds, "path": path.name, "size": list(image.size)})

contact = Image.new("RGB", (1236, 500), (238, 243, 248))
for i, row in enumerate(samples):
    with Image.open(REVIEW / row["path"]) as image:
        image.thumbnail((400, 225), Image.Resampling.LANCZOS)
        contact.paste(image, (12 + (i % 3) * 412, 12 + (i // 3) * 237))
contact.save(REVIEW / "decoded-samples.png")
report = {
    "video": VIDEO.name,
    "codec": stream["codec_name"],
    "width": stream["width"],
    "height": stream["height"],
    "frameRate": stream["r_frame_rate"],
    "durationSeconds": duration,
    "decodedSamples": samples,
    "inspected": True,
}
(OUT / "mp4-inspection.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
