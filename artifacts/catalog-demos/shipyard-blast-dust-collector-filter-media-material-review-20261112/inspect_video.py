#!/usr/bin/env python3
"""Probe the MP4 and save sampled frames plus a contact sheet for review."""
import json
from pathlib import Path
import subprocess

from PIL import Image

HERE = Path(__file__).resolve().parent
VIDEO = HERE / "shipyard-blast-dust-collector-filter-media-review.mp4"
OUT = HERE / "video-review"
OUT.mkdir(exist_ok=True)

probe = subprocess.run([
    "ffprobe", "-v", "error", "-show_entries", "format=duration:stream=width,height,r_frame_rate,codec_name",
    "-of", "json", str(VIDEO),
], check=True, capture_output=True, text=True)
metadata = json.loads(probe.stdout)
duration = float(metadata["format"]["duration"])
sample_times = [1.0, 5.5, min(11.5, max(1.0, duration - 1.0))]
samples = []
for index, seconds in enumerate(sample_times, start=1):
    output = OUT / f"frame-{index:02d}-{seconds:.1f}s.png"
    subprocess.run([
        "ffmpeg", "-y", "-ss", str(seconds), "-i", str(VIDEO), "-frames:v", "1", str(output),
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    samples.append({"seconds": seconds, "path": str(output.relative_to(HERE))})

thumbs = []
for sample in samples:
    frame = Image.open(HERE / sample["path"]).convert("RGB")
    frame.thumbnail((640, 360), Image.Resampling.LANCZOS)
    thumbs.append(frame)
sheet = Image.new("RGB", (640, 360 * len(thumbs)), (245, 247, 249))
for index, thumb in enumerate(thumbs):
    sheet.paste(thumb, (0, index * 360))
sheet.save(OUT / "contact-sheet.png")

record = {
    "video": VIDEO.name,
    "durationSeconds": duration,
    "streams": metadata.get("streams", []),
    "sampledFrames": samples,
    "contactSheet": "video-review/contact-sheet.png",
    "inspection": "Frames extracted from the encoded MP4 for manual visual review.",
}
(HERE / "video-inspection.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
print(json.dumps(record, indent=2))
