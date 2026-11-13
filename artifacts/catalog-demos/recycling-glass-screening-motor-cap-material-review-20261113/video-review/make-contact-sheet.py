#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

HERE = Path(__file__).resolve().parent
FILES = [HERE / f"frame-{number:02}.png" for number in range(1, 6)]
FONT = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
thumbs = [ImageOps.contain(Image.open(path).convert("RGB"), (384, 216)) for path in FILES]
sheet = Image.new("RGB", (1200, 520), "#edf2f6")
draw = ImageDraw.Draw(sheet)
for index, thumb in enumerate(thumbs):
    column = index if index < 3 else index - 3 + 1
    row = 0 if index < 3 else 1
    x = 12 + column * 396
    y = 24 + row * 256
    sheet.paste(thumb, (x, y))
    draw.text((x, y + 222), f"Frame {index + 1}", font=FONT, fill="#22354a")
sheet.save(HERE / "contact-sheet.png")
