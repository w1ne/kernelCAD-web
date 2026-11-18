#!/usr/bin/env python3
"""Create a short five-preview audit and crossbelt material-correction walkthrough."""

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
MUTED = SETTINGS["muted"]
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
    draw.text((50, 83), subtitle, font=font(18), fill=MUTED)
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

# Five actual baseline previews from the semantic audit.
image, draw = slide("Postal sortation preview audit", "Five existing local renders • one material mismatch established")
samples = [
    ("Automated label applicator", "automated-label-applicator.png"),
    ("Crossbelt sorter section", "crossbelt-sorter-section.png"),
    ("Parcel singulator", "parcel-singulator.png"),
    ("Sliding shoe sorter section", "sliding-shoe-sorter-section.png"),
    ("Telescopic parcel conveyor", "telescopic-parcel-conveyor.png"),
]
positions = [(36, 132), (448, 132), (860, 132), (242, 408), (654, 408)]
for (label, filename), (x, y) in zip(samples, positions, strict=True):
    card(draw, (x, y, x + 384, y + 246))
    paste_contained(image, BUNDLE / "previews/before" / filename, (x + 8, y + 6, x + 376, y + 207))
    draw.text((x + 13, y + 214), label, font=font(15, True), fill=INK)
slides.append(image)

# Baseline local render and mismatch.
image, draw = slide("Before — polymer-colored carrier slabs", "Original local preview • 720 triangles")
card(draw, (48, 132, 658, 672))
paste_contained(image, BUNDLE / "previews/before/crossbelt-sorter-section.png", (60, 144, 646, 658))
card(draw, (696, 164, 1232, 628))
draw.text((736, 198), "Preview finding", font=font(24, True), fill=INK)
wrap(draw, "Four elevated carrier trays use the same molded-polymer surface color. The crossbelt itself is not visible as a separate belt surface, so the carriers read as solid slabs.", (736, 252), 442, size=21)
slides.append(image)

# Native source edit / workflow.
image, draw = slide("Source change — separate carrier and belt materials", "Existing scale and layout • one new material control")
card(draw, (58, 145, 1222, 622))
draw.text((100, 183), "Material control and presets", font=font(23, True), fill=INK)
draw.rounded_rectangle((96, 226, 1182, 330), radius=10, fill="#f1f5f8")
draw.multiline_text((122, 244), "const beltRubber = param('beltRubber', '#30373b',\n  { label: 'Conveyor-belt rubber' });", font=font(22), fill=INK, spacing=8)
draw.text((100, 362), "Four thin belt surfaces sit on the existing tray shells", font=font(21, True), fill=INK)
draw.rounded_rectangle((96, 407, 1182, 538), radius=10, fill="#f1f5f8")
draw.multiline_text((122, 427), 'p.part("tray-1", b(0,-390,790,500,150,42).color(polymer));\np.part("crossbelt-1", b(0,-390,832,470,130,8).color(beltRubber));', font=font(20), fill=INK, spacing=10)
slides.append(image)

# Corrected local preview.
image, draw = slide("After — rubber belt faces read on each tray", "Re-rendered local source • 960 triangles / 1,800 budget")
card(draw, (48, 132, 658, 672))
paste_contained(image, BUNDLE / "previews/after/crossbelt-sorter-section.png", (60, 144, 646, 658))
card(draw, (696, 164, 1232, 628))
draw.text((736, 198), "Material mapping", font=font(24, True), fill=INK)
wrap(draw, "crossbelt-1..4 → beltRubber\ntray-1..4 → polymer\n\nThe thin black belt faces are distinct from the molded carrier shells. The overall 0.775 × 0.84 × 1.18 m envelope is unchanged.", (736, 252), 442, size=21)
slides.append(image)

# Verification and claim boundary.
image, draw = slide("Verification", "Deterministic local checks on source, rendered preview, and exported GLB")
card(draw, (72, 142, 1208, 625))
y = 180
for line in SETTINGS["verificationLines"]:
    draw.text((112, y), "•  " + line, font=font(18), fill=INK)
    y += 43
wrap(draw, SETTINGS["caveat"], (112, 476), 1040, size=18)
slides.append(image)

for index, frame in enumerate(slides, start=1):
    frame.save(FRAMES / f"{index:02d}.png", optimize=True)

concat = FRAMES / "slides.txt"
lines: list[str] = []
for index in range(1, len(slides) + 1):
    lines.extend([f"file '{index:02d}.png'", f"duration {SETTINGS['secondsPerSlide']}"])
lines.append(f"file '{len(slides):02d}.png'")
concat.write_text("\n".join(lines) + "\n", encoding="utf-8")

output = BUNDLE / "postal-crossbelt-sorter-belt-material-review.mp4"
command = [
    "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat),
    "-vf", f"fps={SETTINGS['fps']},format=yuv420p", "-c:v", "libx264",
    "-preset", "medium", "-crf", "25", "-movflags", "+faststart",
    "-t", str(SETTINGS["secondsPerSlide"] * len(slides)), str(output),
]
with (BUNDLE / "demo-ffmpeg.log").open("w", encoding="utf-8") as log:
    subprocess.run(command, check=True, cwd=FRAMES, stdout=log, stderr=subprocess.STDOUT)
print(f"Wrote {output}")
