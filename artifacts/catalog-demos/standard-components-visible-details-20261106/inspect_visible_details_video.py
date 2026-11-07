#!/usr/bin/env python3
"""Decode and retain representative frames from the local demo MP4."""

import hashlib
import json
import subprocess
from pathlib import Path

from PIL import Image

BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "standard-components-visible-details.mp4"
OUT = BUNDLE / "video-review"
OUT.mkdir(parents=True, exist_ok=True)
metadata = json.loads(subprocess.check_output([
    "ffprobe", "-v", "error", "-show_entries", "format=duration:stream=width,height,codec_name,avg_frame_rate",
    "-of", "json", str(VIDEO),
], text=True))
stream = next(item for item in metadata["streams"] if item.get("codec_name") == "h264")
duration = float(metadata["format"]["duration"])
times = [1.5, 4.5, 7.5, 10.5, 13.5, 16.5]
frames = []
for i, second in enumerate(times, 1):
    path = OUT / f"frame-{i:02d}.png"
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(second),
        "-i", str(VIDEO), "-frames:v", "1", str(path),
    ], check=True)
    frames.append(Image.open(path).convert("RGB"))

thumb_w, thumb_h = 640, 360
sheet = Image.new("RGB", (thumb_w * 3, thumb_h * 2), "#101923")
for i, frame in enumerate(frames):
    frame.thumbnail((thumb_w, thumb_h), Image.Resampling.LANCZOS)
    sheet.paste(frame, ((i % 3) * thumb_w, (i // 3) * thumb_h))
sheet.save(OUT / "contact-sheet.png", optimize=True)
review_path = OUT / "visual-review.md"
visual_review = review_path.read_text().strip() if review_path.exists() else "pending manual inspection"
report = {
    "video": "artifacts/catalog-demos/standard-components-visible-details-20261106/standard-components-visible-details.mp4",
    "durationSeconds": duration,
    "width": stream["width"],
    "height": stream["height"],
    "codec": stream["codec_name"],
    "frameRate": stream["avg_frame_rate"],
    "decodedSamplesSeconds": times,
    "sampleCount": len(frames),
    "contactSheet": "artifacts/catalog-demos/standard-components-visible-details-20261106/video-review/contact-sheet.png",
    "videoSha256": hashlib.sha256(VIDEO.read_bytes()).hexdigest(),
    "visualReview": visual_review,
}
(BUNDLE / "video-inspection.json").write_text(json.dumps(report, indent=2) + "\n")
verification_path = BUNDLE / "verification.json"
verification = json.loads(verification_path.read_text())
verification["videoSha256"] = report["videoSha256"]
verification["videoDurationSeconds"] = duration
verification["videoInspected"] = True
verification["videoVisualReview"] = "PASS" if "No clipping or visible render defects found" in visual_review else "pending"
verification_path.write_text(json.dumps(verification, indent=2) + "\n")
print(json.dumps(report, indent=2))
