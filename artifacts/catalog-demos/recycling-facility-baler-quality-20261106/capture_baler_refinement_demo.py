#!/usr/bin/env python3
"""Build a short, source-driven preview and validation walkthrough."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
FRAMES = OUT / "frames"
VIDEO = OUT / "horizontal-baler-refinement.mp4"
SIZE = (1280, 720)
BG = "#101827"
CARD = "#1b2738"
TEXT = "#edf2f7"
MUTED = "#a7b4c6"
ACCENT = "#6bd3aa"
ORANGE = "#f0ae32"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def header(image: Image.Image, title: str, subtitle: str, step: int) -> ImageDraw.ImageDraw:
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 1280, 104), fill="#0b1220")
    draw.text((54, 24), title, font=font(31, True), fill=TEXT)
    draw.text((56, 68), subtitle, font=font(16), fill=MUTED)
    draw.text((1192, 36), f"{step}/4", font=font(19, True), fill=ACCENT)
    return draw


def image_card(canvas: Image.Image, draw: ImageDraw.ImageDraw, path: Path, box: tuple[int, int, int, int], label: str) -> None:
    x0, y0, x1, y1 = box
    draw.rounded_rectangle(box, radius=18, fill=CARD, outline="#334155", width=2)
    with Image.open(path) as original:
        original = original.convert("RGB")
        width, height = x1 - x0 - 24, y1 - y0 - 70
        ratio = min(width / original.width, height / original.height)
        fitted = original.resize((round(original.width * ratio), round(original.height * ratio)), Image.Resampling.LANCZOS)
    image = Image.new("RGB", (width, height), "#eef3f8")
    image.paste(fitted, ((width - fitted.width) // 2, (height - fitted.height) // 2))
    canvas.paste(image, (x0 + 12, y0 + 12))
    draw.text((x0 + 20, y1 - 43), label, font=font(17, True), fill=TEXT)


def new_frame(title: str, subtitle: str, step: int) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", SIZE, BG)
    return image, header(image, title, subtitle, step)


def wrap(draw: ImageDraw.ImageDraw, text: str, xy: tuple[int, int], max_width: int, f: ImageFont.ImageFont, fill: str) -> int:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=f)[2] > max_width and current:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    x, y = xy
    for line in lines:
        draw.text((x, y), line, font=f, fill=fill)
        y += f.size + 9
    return y


def main() -> None:
    FRAMES.mkdir(parents=True, exist_ok=True)
    preview = ROOT / "catalog/kits/recycling-facility/previews/horizontal-baler.png"
    before = OUT / "before-horizontal-baler.png"
    weathered = OUT / "preset-variants/weathered.png"
    high_visibility = OUT / "preset-variants/highVisibility.png"
    checks = json.loads((OUT / "verification.json").read_text(encoding="utf-8"))

    image, draw = new_frame("Horizontal baler · source refinement", "Existing recycling-facility asset · same ID · local preview workflow", 1)
    image_card(image, draw, before, (44, 138, 626, 650), "Before · closed chamber face")
    image_card(image, draw, preview, (654, 138, 1236, 650), "After · open mouth and banded bale")
    draw.text((55, 674), "No kits or catalog assets added.", font=font(16), fill=MUTED)
    image.save(FRAMES / "frame-01.png")

    image, draw = new_frame("Materials and useful geometry", "Controls color actual assembly materials; size and palettes remain editable", 2)
    image_card(image, draw, preview, (44, 138, 574, 650), "Default · painted steel / stainless / rubber / cardboard")
    draw.rounded_rectangle((604, 138, 1236, 650), radius=18, fill=CARD, outline="#334155", width=2)
    draw.text((648, 174), "Material controls", font=font(22, True), fill=TEXT)
    controls = [
        ("paintedSteel", "#53798b"),
        ("stainlessSteel", "#b7c0c1"),
        ("rubber", "#303638"),
        ("recoveredMaterial", "#b58b50"),
    ]
    y = 222
    for name, color in controls:
        draw.rounded_rectangle((648, y + 2, 686, y + 34), radius=6, fill=color)
        draw.text((706, y), name, font=font(18), fill=TEXT)
        y += 48
    draw.text((648, 430), "Presets: weathered · highVisibility", font=font(18, True), fill=ACCENT)
    wrap(draw, "Open press chamber, visible ram, hydraulic drive, rubber belt, rollers and a strapped cardboard bale.", (648, 474), 525, font(17), MUTED)
    image.save(FRAMES / "frame-02.png")

    image, draw = new_frame("Named appearance presets", "Both looks are rendered from the authored preset values", 3)
    image_card(image, draw, weathered, (44, 138, 626, 650), "weathered")
    image_card(image, draw, high_visibility, (654, 138, 1236, 650), "highVisibility")
    draw.text((55, 674), "Same geometry · distinct editable material palette.", font=font(16), fill=MUTED)
    image.save(FRAMES / "frame-03.png")

    image, draw = new_frame("Local catalog verification", "Recorded from this checkout · no deployed or equipment acceptance claim", 4)
    draw.rounded_rectangle((44, 138, 1236, 650), radius=18, fill=CARD, outline="#334155", width=2)
    lines = [
        ("PREVIEW", f"{checks['triangleCount']} triangles / {checks['triangleBudget']} budget · rendered PNG refreshed", ACCENT),
        ("PARAMETERS", f"{len(checks['materialControls'])} material controls · {len(checks['namedPresets'])} named presets", ACCENT),
        ("QUALITY GATE", checks["qualityKit"], ACCENT),
        ("CATALOG", checks["qualityGlobal"], ACCENT),
        ("LINT", checks["eslint"], ACCENT),
        ("INTEGRATION", f"{checks['integration']['files']} files · {checks['integration']['tests']} tests passed", ACCENT),
        ("INDEX", "Regenerated from source with current preview path and sourceSha256", ACCENT),
    ]
    y = 176
    for label, value, color in lines:
        draw.text((82, y), label, font=font(16, True), fill=ORANGE)
        draw.text((238, y), value, font=font(18, True), fill=color)
        y += 55
    wrap(draw, "Local render and catalog checks only. The branch is not deployed; this model is a visualization prop, not equipment documentation.", (82, 568), 1080, font(16), MUTED)
    image.save(FRAMES / "frame-04.png")

    subprocess.run([
        "ffmpeg", "-y", "-framerate", "1/3", "-i", str(FRAMES / "frame-%02d.png"),
        "-c:v", "libx264", "-profile:v", "high", "-level", "4.0", "-pix_fmt", "yuv420p",
        "-r", "30", "-movflags", "+faststart", str(VIDEO),
    ], check=True, capture_output=True, text=True)
    print(f"wrote {VIDEO} ({VIDEO.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
