#!/usr/bin/env python3
"""Build an inspection sheet from decoded MP4 frames."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BUNDLE = Path(__file__).resolve().parents[1]
WIDTH, HEIGHT = 1000, 1480
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

canvas = Image.new("RGB", (WIDTH, HEIGHT), "#e7edf3")
draw = ImageDraw.Draw(canvas)
font = ImageFont.truetype(FONT, 20)
small = ImageFont.truetype(FONT, 15)
draw.text((24, 18), "Decoded MP4 review frames", fill="#203848", font=font)
for index, seconds in enumerate((2, 5.5, 9.5, 13.5, 16)):
    frame = Image.open(BUNDLE / "video-review" / f"frame-{index + 1:02}.png").convert("RGB")
    frame.thumbnail((472, 420), Image.Resampling.LANCZOS)
    column = index % 2
    row = index // 2
    x = 18 + column * 492 + (472 - frame.width) // 2
    y = 60 + row * 465
    canvas.paste(frame, (x, y))
    draw.text((18 + column * 492, y + 424), f"frame {index + 1} · {seconds:g}s", fill="#203848", font=small)
canvas.save(BUNDLE / "video-review" / "contact-sheet.png")
