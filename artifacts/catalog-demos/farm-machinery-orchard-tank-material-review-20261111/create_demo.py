#!/usr/bin/env python3
"""Create an inspected local before/after preview handoff video."""

import json
import subprocess
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


BUNDLE = Path(__file__).resolve().parent
REPO = BUNDLE.parents[3]
SETTINGS = json.loads((BUNDLE / "demo-settings.json").read_text(encoding="utf-8"))
WIDTH = SETTINGS["width"]
HEIGHT = SETTINGS["height"]
BG = SETTINGS["background"]
INK = SETTINGS["ink"]
ACCENT = SETTINGS["accent"]
REGULAR = SETTINGS["fontRegular"]
BOLD = SETTINGS["fontBold"]
FRAMES = BUNDLE / "video-inputs"
FRAMES.mkdir(parents=True, exist_ok=True)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(BOLD if bold else REGULAR, size)


def base_slide(title: str, subtitle: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, WIDTH, 13), fill=ACCENT)
    draw.text((48, 34), title, font=font(34, True), fill=INK)
    draw.text((50, 82), subtitle, font=font(17), fill="#516273")
    return image, draw


def rounded_card(draw: ImageDraw.ImageDraw, bounds: tuple[int, int, int, int]) -> None:
    draw.rounded_rectangle(bounds, radius=16, fill="white", outline="#d3dce4", width=2)


def paste_contained(image: Image.Image, path: Path, bounds: tuple[int, int, int, int]) -> None:
    source = Image.open(path).convert("RGB")
    contained = ImageOps.contain(source, (bounds[2] - bounds[0], bounds[3] - bounds[1]))
    x = bounds[0] + (bounds[2] - bounds[0] - contained.width) // 2
    y = bounds[1] + (bounds[3] - bounds[1] - contained.height) // 2
    image.paste(contained, (x, y))


def wrap(draw: ImageDraw.ImageDraw, text: str, xy: tuple[int, int], width: int, size: int = 23, color: str = INK) -> int:
    lines = []
    for paragraph in text.split("\n"):
        lines.extend(textwrap.wrap(paragraph, width=max(8, width // (size // 2))) or [""])
    draw.multiline_text(xy, "\n".join(lines), font=font(size), fill=color, spacing=8)
    return len(lines) * (size + 8)


slides: list[Image.Image] = []

# Slide 1: actual rendered sample previews from the five-asset audit.
image, draw = base_slide("Farm machinery semantic preview audit", "Five checked-in kernelCAD renders • local source review")
sample = [
    ("orchard-air-blast-sprayer", BUNDLE / "before/orchard-air-blast-sprayer.png"),
    ("potato-harvester", BUNDLE / "sample-previews/potato-harvester.png"),
    ("self-propelled-field-sprayer", BUNDLE / "sample-previews/self-propelled-field-sprayer.png"),
    ("grain-dryer", BUNDLE / "sample-previews/grain-dryer.png"),
    ("farm-grain-auger", BUNDLE / "sample-previews/farm-grain-auger.png"),
]
cell_w, cell_h = 388, 276
for index, (label, path) in enumerate(sample):
    row, col = divmod(index, 3)
    x = 34 + col * 410
    y = 126 + row * 286
    rounded_card(draw, (x, y, x + cell_w, y + cell_h))
    paste_contained(image, path, (x + 10, y + 8, x + cell_w - 10, y + cell_h - 46))
    draw.text((x + 14, y + cell_h - 38), label, font=font(14, True), fill=INK)
slides.append(image)

# Slide 2: baseline render and exact source mismatch.
image, draw = base_slide("Before — tank grouped with painted steel", "The original 400-triangle preview and source assignment")
rounded_card(draw, (52, 132, 662, 672))
paste_contained(image, BUNDLE / "before/orchard-air-blast-sprayer.png", (65, 145, 649, 657))
rounded_card(draw, (698, 170, 1228, 622))
draw.text((738, 205), "Source assignment", font=font(23, True), fill=INK)
wrap(draw, "chemical-tank → paintedSteelColor\n\nThe tank shares its finish control with the chassis and cab, so its material cannot be varied independently.", (738, 258), 440, size=22)
slides.append(image)

# Slide 3: corrected source-rendered preview.
image, draw = base_slide("After — tank has its own polymer control", "Geometry, envelope, and 400-triangle count are unchanged")
rounded_card(draw, (52, 132, 662, 672))
paste_contained(image, BUNDLE / "after/orchard-air-blast-sprayer.png", (65, 145, 649, 657))
rounded_card(draw, (698, 170, 1228, 622))
draw.text((738, 205), "Source assignment", font=font(23, True), fill=INK)
wrap(draw, "chemical-tank → tankPolymerColor\n\nThe pale tank reads separately from the green painted chassis. Existing rubber, cab glass, and exposed-steel controls remain.", (738, 258), 440, size=22)
slides.append(image)

# Slide 4: source excerpt retained in the handoff bundle.
image, draw = base_slide("Material control added to the authored source", "Existing preset names and geometry are preserved")
rounded_card(draw, (72, 144, 1208, 632))
code = [
    "const tankPolymerColor = param('tankPolymerColor', '#e7eadf', { label: 'Tank polymer' });",
    "",
    "presets({",
    "  weathered: { ..., tankPolymerColor: '#d4d7c9', ... },",
    "  highVisibility: { ..., tankPolymerColor: '#eff1e8', ... },",
    "});",
    "",
    "add('chemical-tank',",
    "  slopedPrism(693, 437, 585).translate(0, 34.5, 1117.5),",
    "  tankPolymerColor);",
]
y = 180
for line in code:
    draw.text((118, y), line, font=font(20, line.startswith("const ") or line.startswith("add(")), fill="#263b4d")
    y += 40
slides.append(image)

# Slide 5: verification state is read from the retained settings file.
image, draw = base_slide("Verification and limits", "Deterministic local checks for the reviewed source")
rounded_card(draw, (72, 142, 1208, 625))
y = 190
for line in SETTINGS["verificationLines"]:
    color = ACCENT if "passed" in line or "clean" in line or "60/60" in line else "#596b7a"
    draw.text((112, y), ("✓  " if color == ACCENT else "•  ") + line, font=font(22, color == ACCENT), fill=color)
    y += 70
wrap(draw, SETTINGS["caveat"], (112, 530), 1040, size=18, color="#657482")
slides.append(image)

for index, slide in enumerate(slides, start=1):
    slide.save(FRAMES / f"{index:02d}.png", optimize=True)

concat = FRAMES / "slides.txt"
lines = []
for index in range(1, len(slides) + 1):
    lines.extend([f"file '{index:02d}.png'", f"duration {SETTINGS['secondsPerSlide']}"])
lines.append(f"file '{len(slides):02d}.png'")
concat.write_text("\n".join(lines) + "\n", encoding="utf-8")

output = BUNDLE / "farm-machinery-orchard-tank-material-review.mp4"
command = [
    "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat),
    "-vf", f"fps={SETTINGS['fps']},format=yuv420p", "-c:v", "libx264",
    "-preset", "medium", "-crf", "25", "-movflags", "+faststart",
    "-t", str(SETTINGS["secondsPerSlide"] * len(slides)), str(output),
]
subprocess.run(command, check=True, cwd=FRAMES)
print(f"Wrote {output}")
