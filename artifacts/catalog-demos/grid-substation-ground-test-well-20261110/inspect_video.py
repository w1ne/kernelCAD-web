#!/usr/bin/env python3
"""Decode MP4 samples into a contact sheet and retain inspection metadata."""
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "grid-substation-ground-test-well.mp4"
REVIEW = BUNDLE / "video-review"
TIMES = [0.5, 3.5, 6.5, 9.5]


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", size)


def main() -> None:
    REVIEW.mkdir(parents=True, exist_ok=True)
    probe = subprocess.run([
        "ffprobe", "-v", "error", "-show_entries", "format=duration,size:stream=width,height,r_frame_rate",
        "-of", "json", str(VIDEO),
    ], check=True, capture_output=True, text=True)
    info = json.loads(probe.stdout)
    stream = info["streams"][0]
    frames: list[Image.Image] = []
    samples = []
    for index, seconds in enumerate(TIMES):
        path = REVIEW / ("sample-" + str(index + 1).zfill(2) + ".png")
        subprocess.run([
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", str(seconds), "-i", str(VIDEO),
            "-frames:v", "1", str(path),
        ], check=True)
        frame = Image.open(path).convert("RGB")
        frames.append(frame)
        samples.append({"seconds": seconds, "path": str(path.relative_to(ROOT)), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
    sheet = Image.new("RGB", (1320, 800), (235, 241, 246))
    draw = ImageDraw.Draw(sheet)
    for index, frame in enumerate(frames):
        x = 20 + (index % 2) * 650
        y = 20 + (index // 2) * 390
        thumb = ImageOps.contain(frame, (620, 350), method=Image.Resampling.LANCZOS)
        sheet.paste(thumb, (x + (620 - thumb.width) // 2, y + 28))
        draw.text((x + 8, y + 4), "Frame at " + str(TIMES[index]) + " s", font=font(18), fill=(31, 47, 59))
    contact = REVIEW / "contact-sheet.png"
    sheet.save(contact, optimize=True)
    evidence = {
        "video": str(VIDEO.relative_to(ROOT)),
        "bytes": VIDEO.stat().st_size,
        "sha256": hashlib.sha256(VIDEO.read_bytes()).hexdigest(),
        "durationSeconds": float(info["format"]["duration"]),
        "width": stream["width"],
        "height": stream["height"],
        "frameRate": stream["r_frame_rate"],
        "sampleTimesSeconds": TIMES,
        "samples": samples,
        "contactSheet": str(contact.relative_to(ROOT)),
        "decodedSamples": True,
        "scope": "Offline preview-based demo; local source and checks only; not deployed or hardware accepted.",
    }
    (BUNDLE / "video-inspection.json").write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(evidence, indent=2))


if __name__ == "__main__":
    main()
