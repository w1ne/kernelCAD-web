#!/usr/bin/env python3
"""Decode and inspect representative frames from the local MP4 demo."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path


OUT = Path(__file__).resolve().parent
VIDEO = OUT / "standard-components-pulley-elbow-collar.mp4"
REVIEW = OUT / "video-review"
REVIEW.mkdir(exist_ok=True)

probe = json.loads(subprocess.check_output([
    "ffprobe", "-v", "error", "-show_entries", "format=duration:stream=width,height,codec_name,r_frame_rate",
    "-of", "json", str(VIDEO),
], text=True))
duration = float(probe["format"]["duration"])
times = [0.5, 3.9, 7.7, 11.5, max(0.5, duration - 0.5)]
samples = []
for index, timestamp in enumerate(times, start=1):
    path = REVIEW / f"decoded-{index:02d}.png"
    subprocess.run([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", str(timestamp), "-i", str(VIDEO),
        "-frames:v", "1", str(path),
    ], check=True)
    samples.append({"timeSeconds": timestamp, "file": path.name})

contact = REVIEW / "contact-sheet.png"
subprocess.run([
    "montage", *[str(REVIEW / sample["file"]) for sample in samples],
    "-font", "DejaVu-Sans", "-pointsize", "14", "-tile", "2x3", "-geometry", "640x360+8+18",
    "-background", "white", str(contact),
], check=True)
(OUT / "video-inspection.json").write_text(json.dumps({
    "video": str(VIDEO.relative_to(OUT.parent.parent.parent)),
    "durationSeconds": duration,
    "streams": probe.get("streams", []),
    "expected": {"width": 1280, "height": 720, "codec": "h264", "durationSeconds": 15},
    "samples": samples,
    "contactSheet": str(contact.relative_to(OUT)),
    "visualReview": "Review pending; sample frames are retained for inspection.",
}, indent=2) + "\n", encoding="utf-8")
print(f"Decoded {len(samples)} frames from {duration:.2f}s video; wrote {contact}")
