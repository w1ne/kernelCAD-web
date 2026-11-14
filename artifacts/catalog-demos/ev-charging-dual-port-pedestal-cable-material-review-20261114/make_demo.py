#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

from pathlib import Path
import subprocess

from PIL import Image, ImageDraw, ImageFont, ImageOps

HERE = Path(__file__).resolve().parent
SLIDES = HERE / "slides"
VIDEO = HERE / "ev-charging-dual-port-pedestal-cable-material-review.mp4"
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
    ImageDraw.Draw(image).rounded_rectangle(
        (x, y, x + width, y + height), radius=12, fill=PANEL, outline="#c6d2dc", width=2
    )
    source = Image.open(path).convert("RGB")
    fitted = ImageOps.contain(source, (width - 20, height - 20))
    image.paste(fitted, (x + (width - fitted.width) // 2, y + (height - fitted.height) // 2))


def wrapped(draw: ImageDraw.ImageDraw, text: str, x: int, y: int, width: int, size: int = 24, color: str = INK) -> int:
    selected = font(size)
    lines: list[str] = []
    current = ""
    for word in text.split():
        candidate = f"{current} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=selected)[2] > width and current:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    for line in lines:
        draw.text((x, y), line, fill=color, font=selected)
        y += size + 9
    return y


def save(image: Image.Image, name: str) -> None:
    image.save(SLIDES / name)


def make_slides() -> None:
    SLIDES.mkdir(parents=True, exist_ok=True)
    sample_specs = [
        ("Dual-port AC pedestal", "previews/before/dual-port-ac-pedestal.png"),
        ("EV metering pedestal", "samples/ev-metering-pedestal.png"),
        ("Home AC wallbox", "samples/home-ac-wallbox.png"),
        ("Mobile fast-charge cart", "samples/mobile-fast-charge-cart.png"),
        ("Coiled charging cable reel", "samples/coiled-charging-cable-reel.png"),
    ]
    image, draw = canvas("EV charging assets: five preview audit", "Local default software renders · semantic and material review")
    positions = [(48, 138), (454, 138), (860, 138), (251, 407), (657, 407)]
    for (label, relative), (x, y) in zip(sample_specs, positions, strict=True):
        draw.rounded_rectangle((x, y, x + 372, y + 248), radius=12, fill=PANEL, outline="#c6d2dc", width=2)
        draw.text((x + 15, y + 10), label, fill=INK, font=font(21, bold=True))
        source = Image.open(HERE / relative).convert("RGB")
        fitted = ImageOps.contain(source, (334, 198))
        image.paste(fitted, (x + (372 - fitted.width) // 2, y + 42 + (198 - fitted.height) // 2))
    save(image, "01-five-preview-audit.png")

    before = HERE / "previews" / "before" / "dual-port-ac-pedestal.png"
    image, draw = canvas("Before · dual-port AC pedestal", "352 triangles · both cable leads use the powder-coated metal control of the enclosure")
    place_image(image, before, (62, 146, 540, 540))
    draw.text((668, 195), "Observed mismatch", fill=ACCENT, font=font(27, bold=True))
    y = wrapped(draw, "Both hanging cable leads render in the teal powder-coat finish of the enclosure.", 668, 245, 520, 25)
    y = wrapped(draw, "They read as painted metal bars, not as flexible charging cables.", 668, y + 15, 520, 25)
    wrapped(draw, "The asset had no cable control. Sibling assets in the kit use a dark cable-elastomer control.", 668, y + 15, 520, 25, MUTED)
    save(image, "02-before.png")

    image, draw = canvas("Material mapping in the source", "Cable material corrected · powder coat retained on the enclosure")
    draw.rounded_rectangle((72, 152, 1208, 552), radius=16, fill="#182633")
    mono = font(26, mono=True)
    lines = [
        ("Before", "left-cable, right-cable → powderCoat", "#f6c34b"),
        ("After", "left-cable, right-cable → cableElastomer (new)", "#9ed3a8"),
        ("Enclosure", "column, enclosure, door → powderCoat", "#f6c34b"),
    ]
    y = 202
    for label, snippet, color in lines:
        draw.text((112, y), label, fill="#9fc7dc", font=font(22, bold=True))
        draw.text((292, y - 2), snippet, fill=color, font=mono)
        y += 102
    draw.text((78, 604), "The pedestal keeps its four existing colour controls; both presets gain a cable-elastomer value.", fill=INK, font=font(22))
    save(image, "03-source-material.png")

    after = HERE / "previews" / "after" / "dual-port-ac-pedestal.png"
    image, draw = canvas("After · dual-port AC pedestal", "352 triangles / 2,400 budget · dark cable leads on a teal enclosure")
    place_image(image, after, (62, 146, 540, 540))
    draw.text((668, 195), "Result", fill=ACCENT, font=font(27, bold=True))
    y = wrapped(draw, "Both cable leads now use a dark cable-elastomer finish.", 668, 245, 520, 25)
    y = wrapped(draw, "The enclosure, column and caps keep the powder-coat finish.", 668, y + 15, 520, 25)
    wrapped(draw, "The envelope, geometry, existing parameters and preset names are retained. The leads are still straight rods; that geometry limit is recorded, not corrected.", 668, y + 15, 520, 25, MUTED)
    save(image, "04-after.png")

    image, draw = canvas("Local verification", "Source, preview, exported GLB regression, and generated catalog index")
    bullets = [
        "Focused exported-GLB regression: failed before the fix, 1/1 passed after; cable leads and enclosure have separate verified colors.",
        "EV charging kit ESLint: clean; updated render: 352 triangles within the 2,400-triangle budget.",
        "Catalog index regenerated from source; the dual-port-ac-pedestal row has a fresh source hash and preview path.",
        "PR #1258: no failed check at the start of the round; no review was submitted. This branch is not deployed.",
    ]
    y = 158
    for item in bullets:
        draw.ellipse((80, y + 8, 98, y + 26), fill=ACCENT)
        y = wrapped(draw, item, 118, y, 1080, 23) + 17
    draw.rounded_rectangle((68, 566, 1210, 662), radius=12, fill="#dce7ee")
    wrapped(draw, "Local source and software-render evidence only. No electrical ratings, connector standard, live deployment, simulation, or hardware acceptance is claimed.", 92, 585, 1090, 20, MUTED)
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
            output.write(f"file '{name}'\n")
            output.write(f"duration {duration}\n")
        output.write(f"file '{names[-1]}'\n")
    subprocess.run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(manifest),
        "-vf", "fps=24,format=yuv420p", "-c:v", "libx264", "-crf", "19",
        "-movflags", "+faststart", str(VIDEO),
    ], check=True)


if __name__ == "__main__":
    make_slides()
    make_video()
    print(VIDEO)
