#!/usr/bin/env python3
"""Probe the demo MP4 and create a decoded frame contact sheet for review."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageOps, ImageDraw, ImageFont


OUT = Path(__file__).resolve().parent
VIDEO = OUT / "horizontal-baler-refinement.mp4"
REVIEW = OUT / "video-review"
TIMES = [0.8, 3.8, 6.8, 9.8, 11.5]


def run(args: list[str]) -> str:
    return subprocess.run(args, check=True, capture_output=True, text=True).stdout.strip()


def main() -> None:
    REVIEW.mkdir(parents=True, exist_ok=True)
    probe = json.loads(run([
        "ffprobe", "-v", "error", "-show_entries", "format=duration,size:stream=width,height,codec_name,pix_fmt,r_frame_rate",
        "-of", "json", str(VIDEO),
    ]))
    frames = []
    for index, timestamp in enumerate(TIMES, start=1):
        path = REVIEW / f"frame-{index:02d}.png"
        subprocess.run([
            "ffmpeg", "-y", "-ss", str(timestamp), "-i", str(VIDEO), "-frames:v", "1", str(path),
        ], check=True, capture_output=True, text=True)
        frames.append(path)

    thumb_w, thumb_h = 480, 270
    gap, label_h = 16, 30
    sheet = Image.new("RGB", (thumb_w * 2 + gap * 3, (thumb_h + label_h) * 3 + gap * 4), "#111827")
    draw = ImageDraw.Draw(sheet)
    font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    font = ImageFont.truetype(font_path, 15) if Path(font_path).exists() else ImageFont.load_default()
    for index, path in enumerate(frames):
        image = Image.open(path).convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        x = gap + (index % 2) * (thumb_w + gap)
        y = gap + (index // 2) * (thumb_h + label_h + gap)
        sheet.paste(image, (x, y))
        draw.text((x, y + thumb_h + 4), f"Decoded sample {index + 1} · {TIMES[index]:.1f}s", font=font, fill="#e5e7eb")
    contact = REVIEW / "contact-sheet.png"
    sheet.save(contact)
    report = {
        "video": str(VIDEO.relative_to(OUT)),
        "probe": probe,
        "sampleTimesSeconds": TIMES,
        "decodedFrames": [str(path.relative_to(OUT)) for path in frames],
        "contactSheet": str(contact.relative_to(OUT)),
    }
    (REVIEW / "video-inspection.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
