#!/usr/bin/env python3
"""Decode and inspect the generated lab-infrastructure promotion MP4."""

import json
import subprocess
from pathlib import Path


BUNDLE = Path(__file__).resolve().parent
video = BUNDLE / "lab-infrastructure-quality-promotion.mp4"
contact = BUNDLE / "decoded-video-contact-sheet.png"
probe = subprocess.run([
    "ffprobe", "-v", "error", "-show_entries", "format=duration,size:stream=width,height,codec_name,nb_frames",
    "-of", "json", str(video),
], check=True, capture_output=True, text=True)
metadata = json.loads(probe.stdout)
subprocess.run([
    "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(video),
    "-vf", "fps=1/3,scale=426:240,tile=2x4", "-frames:v", "1", str(contact),
], check=True)
result = {
    "video": video.name,
    "metadata": metadata,
    "decodedContactSheet": contact.name,
    "decode": "ffmpeg decoded the MP4 and sampled one frame per three seconds",
    "visualInspectionRequired": True,
}
(BUNDLE / "video-inspection.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
