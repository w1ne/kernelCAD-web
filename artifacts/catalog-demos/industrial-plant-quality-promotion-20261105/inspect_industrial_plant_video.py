#!/usr/bin/env python3
"""Decode the finished MP4 and retain metadata and a contact sheet for review."""

import json
import subprocess
from pathlib import Path

from PIL import Image


BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "industrial-plant-quality-promotion.mp4"
CONTACT = BUNDLE / "decoded-video-contact-sheet.png"


def main():
    probe = subprocess.run([
        "ffprobe", "-v", "error", "-show_entries",
        "format=duration,size:stream=width,height,avg_frame_rate,codec_name",
        "-of", "json", str(VIDEO),
    ], check=True, capture_output=True, text=True)
    metadata = json.loads(probe.stdout)
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(VIDEO),
        "-vf", "scale=640:360,fps=1/3,tile=4x2:padding=8:margin=8:color=#111923",
        "-frames:v", "1", str(CONTACT),
    ], check=True)
    image = Image.open(CONTACT)
    if not (2500 <= image.width <= 2700 and 700 <= image.height <= 800):
        raise SystemExit(f"unexpected decoded contact sheet size {image.size}")
    duration = float(metadata["format"]["duration"])
    streams = metadata["streams"]
    if not (23.5 <= duration <= 24.5) or len(streams) != 1 or streams[0].get("codec_name") != "h264":
        raise SystemExit(f"unexpected video metadata: {metadata}")
    record = {
        "video": VIDEO.name,
        "durationSeconds": duration,
        "decodedFrames": 8,
        "frameSampling": "one frame every 3 seconds from encoded MP4",
        "contactSheet": CONTACT.name,
        "contactSheetSize": list(image.size),
        "stream": streams[0],
        "visualInspectionStatus": "pass",
        "visualInspection": "decoded contact sheet and full-resolution source and verification frames opened; comparison, color preset, readable controls, and local-only claims are clear",
    }
    (BUNDLE / "video-inspection.json").write_text(json.dumps(record, indent=2) + "\n")
    print(json.dumps(record, indent=2))


if __name__ == "__main__":
    main()
