# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
from pathlib import Path
import textwrap

from PIL import Image, ImageDraw, ImageFont


BUNDLE_DIR = Path(__file__).resolve().parent
WIDTH = 1280
HEIGHT = 720
BACKGROUND = (16, 26, 41)
ACCENT = (71, 201, 176)
PRIMARY = (245, 248, 252)
SECONDARY = (155, 174, 196)
FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"


def render_slide(source_name: str, output_name: str, font_size: int) -> None:
    font = ImageFont.truetype(FONT_PATH, font_size)
    label_font = ImageFont.truetype(FONT_PATH, 24)
    footer_font = ImageFont.truetype(FONT_PATH, 17)
    canvas = Image.new("RGB", (WIDTH, HEIGHT), BACKGROUND)
    draw = ImageDraw.Draw(canvas)
    draw.text((80, 58), "kernelCAD / static-hold -> motion-load routing", font=label_font, fill=SECONDARY)
    draw.rectangle((72, 132, 80, 630), fill=ACCENT)

    source = (BUNDLE_DIR / source_name).read_text(encoding="utf-8").splitlines()
    y = 164
    line_height = font.getbbox("Ag")[3] - font.getbbox("Ag")[1] + 14
    max_width = int(1050 / font.getlength("M"))
    for text in source:
        wrapped = textwrap.wrap(text, width=max_width) if text else [""]
        for line in wrapped:
            draw.text((112, y), line, font=font, fill=PRIMARY)
            y += line_height

    draw.line((80, 650, 1200, 650), fill=(51, 71, 94), width=1)
    draw.text(
        (80, 674),
        "Local in-process replay / not deployment or hardware acceptance",
        font=footer_font,
        fill=SECONDARY,
    )
    canvas.save(BUNDLE_DIR / output_name, optimize=True)


render_slide("slide-intro.txt", "slide-intro.png", 36)
render_slide("slide-static-hold.txt", "slide-static-hold.png", 34)
render_slide("slide-result.txt", "slide-result.png", 30)
