#!/usr/bin/env python3
"""Extract representative frames and build a review contact sheet."""

from pathlib import Path
import subprocess

from PIL import Image, ImageDraw, ImageFont


BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "review-demo.mp4"
OUT = BUNDLE / "verification"
FRAMES = OUT / "video-frames"
TIMES = [1, 4, 7, 10, 13]


def main() -> None:
    FRAMES.mkdir(parents=True, exist_ok=True)
    paths = []
    for index, second in enumerate(TIMES, start=1):
        path = FRAMES / f"frame-{index:02d}-at-{second}s.png"
        subprocess.run([
            "ffmpeg", "-y", "-ss", str(second), "-i", str(VIDEO),
            "-frames:v", "1", str(path),
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        paths.append(path)

    sheet = Image.new("RGB", (1280, 820), (239, 245, 249))
    draw = ImageDraw.Draw(sheet)
    font_path = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
    label_font = ImageFont.truetype(str(font_path), 20) if font_path.exists() else ImageFont.load_default()
    cards = [(30, 45), (445, 45), (860, 45), (238, 440), (653, 440)]
    labels = ["Five-preview audit", "Before preview", "Source assignment", "After preview", "GLB regression"]
    for path, (x, y), label in zip(paths, cards, labels):
        draw.rounded_rectangle((x, y, x + 390, y + 285), radius=12,
                               fill=(255, 255, 255), outline=(207, 218, 226), width=2)
        image = Image.open(path).convert("RGB")
        image.thumbnail((374, 240), Image.Resampling.LANCZOS)
        sheet.paste(image, (x + (390 - image.width) // 2, y + 8))
        draw.text((x + 12, y + 250), label, fill=(30, 47, 61), font=label_font)
    sheet.save(OUT / "video-contact-sheet.png")
    print(f"extracted {len(paths)} frames and wrote {OUT / 'video-contact-sheet.png'}")


if __name__ == "__main__":
    main()
