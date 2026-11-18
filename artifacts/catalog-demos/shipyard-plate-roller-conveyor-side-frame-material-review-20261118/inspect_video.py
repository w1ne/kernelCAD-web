#!/usr/bin/env python3
"""Decode representative frames and record the demo video metadata."""

from __future__ import annotations

import json
from pathlib import Path
import subprocess

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
VIDEO = ROOT / "shipyard-plate-roller-conveyor-side-frame-material-review.mp4"
OUT = ROOT / "video-review"
FRAMES = OUT / "frames"
FONT = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    FRAMES.mkdir(parents=True, exist_ok=True)
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(VIDEO)],
        check=True,
        capture_output=True,
        text=True,
    )
    metadata = json.loads(probe.stdout)
    (OUT / "ffprobe.json").write_text(probe.stdout, encoding="utf-8")
    captures = []
    for index, second in enumerate((1, 4, 7, 10, 13), start=1):
        frame = FRAMES / f"frame-{index:02d}-at-{second}s.png"
        subprocess.run(
            ["ffmpeg", "-y", "-ss", str(second), "-i", str(VIDEO), "-frames:v", "1", str(frame)],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        captures.append((second, Image.open(frame).convert("RGB")))
    sheet = Image.new("RGB", (1280, 1120), "#eaf0f4")
    draw = ImageDraw.Draw(sheet)
    for index, (second, frame) in enumerate(captures):
        frame.thumbnail((600, 338), Image.Resampling.LANCZOS)
        x = 24 + (index % 2) * 624
        y = 24 + (index // 2) * 360
        sheet.paste(frame, (x, y))
        draw.text((x, y + 342), f"{second}s", fill="#183044", font=FONT)
    sheet.save(OUT / "contact-sheet.png")

    video = metadata["streams"][0]
    duration = round(float(metadata["format"]["duration"]), 2)
    details = {
        "codec": video["codec_name"],
        "pixelFormat": video["pix_fmt"],
        "width": video["width"],
        "height": video["height"],
        "frameRate": video["r_frame_rate"],
        "durationSeconds": duration,
        "framesInspectedAtSeconds": [1, 4, 7, 10, 13],
    }
    (OUT / "inspection.json").write_text(json.dumps(details, indent=2) + "\n", encoding="utf-8")
    (OUT / "inspection.md").write_text(
        "# Video inspection\n\n"
        f"Decoded five representative frames at 1, 4, 7, 10 and 13 seconds. "
        f"The contact sheet is provided alongside this file. `ffprobe.json` records "
        f"{details['codec']} video, {details['width']}×{details['height']}, "
        f"{details['pixelFormat']}, {details['frameRate']} fps and {duration} seconds.\n",
        encoding="utf-8",
    )
    if details["width"] != 1280 or details["height"] != 720 or details["codec"] != "h264":
        raise SystemExit(f"Unexpected video metadata: {details}")
    print(json.dumps(details, indent=2))


if __name__ == "__main__":
    main()
