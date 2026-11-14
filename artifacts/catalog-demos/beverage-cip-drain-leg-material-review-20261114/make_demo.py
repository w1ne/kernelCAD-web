#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

from pathlib import Path
import subprocess

from PIL import Image, ImageDraw, ImageFont, ImageOps

HERE = Path(__file__).resolve().parent
SLIDES = HERE / "slides"
VIDEO = HERE / "beverage-cip-drain-leg-material-review.mp4"
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
        ("CIP valve manifold", "previews/before/cip-valve-manifold.png"),
        ("Carbonation vessel", "samples/carbonation-vessel.png"),
        ("Sleeve shrink tunnel", "samples/sleeve-shrink-tunnel.png"),
        ("Case taper", "samples/case-taper.png"),
        ("Preform elevator", "samples/preform-elevator.png"),
    ]
    image, draw = canvas("Beverage bottling line: five preview audit", "Local default software renders · semantic and material review")
    positions = [(48, 138), (454, 138), (860, 138), (251, 407), (657, 407)]
    for (label, relative), (x, y) in zip(sample_specs, positions, strict=True):
        draw.rounded_rectangle((x, y, x + 372, y + 248), radius=12, fill=PANEL, outline="#c6d2dc", width=2)
        draw.text((x + 15, y + 10), label, fill=INK, font=font(21, bold=True))
        source = Image.open(HERE / relative).convert("RGB")
        fitted = ImageOps.contain(source, (334, 198))
        image.paste(fitted, (x + (372 - fitted.width) // 2, y + 42 + (198 - fitted.height) // 2))
    save(image, "01-five-preview-audit.png")

    before = HERE / "previews" / "before" / "cip-valve-manifold.png"
    image, draw = canvas("Before · CIP valve manifold", "448 triangles · drain-leg painted with the powder-coat control")
    place_image(image, before, (62, 146, 540, 540))
    draw.text((668, 195), "Observed mismatch", fill=ACCENT, font=font(27, bold=True))
    y = wrapped(draw, "The drain pipe under the stainless headers renders teal, in the powder-coat finish of the floor feet.", 668, 245, 520, 25)
    y = wrapped(draw, "A CIP drain leg is a wetted process pipe. In sanitary service it is stainless steel, not painted carbon steel.", 668, y + 15, 520, 25)
    wrapped(draw, "Cause: the shared name regex matches 'leg' in 'drain-leg' and treats the pipe as a stand leg.", 668, y + 15, 520, 25, MUTED)
    save(image, "02-before.png")

    image, draw = canvas("Material mapping in the source", "One part re-assigned · mount feet keep the powder coat")
    draw.rounded_rectangle((72, 152, 1208, 552), radius=16, fill="#182633")
    mono = font(26, mono=True)
    lines = [
        ("Before", "drain-leg → /leg/ → powderCoat", "#f6c34b"),
        ("After", "drain-leg → stainlessSteel", "#9ed3a8"),
        ("Retained", "mount-foot-0..3 → powderCoat", "#f6c34b"),
    ]
    y = 202
    for label, snippet, color in lines:
        draw.text((112, y), label, fill="#9fc7dc", font=font(22, bold=True))
        draw.text((292, y - 2), snippet, fill=color, font=mono)
        y += 102
    draw.text((78, 604), "Part name, geometry, both colour controls and both presets are unchanged.", fill=INK, font=font(22))
    save(image, "03-source-material.png")

    after = HERE / "previews" / "after" / "cip-valve-manifold.png"
    image, draw = canvas("After · CIP valve manifold", "448 triangles / 2,200 budget · drain leg in stainless steel")
    place_image(image, after, (62, 146, 540, 540))
    draw.text((668, 195), "Result", fill=ACCENT, font=font(27, bold=True))
    y = wrapped(draw, "The drain leg now matches the stainless headers, branches and valve actuators.", 668, 245, 520, 25)
    y = wrapped(draw, "The four floor feet keep the powder coat.", 668, y + 15, 520, 25)
    wrapped(draw, "Not corrected: the headers are vertical, and the branches and feet do not connect. The asset still reads as upright pipes, not a manifold. This is recorded for a geometry round.", 668, y + 15, 520, 25, MUTED)
    save(image, "04-after.png")

    image, draw = canvas("Local verification", "Source, preview, exported GLB regression, and generated catalog index")
    bullets = [
        "Focused exported-GLB regression: failed on the old source, 1/1 passed after the fix.",
        "Beverage bottling line ESLint: clean. Quality gate: 50/50 assets pass. Render: 448 triangles within the 2,200 budget.",
        "Catalog index regenerated from source; the cip-valve-manifold row has a fresh source hash.",
        "PR #1258: all 17 checks passed at the start of the round. This branch is not deployed.",
    ]
    y = 158
    for item in bullets:
        draw.ellipse((80, y + 8, 98, y + 26), fill=ACCENT)
        y = wrapped(draw, item, 118, y, 1080, 23) + 17
    draw.rounded_rectangle((68, 566, 1210, 662), radius=12, fill="#dce7ee")
    wrapped(draw, "Local source and software-render evidence only. No vendor design, sanitary certification, live deployment or hardware acceptance is claimed.", 92, 585, 1090, 20, MUTED)
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
