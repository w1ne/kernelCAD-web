#!/usr/bin/env python3
"""Make a contact sheet from sampled demo frames for human inspection."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
frames = sorted(HERE.glob("frame-*.png"))
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
sheet = Image.new("RGB", (1080, 1460), "#f0f4f8")
draw = ImageDraw.Draw(sheet)
for index, path in enumerate(frames):
    frame = Image.open(path).convert("RGB")
    frame.thumbnail((500, 440), Image.Resampling.LANCZOS)
    x = 20 + (index % 2) * 540
    y = 20 + (index // 2) * 480
    sheet.paste(frame, (x, y))
    draw.text((x, y + 445), path.name, fill="#203848", font=font)
sheet.save(HERE / "contact-sheet.png")
