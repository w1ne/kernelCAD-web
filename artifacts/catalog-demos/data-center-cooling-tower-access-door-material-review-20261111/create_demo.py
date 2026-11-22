#!/usr/bin/env python3
"""Create a short preview-audit and access-door material-fix walkthrough."""

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


def wrap(draw: ImageDraw.ImageDraw, content: str, xy: tuple[int, int], width: int, size: int = 22) -> None:
    lines: list[str] = []
    for paragraph in content.split("\n"):
        lines.extend(textwrap.wrap(paragraph, width=max(8, width // (size // 2))) or [""])
    draw.multiline_text(xy, "\n".join(lines), font=font(size), fill=INK, spacing=8)


slides: list[Image.Image] = []

# The actual five local baseline previews used for the audit.
image, draw = slide("Data-center equipment preview audit", "Five current local renders • one material-control mismatch corrected")
samples = [
    ("Air-cooled chiller", "air-cooled-chiller.png"),
    ("Cooling-tower cell", "cooling-tower-cell.png"),
    ("Dry-type transformer", "dry-type-transformer.png"),
    ("Standby generator enclosure", "standby-generator-enclosure.png"),
    ("Clean-agent cylinder bank", "clean-agent-cylinder-bank.png"),
]
positions = [(36, 132), (446, 132), (856, 132), (241, 405), (651, 405)]
for (label, filename), (x, y) in zip(samples, positions, strict=True):
    card(draw, (x, y, x + 388, y + 252))
    paste_contained(image, BUNDLE / "previews/before" / filename, (x + 8, y + 6, x + 380, y + 208))
    draw.text((x + 13, y + 214), label, font=font(16, True), fill=INK)
slides.append(image)

# Baseline object render and material-control mapping.
image, draw = slide("Before — access door follows fan-stack finish", "Original local render • 2,110 triangles")
card(draw, (52, 132, 662, 672))
paste_contained(image, BUNDLE / "previews/before/cooling-tower-cell.png", (64, 144, 650, 657))
card(draw, (698, 168, 1228, 624))
draw.text((738, 203), "Material mapping", font=font(24, True), fill=INK)
wrap(draw, "access-door → stack\nfan-stack → stack\n\nThe FRP access panel stays light grey while the teal casing changes, because the door uses the fan-stack control.", (738, 262), 440, size=21)
slides.append(image)

# New source render after the panel follows the casing control.
image, draw = slide("After — door follows casing finish", "Re-rendered local source • same geometry and 2,110 triangles")
card(draw, (52, 132, 662, 672))
paste_contained(image, BUNDLE / "previews/after/cooling-tower-cell.png", (64, 144, 650, 657))
card(draw, (698, 168, 1228, 624))
draw.text((738, 203), "Material mapping", font=font(24, True), fill=INK)
wrap(draw, "access-door → casing\nfan-stack → stack\n\nThe door shares the molded FRP casing control; the fan stack keeps its independent finish.", (738, 262), 440, size=21)
slides.append(image)

# Verification and claim boundary.
image, draw = slide("Verification", "Deterministic local checks on the source and exported GLB")
card(draw, (72, 142, 1208, 625))
y = 188
for line in SETTINGS["verificationLines"]:
    draw.text((112, y), "•  " + line, font=font(20), fill=INK)
    y += 57
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

output = BUNDLE / "data-center-cooling-tower-access-door-material-review.mp4"
command = [
    "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat),
    "-vf", f"fps={SETTINGS['fps']},format=yuv420p", "-c:v", "libx264",
    "-preset", "medium", "-crf", "25", "-movflags", "+faststart",
    "-t", str(SETTINGS["secondsPerSlide"] * len(slides)), str(output),
]
with (BUNDLE / "demo-ffmpeg.log").open("w", encoding="utf-8") as log:
    subprocess.run(command, check=True, cwd=FRAMES, stdout=log, stderr=subprocess.STDOUT)
print(f"Wrote {output}")
