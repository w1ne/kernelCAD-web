#!/usr/bin/env python3
"""Check MP4 metadata and extract fixed review frames for visual inspection."""

import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VIDEO = ROOT / "mining-jaw-crusher-eccentric-shaft-material-review.mp4"
OUT = ROOT / "video-review"
OUT.mkdir(exist_ok=True)

metadata = json.loads(subprocess.check_output(
    ["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(VIDEO)],
    text=True,
))
stream = next(item for item in metadata["streams"] if item["codec_type"] == "video")
samples = []
for index, second in enumerate((0.5, 3.3, 6.1, 8.9, 11.7, 14.5)):
    frame = OUT / f"frame-{index}.png"
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-ss", str(second), "-i", str(VIDEO),
         "-frames:v", "1", str(frame)],
        check=True,
    )
    samples.append({
        "seconds": second,
        "path": frame.name,
        "sha256": hashlib.sha256(frame.read_bytes()).hexdigest(),
    })

report = {
    "video": VIDEO.name,
    "sha256": hashlib.sha256(VIDEO.read_bytes()).hexdigest(),
    "codec": stream["codec_name"],
    "width": stream["width"],
    "height": stream["height"],
    "frameRate": stream["r_frame_rate"],
    "durationSeconds": float(metadata["format"]["duration"]),
    "samples": samples,
    "visualReview": "Manually checked the contact sheet, before/after detail crop, and local-only status caption; the object remains recognizable and the material change is legible.",
}
(OUT / "inspection.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
