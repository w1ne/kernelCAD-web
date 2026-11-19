#!/usr/bin/env python3
"""Probe the review MP4 and build sampled frames/contact sheet for inspection."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


BUNDLE = Path(__file__).resolve().parents[1]
REVIEW = Path(__file__).resolve().parent
FRAMES = REVIEW / "frames"
VIDEO = BUNDLE / "review-demo.mp4"
SAMPLES = (("slide-01", 1.0), ("slide-02", 4.8), ("slide-03", 8.6), ("slide-04", 12.4))


def main() -> None:
    FRAMES.mkdir(parents=True, exist_ok=True)
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(VIDEO)],
        capture_output=True,
        text=True,
        check=True,
    )
    info = json.loads(probe.stdout)
    (REVIEW / "ffprobe.json").write_text(json.dumps(info, indent=2) + "\n")

    thumbs: list[tuple[str, Image.Image]] = []
    for name, timestamp in SAMPLES:
        frame = FRAMES / f"{name}.png"
        subprocess.run(
            ["ffmpeg", "-y", "-v", "error", "-ss", str(timestamp), "-i", str(VIDEO), "-frames:v", "1", str(frame)],
            check=True,
        )
        image = Image.open(frame).convert("RGB")
        image.thumbnail((640, 360), Image.Resampling.LANCZOS)
        thumbs.append((name, image.copy()))

    sheet = Image.new("RGB", (1280, 760), "#e7edf2")
    draw = ImageDraw.Draw(sheet)
    label_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18)
    for index, (label, image) in enumerate(thumbs):
        x, y = (index % 2) * 640, (index // 2) * 380
        draw.text((x + 16, y + 8), label, fill="#17354b", font=label_font)
        sheet.paste(image, (x, y + 32))
    sheet.save(REVIEW / "contact-sheet.png", optimize=True)

    stream = next(item for item in info["streams"] if item["codec_type"] == "video")
    print(json.dumps({
        "codec": stream["codec_name"],
        "width": stream["width"],
        "height": stream["height"],
        "pixel_format": stream["pix_fmt"],
        "frame_rate": stream["avg_frame_rate"],
        "duration_seconds": info["format"]["duration"],
        "video_bytes": VIDEO.stat().st_size,
    }, indent=2))


if __name__ == "__main__":
    main()
