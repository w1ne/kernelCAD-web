#!/usr/bin/env python3
"""Inspect the encoded marine promotion walkthrough and retain a contact sheet."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageOps


BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "marine-quality-promotion.mp4"
OUT = BUNDLE / "video-review"


def main() -> None:
    OUT.mkdir(exist_ok=True)
    probe = subprocess.run([
        "ffprobe", "-v", "error", "-show_streams", "-show_format",
        "-of", "json", str(VIDEO),
    ], check=True, text=True, capture_output=True)
    metadata = json.loads(probe.stdout)
    video_stream = next(stream for stream in metadata["streams"] if stream["codec_type"] == "video")
    duration = float(metadata["format"]["duration"])
    frames = []
    count = 0
    for second in [0, 3, 6, 9, 12, 15]:
        if second >= duration:
            continue
        target = OUT / f"decoded-{second:02d}.png"
        subprocess.run([
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", str(second),
            "-i", str(VIDEO), "-frames:v", "1", str(target),
        ], check=True)
        frames.append(Image.open(target).convert("RGB"))
        count += 1
    thumb_w, thumb_h = 480, 270
    contact = Image.new("RGB", (thumb_w * 2, thumb_h * ((len(frames) + 1) // 2)), "white")
    for index, frame in enumerate(frames):
        thumb = ImageOps.fit(frame, (thumb_w, thumb_h), method=Image.Resampling.LANCZOS)
        contact.paste(thumb, ((index % 2) * thumb_w, (index // 2) * thumb_h))
    contact.save(OUT / "contact-sheet.png")
    report = {
        "video": VIDEO.name,
        "codec": video_stream["codec_name"],
        "width": video_stream["width"],
        "height": video_stream["height"],
        "durationSeconds": duration,
        "sampledFrames": count,
        "contactSheet": "contact-sheet.png",
        "manualVisualInspection": "pending",
    }
    (OUT / "video-inspection.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
