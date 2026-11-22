#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
frames = [Image.open(HERE / f"frame-{index:02}.png").convert("RGB") for index in range(1, 6)]
thumbs = [frame.resize((480, 270)) for frame in frames]
sheet = Image.new("RGB", (1000, 890), "#edf2f6")
draw = ImageDraw.Draw(sheet)
for index, thumb in enumerate(thumbs):
    x = 10 + (index % 2) * 490
    y = 10 + (index // 2) * 290
    sheet.paste(thumb, (x, y))
    draw.text((x + 8, y + 273), f"Frame {index + 1:02}", fill="#22354a")
sheet.save(HERE / "contact-sheet.png")
