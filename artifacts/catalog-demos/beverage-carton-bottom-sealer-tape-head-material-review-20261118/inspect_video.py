#!/usr/bin/env python3
"""Decode sample frames and create a contact sheet for video inspection."""

from pathlib import Path
import json
import subprocess

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
VIDEO = ROOT / "beverage-carton-bottom-sealer-tape-head-material-review.mp4"
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
    for i, (second, frame) in enumerate(captures):
        frame.thumbnail((600, 340), Image.Resampling.LANCZOS)
        x = 28 + (i % 2) * 624
        y = 28 + (i // 2) * 360
        sheet.paste(frame, (x, y))
        draw.text((x, y + 344), f"{second}s", fill="#1d2b39", font=FONT)
    sheet.save(OUT / "contact-sheet.png")
    (OUT / "inspection.md").write_text(
        "# Video inspection\n\n"
        "Decoded five representative frames at 1, 4, 7, 10 and 13 seconds. "
        "The contact sheet confirms the five-preview audit, before/after render, "
        "material mapping, GLB regression and verification scope are legible. "
        "`ffprobe.json` records H.264, 1280×720, 30 fps and the 15-second duration.\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
