#!/usr/bin/env python3
"""Extract inspection frames and metadata from the generated review MP4."""

from pathlib import Path
import json
import subprocess

from PIL import Image, ImageDraw, ImageFont


ARTIFACTS = Path(__file__).resolve().parent
VIDEO = ARTIFACTS / "beverage-blend-tank-jacket-material-review.mp4"
REVIEW = ARTIFACTS / "video-review"
TIMES = [1, 4, 7, 10, 13]


def main() -> None:
    REVIEW.mkdir(parents=True, exist_ok=True)
    probe = subprocess.run(
        [
            "ffprobe", "-v", "error", "-show_streams", "-show_format",
            "-of", "json", str(VIDEO),
        ],
        check=True, text=True, capture_output=True,
    )
    metadata = json.loads(probe.stdout)
    (REVIEW / "ffprobe.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")

    frames = []
    for index, seconds in enumerate(TIMES, start=1):
        path = REVIEW / f"frame-{index:02d}.png"
        subprocess.run(
            [
                "ffmpeg", "-y", "-ss", str(seconds), "-i", str(VIDEO),
                "-frames:v", "1", str(path),
            ],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        frames.append(path)

    background = Image.new("RGB", (1280, 540), "#e7edf2")
    draw = ImageDraw.Draw(background)
    labels = ["Audit", "Before / after", "Materials", "GLB regression", "Verification"]
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18)
    for index, (path, label) in enumerate(zip(frames, labels, strict=True)):
        source = Image.open(path).convert("RGB")
        source.thumbnail((400, 225), Image.Resampling.LANCZOS)
        column = index % 3
        row = index // 3
        x = 20 + column * 420
        y = 20 + row * 270
        background.paste(source, (x, y))
        draw.text((x, y + 232), f"{index + 1}. {label}", fill="#1d2b39", font=font)
    background.save(REVIEW / "frames-contact-sheet.png")


if __name__ == "__main__":
    main()
