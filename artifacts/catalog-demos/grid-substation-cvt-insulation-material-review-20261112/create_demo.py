#!/usr/bin/env python3
"""Create a short local preview audit and CVT insulation material handoff video."""

from __future__ import annotations

import json
import subprocess
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

BUNDLE = Path(__file__).resolve().parent
SETTINGS = json.loads((BUNDLE / "demo-settings.json").read_text(encoding="utf-8"))
WIDTH = SETTINGS["width"]
HEIGHT = SETTINGS["height"]
BG = SETTINGS["background"]
INK = SETTINGS["ink"]
ACCENT = SETTINGS["accent"]
FRAMES = BUNDLE / "video-review" / "frames"
FRAMES.mkdir(parents=True, exist_ok=True)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    key = "fontBold" if bold else "fontRegular"
    return ImageFont.truetype(SETTINGS[key], size)


def slide(title: str, subtitle: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, WIDTH, 13), fill=ACCENT)
    draw.text((48, 34), title, font=font(34, True), fill=INK)
    draw.text((50, 83), subtitle, font=font(18), fill="#516273")
    return image, draw


def card(draw: ImageDraw.ImageDraw, bounds: tuple[int, int, int, int]) -> None:
    draw.rounded_rectangle(bounds, radius=16, fill="white", outline="#d3dce4", width=2)


def paste_contained(image: Image.Image, path: Path, bounds: tuple[int, int, int, int]) -> None:
    source = Image.open(path).convert("RGB")
    contained = ImageOps.contain(source, (bounds[2] - bounds[0], bounds[3] - bounds[1]))
    x = bounds[0] + (bounds[2] - bounds[0] - contained.width) // 2
    y = bounds[1] + (bounds[3] - bounds[1] - contained.height) // 2
    image.paste(contained, (x, y))


def wrap(draw: ImageDraw.ImageDraw, text: str, xy: tuple[int, int], width: int, size: int = 22) -> int:
    lines: list[str] = []
    for paragraph in text.split("\n"):
        lines.extend(textwrap.wrap(paragraph, width=max(8, width // (size // 2))) or [""])
    draw.multiline_text(xy, "\n".join(lines), font=font(size), fill=INK, spacing=8)
    return len(lines) * (size + 8)


slides: list[Image.Image] = []

# Actual local previews from the five-asset audit.
image, draw = slide("Grid-substation preview audit", "Five current rendered assets • local source review")
samples = [
    ("Dead-tank breaker", BUNDLE / "previews/before/substation-dead-tank-breaker.png"),
    ("Capacitive voltage transformer", BUNDLE / "previews/before/substation-capacitive-voltage-transformer.png"),
    ("Transformer cooling fan", BUNDLE / "previews/before/substation-transformer-cooling-fan.png"),
    ("Station battery rack", BUNDLE / "previews/before/substation-station-battery-rack.png"),
    ("Bus post insulator", BUNDLE / "previews/before/substation-bus-post-insulator.png"),
]
positions = [(36, 132), (446, 132), (856, 132), (241, 405), (651, 405)]
for (label, path), (x, y) in zip(samples, positions, strict=True):
    card(draw, (x, y, x + 388, y + 252))
    paste_contained(image, path, (x + 8, y + 6, x + 380, y + 208))
    draw.text((x + 13, y + 214), label, font=font(15, True), fill=INK)
slides.append(image)

# Before/after target render: only the exposed divider stack color changes.
image, draw = slide("CVT divider stack", "Before and after local preview render • geometry unchanged")
card(draw, (52, 132, 640, 672))
card(draw, (660, 132, 1248, 672))
paste_contained(image, BUNDLE / "previews/before/substation-capacitive-voltage-transformer.png", (64, 144, 628, 586))
paste_contained(image, BUNDLE / "previews/after/substation-capacitive-voltage-transformer.png", (672, 144, 1236, 586))
draw.text((90, 600), "Before • divider sections used powder-coated steel", font=font(17, True), fill=INK)
draw.text((706, 600), "After • divider sections use porcelain", font=font(17, True), fill=INK)
slides.append(image)

# Explicit mapping and retained material controls.
image, draw = slide("Material mapping", "The source keeps the modeled zones editable")
card(draw, (54, 140, 1226, 644))
paste_contained(image, BUNDLE / "previews/after/substation-capacitive-voltage-transformer.png", (76, 172, 540, 606))
draw.text((590, 190), "Porcelain  →  four divider sections", font=font(25, True), fill=INK)
draw.text((590, 258), "Stainless steel  →  base plate + pedestal", font=font(21), fill=INK)
draw.text((590, 310), "Powder-coated steel  →  secondary box", font=font(21), fill=INK)
draw.text((590, 390), "Presets retained: weathered, maintenance", font=font(20), fill=INK)
wrap(draw, "Official manufacturer references support porcelain or composite external CVT insulation. This generic kernelCAD asset does not claim a vendor design or rating.", (590, 452), 570, size=17)
slides.append(image)

# Verification and claim boundary.
image, draw = slide("Verification", "Deterministic checks on the native source and exported GLB")
card(draw, (72, 142, 1208, 625))
y = 188
for line in SETTINGS["verificationLines"]:
    draw.text((112, y), "•  " + line, font=font(20), fill=INK)
    y += 54
wrap(draw, SETTINGS["caveat"], (112, 492), 1040, size=17)
slides.append(image)

for index, frame in enumerate(slides, start=1):
    frame.save(FRAMES / "{:02d}.png".format(index), optimize=True)

concat = FRAMES / "slides.txt"
lines: list[str] = []
for index in range(1, len(slides) + 1):
    lines.extend(["file '{:02d}.png'".format(index), "duration {}".format(SETTINGS["secondsPerSlide"])])
lines.append("file '{:02d}.png'".format(len(slides)))
concat.write_text("\n".join(lines) + "\n", encoding="utf-8")

output = BUNDLE / "grid-substation-cvt-insulation-material-review.mp4"
command = [
    "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat),
    "-vf", "fps={},format=yuv420p".format(SETTINGS["fps"]), "-c:v", "libx264",
    "-preset", "medium", "-crf", "25", "-movflags", "+faststart",
    "-t", str(SETTINGS["secondsPerSlide"] * len(slides)), str(output),
]
with (BUNDLE / "demo-ffmpeg.log").open("w", encoding="utf-8") as log:
    subprocess.run(command, check=True, cwd=FRAMES, stdout=log, stderr=subprocess.STDOUT)
print("Wrote {}".format(output))
