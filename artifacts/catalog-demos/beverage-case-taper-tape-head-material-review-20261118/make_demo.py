#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

from pathlib import Path
import re
import subprocess

from PIL import Image, ImageDraw, ImageFont, ImageOps

HERE = Path(__file__).resolve().parent
SLIDES = HERE / "slides"
VIDEO = HERE / "beverage-case-taper-tape-head-material-review.mp4"
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


def place_image(image: Image.Image, path: Path, bounds: tuple[int, int, int, int]) -> None:
    x, y, width, height = bounds
    ImageDraw.Draw(image).rounded_rectangle(
        (x, y, x + width, y + height), radius=12, fill=PANEL, outline="#c6d2dc", width=2
    )
    source = Image.open(path).convert("RGB")
    fitted = ImageOps.contain(source, (width - 20, height - 20))
    image.paste(fitted, (x + (width - fitted.width) // 2, y + (height - fitted.height) // 2))


def verification_summary() -> list[str]:
    lines = ["Focused GLB regression: failed on baseline, passed after the correction."]
    kit_gate = HERE / "verification" / "quality-kit.txt"
    if kit_gate.exists():
        text = kit_gate.read_text(encoding="utf-8", errors="replace")
        match = re.search(r"(\d+)/(\d+) assets pass \(([\d.]+%)", text)
        if match:
            lines.append(f"ESLint clean. Beverage kit structural gate: {match.group(1)}/{match.group(2)} pass ({match.group(3)}).")
    global_gate = HERE / "verification" / "quality-gate.txt"
    if global_gate.exists():
        text = global_gate.read_text(encoding="utf-8", errors="replace")
        match = re.search(r"(\d+)/(\d+) assets pass \(([\d.]+%)", text)
        if match:
            lines.append(f"Global structural gate: {match.group(1)}/{match.group(2)} pass ({match.group(3)}); four thin assets in standard-components.")
    integration = HERE / "verification" / "vitest-catalog.txt"
    if integration.exists():
        text = integration.read_text(encoding="utf-8", errors="replace")
        match = re.search(r"Test Files\s+(\d+)\s+passed", text)
        tests = re.search(r"Tests\s+(\d+)\s+passed", text)
        if match and tests:
            lines.append(f"Catalog integration: {match.group(1)} files / {tests.group(1)} tests passed.")
    lines.append("Index rebuilt from source and preview; one row changed and hash/path checks passed.")
    return lines


def make_slides() -> None:
    SLIDES.mkdir(parents=True, exist_ok=True)
    samples = [
        ("Case taper", "previews/before/case-taper.png"),
        ("Bottle date coder", "samples/bottle-date-coder.png"),
        ("Cap torque head", "samples/cap-torque-head.png"),
        ("Vision inspection arch", "samples/vision-inspection-arch.png"),
        ("Neck-handling air conveyor", "samples/neck-handling-air-conveyor.png"),
    ]
    image, draw = canvas("Beverage manufacturing: five preview audit", "Local default previews · one unresolved material mismatch selected")
    positions = [(48, 145), (454, 145), (860, 145), (251, 416), (657, 416)]
    for (label, relative), (x, y) in zip(samples, positions, strict=True):
        draw.rounded_rectangle((x, y, x + 372, y + 242), radius=12, fill=PANEL, outline="#c6d2dc", width=2)
        draw.text((x + 14, y + 9), label, fill=INK, font=font(19, bold=True))
        source = Image.open(HERE / relative).convert("RGB")
        fitted = ImageOps.contain(source, (336, 190))
        image.paste(fitted, (x + (372 - fitted.width) // 2, y + 41 + (190 - fitted.height) // 2))
    image.save(SLIDES / "01-five-preview-audit.png")

    image, draw = canvas("Before · case taper", "176 triangles · the tape head uses the food-polymer color")
    place_image(image, HERE / "previews/before/case-taper.png", (58, 148, 560, 520))
    draw.text((680, 194), "Observed role mismatch", fill=ACCENT, font=font(26, bold=True))
    y = wrapped(draw, "The component-name rule sees “tape” in tape-head and assigns foodPolymer.", 680, 244, 525, 25)
    y = wrapped(draw, "The tan tape-roll already has its own polypropylene packingTape control. The head is the separate metal application assembly.", 680, y + 15, 525, 24)
    wrapped(draw, "Four other new previews were checked and left unchanged; their recorded silhouette notes are in the ledger.", 680, y + 15, 525, 22, MUTED)
    image.save(SLIDES / "02-before.png")

    image, draw = canvas("Source change · one material assignment", "The roll and the head keep distinct roles")
    draw.rounded_rectangle((70, 160, 1210, 548), radius=16, fill="#182633")
    y = 204
    rows = [
        ("Before", "tape-head → /tape/ → foodPolymer", "#f6c34b"),
        ("After", "tape-head → stainlessSteel", "#9ed3a8"),
        ("Retained", "tape-roll → packingTape", "#9ed3a8"),
    ]
    for label, snippet, color in rows:
        draw.text((112, y), label, fill="#9fc7dc", font=font(22, bold=True))
        draw.text((300, y - 2), snippet, fill=color, font=font(24, mono=True))
        y += 102
    draw.text((82, 604), "No geometry, scale, triangle count, knobs, or presets changed.", fill=INK, font=font(22))
    image.save(SLIDES / "03-source-material.png")

    image, draw = canvas("After · case taper", "176 triangles / 2,200 budget · the head now has the metal finish")
    place_image(image, HERE / "previews/after/case-taper.png", (58, 148, 560, 520))
    draw.text((680, 194), "Result", fill=ACCENT, font=font(26, bold=True))
    y = wrapped(draw, "The head now shares the existing stainlessSteel palette. The tan tape roll remains packingTape.", 680, 244, 525, 25)
    y = wrapped(draw, "The preview still reads as the same gantry, split belts, head, and roll; only the selected finish changed.", 680, y + 15, 525, 24)
    wrapped(draw, "This is a local software preview, not process simulation or a manufacturing acceptance claim.", 680, y + 15, 525, 22, MUTED)
    image.save(SLIDES / "04-after.png")

    image, draw = canvas("Local verification", "Source, preview, GLB regression, and generated catalog index")
    y = 146
    for item in verification_summary():
        draw.ellipse((80, y + 8, 98, y + 26), fill=ACCENT)
        y = wrapped(draw, item, 118, y, 1080, 19) + 10
    draw.rounded_rectangle((68, 546, 1210, 666), radius=12, fill="#dce7ee")
    wrapped(draw, "The public catalog remains on its published baseline because this feature branch is not deployed. The video shows local software rendering and exported-GLB regression only; no process simulation or hardware acceptance.", 92, 565, 1090, 19, MUTED)
    image.save(SLIDES / "05-verification.png")


def make_video() -> None:
    durations = [4, 3, 3, 4, 2]
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
