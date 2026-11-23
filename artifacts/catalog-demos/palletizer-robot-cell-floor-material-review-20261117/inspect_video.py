#!/usr/bin/env python3
"""Build a contact sheet from representative MP4 frames for visual review."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
TIMES = [1, 4, 7, 10, 13]


def font(size: int) -> ImageFont.FreeTypeFont:
    candidates = [
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
        Path("/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def main() -> None:
    width, height, margin, gap = 1600, 220, 12, 10
    thumb_w, thumb_h = 300, 170
    sheet = Image.new("RGB", (width, height), (238, 242, 247))
    draw = ImageDraw.Draw(sheet)
    for index, second in enumerate(TIMES):
        with Image.open(ROOT / "video-review" / "frames" / f"frame-{second}.png") as source:
            frame = source.convert("RGB")
        frame.thumbnail((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        x = margin + index * (thumb_w + gap)
        sheet.paste(frame, (x, margin))
        draw.text((x, height - 34), f"{second}s", fill=(34, 48, 64), font=font(22))
    sheet.save(ROOT / "video-review" / "frames-contact-sheet.png", optimize=True)


if __name__ == "__main__":
    main()
