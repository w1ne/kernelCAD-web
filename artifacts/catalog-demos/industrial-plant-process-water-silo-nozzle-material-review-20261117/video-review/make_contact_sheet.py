#!/usr/bin/env python3
"""Make the visual inspection sheet for the five demo frames."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
BG = (238, 242, 247)
INK = (34, 48, 64)
NAMES = ["01", "02", "03", "04", "05"]

font_path = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
font = ImageFont.truetype(str(font_path), 20) if font_path.exists() else ImageFont.load_default()
sheet = Image.new("RGB", (1320, 360), BG)
draw = ImageDraw.Draw(sheet)
for index, name in enumerate(NAMES):
    image = Image.open(ROOT / f"frame-{name}.png").convert("RGB")
    image.thumbnail((248, 310), Image.Resampling.LANCZOS)
    x = 14 + index * 262
    sheet.paste(image, (x, 8))
    draw.text((x, 326), f"Frame {name}", fill=INK, font=font)
sheet.save(ROOT / "frames-contact-sheet.png", optimize=True)
