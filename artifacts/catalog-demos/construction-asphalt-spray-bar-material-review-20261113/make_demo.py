#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

from pathlib import Path
import subprocess

from PIL import Image, ImageDraw, ImageFont, ImageOps

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
SLIDES = HERE / "slides"
VIDEO = HERE / "construction-asphalt-spray-bar-material-review.mp4"
SIZE = (1280, 720)
BG = "#edf2f6"
INK = "#22354a"
MUTED = "#52687e"
PANEL = "#ffffff"
ACCENT = "#2c6f94"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"


def font(size: int, bold: bool = False, mono: bool = False) -> ImageFont.FreeTypeFont:
    path = FONT_MONO if mono else FONT_BOLD if bold else FONT
    return ImageFont.truetype(path, size)


def canvas(title: str, subtitle: str | None = None) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", SIZE, BG)
    draw = ImageDraw.Draw(image)
    draw.text((52, 30), title, fill=INK, font=font(35, bold=True))
    draw.line((52, 86, 1228, 86), fill="#c6d2dc", width=2)
    if subtitle:
        draw.text((54, 98), subtitle, fill=MUTED, font=font(20))
    return image, draw


def place_image(image: Image.Image, path: Path, bounds: tuple[int, int, int, int]) -> None:
    x, y, width, height = bounds
    image_draw = ImageDraw.Draw(image)
    image_draw.rounded_rectangle((x, y, x + width, y + height), radius=12, fill=PANEL, outline="#c6d2dc", width=2)
    source = Image.open(path).convert("RGB")
    fitted = ImageOps.contain(source, (width - 20, height - 20))
    image.paste(fitted, (x + (width - fitted.width) // 2, y + (height - fitted.height) // 2))


def wrapped(draw: ImageDraw.ImageDraw, text: str, x: int, y: int, width: int, size: int = 24, color: str = INK) -> int:
    selected_font = font(size)
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=selected_font)[2] > width and current:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    for line in lines:
        draw.text((x, y), line, fill=color, font=selected_font)
        y += size + 9
    return y


def save(image: Image.Image, name: str) -> None:
    image.save(SLIDES / name)


def make_slides() -> None:
    SLIDES.mkdir(parents=True, exist_ok=True)
    previews = HERE / "previews" / "before"
    samples = [
        ("Cold planer", "cold-planer-milling-machine.png"),
        ("Concrete pump truck", "concrete-pump-truck.png"),
        ("Air compressor", "portable-air-compressor.png"),
        ("Rough-terrain forklift", "rough-terrain-forklift.png"),
        ("Asphalt distributor", "asphalt-distributor-truck.png"),
    ]

    image, draw = canvas("Construction equipment: five preview audit", "Local default software renders · semantic and material review")
    positions = [(48, 138), (454, 138), (860, 138), (251, 407), (657, 407)]
    for (label, filename), (x, y) in zip(samples, positions, strict=True):
        draw.rounded_rectangle((x, y, x + 372, y + 248), radius=12, fill=PANEL, outline="#c6d2dc", width=2)
        draw.text((x + 15, y + 10), label, fill=INK, font=font(21, bold=True))
        source = Image.open(previews / filename).convert("RGB")
        fitted = ImageOps.contain(source, (334, 198))
        image.paste(fitted, (x + (372 - fitted.width) // 2, y + 42 + (198 - fitted.height) // 2))
    save(image, "01-five-preview-audit.png")

    before = HERE / "previews" / "before" / "asphalt-distributor-truck.png"
    image, draw = canvas("Before · asphalt-distributor-truck", "1,196 triangles · the enamel color is shared by the tank, cab and rear spray bar")
    place_image(image, before, (62, 146, 540, 540))
    draw.text((668, 195), "Observed mismatch", fill=ACCENT, font=font(27, bold=True))
    y = wrapped(draw, "The rear spray bar and its nine nozzles render yellow like the tank and cab.", 668, 245, 520, 25)
    y = wrapped(draw, "A distributor spray bar is a bare steel pipe manifold with steel nozzles.", 668, y + 15, 520, 25)
    wrapped(draw, "The preview still reads as a tanker truck with a rear spray bar.", 668, y + 15, 520, 25, MUTED)
    save(image, "02-before.png")

    image, draw = canvas("Material mapping in the source", "Ten part material assignments corrected · geometry stays unchanged")
    draw.rounded_rectangle((72, 152, 1208, 552), radius=16, fill="#182633")
    mono = font(27, mono=True)
    code = [
        ("Before", "spray-bar, spray-nozzle-0..8 → equipmentPaintColor", "#f6a34b"),
        ("After", "spray-bar, spray-nozzle-0..8 → structuralSteelColor", "#9ed3a8"),
        ("Unchanged", "tank, cab → equipmentPaintColor | chassis → steel", "#d8e1e8"),
    ]
    y = 202
    for label, snippet, color in code:
        draw.text((112, y), label, fill="#9fc7dc", font=font(22, bold=True))
        draw.text((292, y - 2), snippet, fill=color, font=mono)
        y += 102
    draw.text((78, 604), "The tank and cab keep the enamel; the spray bar now uses the existing steel control.", fill=INK, font=font(22))
    save(image, "03-source-material.png")

    after = HERE / "previews" / "after" / "asphalt-distributor-truck.png"
    image, draw = canvas("After · asphalt-distributor-truck", "Spray bar and nozzles are steel · tank and cab keep the equipment enamel")
    place_image(image, after, (62, 146, 540, 540))
    draw.text((668, 195), "Result", fill=ACCENT, font=font(27, bold=True))
    y = wrapped(draw, "The spray bar and nine nozzles now use the structural steel control shared with the chassis and hubs.", 668, 245, 520, 25)
    y = wrapped(draw, "The tank, saddles and cab retain the equipment enamel control.", 668, y + 15, 520, 25)
    wrapped(draw, "1,196 triangles, parameters and presets are unchanged.", 668, y + 15, 520, 25, MUTED)
    save(image, "04-after.png")

    image, draw = canvas("Local verification", "Source, generated preview, exported GLB regression, and catalog index")
    bullets = [
        "Focused exported-GLB regression: 1/1 passed; baseline failed on the wrong palette assignment.",
        "Construction-equipment quality gate: 60/60; this is a structural check, not a realism score.",
        "Catalog index: 2,402 rows retained; only asphalt-distributor-truck changed; source SHA and preview path match.",
        "1,196 triangles / 2,200 budget; four material controls and two presets remain.",
    ]
    y = 158
    for item in bullets:
        draw.ellipse((80, y + 8, 98, y + 26), fill=ACCENT)
        y = wrapped(draw, item, 118, y, 1080, 23) + 17
    draw.rounded_rectangle((68, 566, 1210, 662), radius=12, fill="#dce7ee")
    wrapped(draw, "Local source and software preview evidence only. Not deployed; no paving process or equipment acceptance is claimed.", 92, 585, 1090, 20, MUTED)
    save(image, "05-verification.png")


def make_video() -> None:
    durations = [3, 3, 3, 4, 3]
    names = [
        "01-five-preview-audit.png",
        "02-before.png",
        "03-source-material.png",
        "04-after.png",
        "05-verification.png",
    ]
    manifest = SLIDES / "ffmpeg-concat.txt"
    with manifest.open("w", encoding="utf-8") as output:
        for name, duration in zip(names, durations, strict=True):
            output.write(f"file '{(SLIDES / name).resolve()}'\n")
            output.write(f"duration {duration}\n")
        output.write(f"file '{(SLIDES / names[-1]).resolve()}'\n")
    subprocess.run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(manifest),
        "-vf", "fps=24,format=yuv420p", "-c:v", "libx264", "-crf", "19",
        "-movflags", "+faststart", str(VIDEO),
    ], check=True)


if __name__ == "__main__":
    make_slides()
    make_video()
    print(VIDEO)
