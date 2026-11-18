#!/usr/bin/env python3
"""Decode representative frames and record the rendered MP4 properties."""

import json
import subprocess
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "alpine-expedition-quality-promotion.mp4"
REVIEW = BUNDLE / "video-review"


def main() -> None:
    REVIEW.mkdir(parents=True, exist_ok=True)
    probe = subprocess.check_output([
        "ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(VIDEO)
    ], text=True)
    info = json.loads(probe)
    stream = next(stream for stream in info["streams"] if stream["codec_type"] == "video")
    duration = float(info["format"]["duration"])
    timestamps = [1, 5, 9, 13, 17]
    decoded = []
    for index, timestamp in enumerate(timestamps, 1):
        frame = REVIEW / ("decoded-" + str(index).zfill(2) + ".png")
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(timestamp),
            "-i", str(VIDEO), "-frames:v", "1", str(frame),
        ], check=True)
        decoded.append({"file": str(frame.relative_to(BUNDLE)), "timestampSeconds": timestamp, "exists": frame.is_file()})
    result = {
        "video": VIDEO.name,
        "durationSeconds": duration,
        "codec": stream["codec_name"],
        "width": stream["width"],
        "height": stream["height"],
        "pixelFormat": stream.get("pix_fmt"),
        "framesDecoded": decoded,
        "inspection": "Decoded representative frames for manual review; playback is a local source/render replay, not deployed behavior or hardware acceptance.",
    }
    (BUNDLE / "video-inspection.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
