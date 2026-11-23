#!/usr/bin/env python3
"""Make an inspection sheet from five sampled frames of the MP4 demo."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
BG = (238, 242, 247)
INK = (34, 48, 64)


def main() -> None:
    names = [f"frame-{index:02d}.png" for index in range(1, 6)]
    times = ["0.0 s", "2.8 s", "5.6 s", "8.4 s", "11.2 s"]
    thumb_w, thumb_h = 640, 360
    margin, gap, label_h = 20, 18, 42
    sheet = Image.new("RGB", (margin * 2 + thumb_w * 2 + gap, 56 + margin * 2 + (thumb_h + label_h) * 3), BG)
    draw = ImageDraw.Draw(sheet)
    title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 26)
    label_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
    draw.text((margin, 16), "MP4 visual inspection · sampled frames", fill=INK, font=title_font)

    for index, (name, timestamp) in enumerate(zip(names, times, strict=True)):
        col, row = index % 2, index // 2
        x = margin + col * (thumb_w + gap)
        y = 56 + margin + row * (thumb_h + label_h)
        with Image.open(ROOT / name) as source:
            image = source.convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        sheet.paste(image, (x, y))
        draw.text((x, y + thumb_h + 6), timestamp, fill=INK, font=label_font)

    sheet.save(ROOT / "frames-contact-sheet.png", optimize=True)


if __name__ == "__main__":
    main()
