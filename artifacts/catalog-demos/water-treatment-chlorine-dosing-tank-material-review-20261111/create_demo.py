#!/usr/bin/env python3
"""Render a short local preview-audit and material-correction handoff video."""

from __future__ import annotations

import json
import subprocess
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


BUNDLE = Path(__file__).resolve().parent
REPO = BUNDLE.parents[2]
SETTINGS = json.loads((BUNDLE / "demo-settings.json").read_text(encoding="utf-8"))
WIDTH = SETTINGS["width"]
HEIGHT = SETTINGS["height"]
BG = SETTINGS["background"]
INK = SETTINGS["ink"]
ACCENT = SETTINGS["accent"]
FONT_REGULAR = SETTINGS["fontRegular"]
FONT_BOLD = SETTINGS["fontBold"]
FRAMES = BUNDLE / "video-review" / "frames"
FRAMES.mkdir(parents=True, exist_ok=True)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REGULAR, size)


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

# Actual rendered sample previews from the five-asset audit.
image, draw = slide("Industrial preview audit", "Five checked-in kernelCAD renders • local source review")
samples = [
    ("Ballistic separator", BUNDLE / "sample-previews/ballistic-separator.png"),
    ("Wind turbine blade", BUNDLE / "sample-previews/wind-turbine-blade.png"),
    ("Chlorine dosing skid", BUNDLE / "previews/before/chlorine-dosing-skid.png"),
    ("Oil cooling pump skid", BUNDLE / "sample-previews/substation-oil-cooling-pump-skid.png"),
    ("Continuous miner", BUNDLE / "sample-previews/continuous-miner.png"),
]
cell_w, cell_h = 388, 276
for index, (label, path) in enumerate(samples):
    row, col = divmod(index, 3)
    x = 34 + col * 410
    y = 126 + row * 286
    card(draw, (x, y, x + cell_w, y + cell_h))
    paste_contained(image, path, (x + 10, y + 8, x + cell_w - 10, y + cell_h - 46))
    draw.text((x + 14, y + cell_h - 38), label, font=font(16, True), fill=INK)
slides.append(image)

# Before state: all three equipment parts share coated-steel color.
image, draw = slide("Before — tank grouped with coated steel", "Original local preview • geometry and envelope unchanged")
card(draw, (52, 132, 662, 672))
paste_contained(image, BUNDLE / "previews/before/chlorine-dosing-skid.png", (65, 145, 649, 657))
card(draw, (698, 170, 1228, 622))
draw.text((738, 205), "Original material grouping", font=font(23, True), fill=INK)
wrap(draw, "day-tank → coatedSteel\npump → coatedSteel\ncontrol → coatedSteel\n\nThe chemical day tank had no independent material color control.", (738, 262), 440, size=22)
slides.append(image)

# After state: chemical tank is separated from equipment paint.
image, draw = slide("After — separate polyethylene tank control", "Source re-render • 188 triangles • 0.88 × 0.51 × 0.52 m envelope")
card(draw, (52, 132, 662, 672))
paste_contained(image, BUNDLE / "previews/after/chlorine-dosing-skid.png", (65, 145, 649, 657))
card(draw, (698, 170, 1228, 622))
draw.text((738, 205), "Material grouping", font=font(23, True), fill=INK)
wrap(draw, "day-tank → chemicalTankPolyethylene\npump, control → coatedSteel\n\nStructural steel and stainless tubing keep their existing controls.", (738, 262), 440, size=22)
slides.append(image)

# Source excerpt: authored material control and preset values.
image, draw = slide("Named color control and presets", "Native .kcad.ts parameters drive the local preview")
card(draw, (72, 144, 1208, 632))
code = [
    "const chemicalTankPolyethylene = param(",
    "  'chemicalTankPolyethylene', '#c7dce0', {",
    "    label: 'Chemical day tank (polyethylene)',",
    "  },",
    ");",
    "",
    "weathered:     '#aebbbc'",
    "highVisibility:'#ebf2f1'",
    "",
    "day-tank → chemicalTankPolyethylene",
]
y = 180
for line in code:
    draw.text((118, y), line, font=font(21, line.startswith("const ") or "day-tank" in line), fill="#263b4d")
    y += 40
slides.append(image)

# Verification and limits.
image, draw = slide("Verification and limits", "Deterministic local checks for the reviewed source")
card(draw, (72, 142, 1208, 625))
y = 188
for line in SETTINGS["verificationLines"]:
    passed = "passed" in line.lower() or "clean" in line.lower() or "50/50" in line or "99.96%" in line
    color = ACCENT if passed else "#596b7a"
    draw.text((112, y), ("✓  " if passed else "•  ") + line, font=font(21, passed), fill=color)
    y += 58
wrap(draw, SETTINGS["caveat"], (112, 465), 1040, size=18)
slides.append(image)

for index, frame in enumerate(slides, start=1):
    frame.save(FRAMES / f"{index:02d}.png", optimize=True)

concat = FRAMES / "slides.txt"
lines: list[str] = []
for index in range(1, len(slides) + 1):
    lines.extend([f"file '{index:02d}.png'", f"duration {SETTINGS['secondsPerSlide']}"])
lines.append(f"file '{len(slides):02d}.png'")
concat.write_text("\n".join(lines) + "\n", encoding="utf-8")

output = BUNDLE / "water-treatment-chlorine-dosing-tank-material-review.mp4"
command = [
    "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat),
    "-vf", f"fps={SETTINGS['fps']},format=yuv420p", "-c:v", "libx264",
    "-preset", "medium", "-crf", "25", "-movflags", "+faststart",
    "-t", str(SETTINGS["secondsPerSlide"] * len(slides)), str(output),
]
with (BUNDLE / "verification" / "demo-ffmpeg.log").open("w", encoding="utf-8") as log:
    subprocess.run(command, check=True, cwd=FRAMES, stdout=log, stderr=subprocess.STDOUT)
print(f"Wrote {output}")
