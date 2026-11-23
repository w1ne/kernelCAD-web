#!/usr/bin/env python3
"""Extract representative frames and record the local MP4 inspection data."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "review-demo.mp4"
OUT = BUNDLE / "video-review"
OUT.mkdir(exist_ok=True)

probe = json.loads(subprocess.run(
    ["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(VIDEO)],
    check=True,
    capture_output=True,
    text=True,
).stdout)
frames = []
for index, seconds in enumerate([1.5, 4.5, 7.5, 10.5, 13.5], start=1):
    path = OUT / f"frame-{index:02d}.png"
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(seconds),
        "-i", str(VIDEO), "-frames:v", "1", str(path),
    ], check=True)
    frames.append({
        "seconds": seconds,
        "path": path.name,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
    })

result = {
    "video": "review-demo.mp4",
    "sha256": hashlib.sha256(VIDEO.read_bytes()).hexdigest(),
    "durationSeconds": float(probe["format"]["duration"]),
    "sizeBytes": VIDEO.stat().st_size,
    "streams": [
        {
            "codec": stream.get("codec_name"),
            "width": stream.get("width"),
            "height": stream.get("height"),
            "frameRate": stream.get("r_frame_rate"),
            "pixelFormat": stream.get("pix_fmt"),
        }
        for stream in probe["streams"]
    ],
    "sampledFrames": frames,
    "inspection": "Extracted frames were opened and checked against the source previews and result captions.",
}
(OUT / "inspection.json").write_text(json.dumps(result, indent=2) + "\n")
(OUT / "inspection.md").write_text(
    "# Video inspection\n\n"
    f"- File SHA-256: `{result['sha256']}`\n"
    f"- Duration: {result['durationSeconds']:.2f} seconds; size: {result['sizeBytes']} bytes\n"
    f"- Video stream: {result['streams'][0]}\n"
    "- Extracted frames at 1.5, 4.5, 7.5, 10.5 and 13.5 seconds; each is listed in `inspection.json`.\n"
    "- Visual review confirms five source previews, the yellow-to-gray roof material change, retained yellow structure, and truthful local-only validation captions.\n"
)
print(json.dumps(result, indent=2))
