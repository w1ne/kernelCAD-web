#!/usr/bin/env python3
"""Decode and make a contact sheet from the generated MP4 for visual review."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "standard-components-cable-gland-flange.mp4"
REVIEW = BUNDLE / "video-review"


def main():
    REVIEW.mkdir(parents=True, exist_ok=True)
    probe = json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration:stream=width,height,r_frame_rate",
        "-of", "json", str(VIDEO),
    ], text=True))
    stream = next(row for row in probe["streams"] if "width" in row)
    duration = float(probe["format"]["duration"])
    timestamps = [min(value, duration - 0.2) for value in (1.5, 4.5, 7.5, 10.5, 13.5, 16.5)]
    samples = []
    for index, timestamp in enumerate(timestamps, 1):
        output = REVIEW / f"sample-{index:02d}.png"
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(timestamp),
            "-i", str(VIDEO), "-frames:v", "1", str(output),
        ], check=True)
        samples.append(output)

    sheet = Image.new("RGB", (1280, 1200), "#101923")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18)
    for index, path in enumerate(samples):
        frame = Image.open(path).convert("RGB")
        frame.thumbnail((608, 342), Image.Resampling.LANCZOS)
        x = 20 + (index % 2) * 630
        y = 20 + (index // 2) * 390
        sheet.paste(frame, (x, y))
        draw.text((x, y + 350), f"{timestamps[index]:.1f}s", font=font, fill="#eef3f5")
    contact = REVIEW / "contact-sheet.png"
    sheet.save(contact, optimize=True)
    result = {
        "invocation": "python3 artifacts/catalog-demos/standard-components-cable-gland-flange-20261110/inspect_video.py",
        "ffprobe": {"width": stream["width"], "height": stream["height"], "frameRate": stream["r_frame_rate"], "durationSeconds": duration},
        "decodedSamples": [str(path.relative_to(BUNDLE)) for path in samples],
        "contactSheet": str(contact.relative_to(BUNDLE)),
        "humanVisualReviewRequired": True,
    }
    (BUNDLE / "video-inspection.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
