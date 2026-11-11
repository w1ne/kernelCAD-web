#!/usr/bin/env python3
"""Create a short local preview audit and glass-crusher material-fix video."""

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

# Actual baseline previews used for the five-asset audit.
image, draw = slide("Recycling equipment preview audit", "Five local renders • one material mismatch corrected")
samples = [
    ("Primary shredder", BUNDLE / "previews/before/primary-shredder.png"),
    ("Glass crusher", BUNDLE / "previews/before/glass-crusher.png"),
    ("Food-waste depackager", BUNDLE / "previews/before/food-waste-depackager.png"),
    ("Eddy-current separator", BUNDLE / "previews/before/eddy-current-separator.png"),
    ("Trommel screen", BUNDLE / "previews/before/recycling-trommel-screen.png"),
]
positions = [(36, 132), (446, 132), (856, 132), (241, 405), (651, 405)]
for (label, path), (x, y) in zip(samples, positions, strict=True):
    card(draw, (x, y, x + 388, y + 252))
    paste_contained(image, path, (x + 8, y + 6, x + 380, y + 208))
    draw.text((x + 13, y + 214), label, font=font(16, True), fill=INK)
slides.append(image)

# Baseline asset: the motor and mill share the blue enamel parameter.
image, draw = slide("Before — motor shares mill enamel", "Original local glass-crusher preview • 2,212 triangles")
card(draw, (52, 132, 662, 672))
paste_contained(image, BUNDLE / "previews/before/glass-crusher.png", (64, 144, 650, 657))
card(draw, (698, 168, 1228, 624))
draw.text((738, 203), "Material mapping", font=font(24, True), fill=INK)
wrap(draw, "mill-drum → housing\nmotor → housing\n\nThe separate drive casing uses the same blue enamel as the mill shell, so the two parts lose contrast.", (738, 262), 440, size=22)
slides.append(image)

# Actual source render after the part uses the existing painted-steel finish.
image, draw = slide("After — motor uses painted steel", "Local source re-render • unchanged geometry and triangle count")
card(draw, (52, 132, 662, 672))
paste_contained(image, BUNDLE / "previews/after/glass-crusher.png", (64, 144, 650, 657))
card(draw, (698, 168, 1228, 624))
draw.text((738, 203), "Existing controls retained", font=font(23, True), fill=INK)
wrap(draw, "mill-drum → mill enamel\nmotor → painted-steel finish\n\nThe existing `stand` key and all four color controls and presets remain. No geometry changed.", (738, 262), 440, size=21)
slides.append(image)

# Verification and claim boundary.
image, draw = slide("Verification", "Deterministic checks on the native source and exported GLB")
card(draw, (72, 142, 1208, 625))
y = 188
for line in SETTINGS["verificationLines"]:
    draw.text((112, y), "•  " + line, font=font(21), fill=INK)
    y += 58
wrap(draw, SETTINGS["caveat"], (112, 475), 1040, size=18)
slides.append(image)

for index, frame in enumerate(slides, start=1):
    frame.save(FRAMES / f"{index:02d}.png", optimize=True)

concat = FRAMES / "slides.txt"
lines: list[str] = []
for index in range(1, len(slides) + 1):
    lines.extend([f"file '{index:02d}.png'", f"duration {SETTINGS['secondsPerSlide']}"])
lines.append(f"file '{len(slides):02d}.png'")
concat.write_text("\n".join(lines) + "\n", encoding="utf-8")

output = BUNDLE / "recycling-facility-glass-crusher-motor-material-review.mp4"
command = [
    "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat),
    "-vf", f"fps={SETTINGS['fps']},format=yuv420p", "-c:v", "libx264",
    "-preset", "medium", "-crf", "25", "-movflags", "+faststart",
    "-t", str(SETTINGS["secondsPerSlide"] * len(slides)), str(output),
]
with (BUNDLE / "demo-ffmpeg.log").open("w", encoding="utf-8") as log:
    subprocess.run(command, check=True, cwd=FRAMES, stdout=log, stderr=subprocess.STDOUT)
print(f"Wrote {output}")
