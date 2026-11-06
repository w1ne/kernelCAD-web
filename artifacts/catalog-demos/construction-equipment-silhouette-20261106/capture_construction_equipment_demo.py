#!/usr/bin/env python3
"""Build a short, source-driven local catalog workflow demonstration."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
FRAMES = BUNDLE / "frames"
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


def new_frame(title: str, subtitle: str, step: int, total: int = 7) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", SIZE, BG)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 1280, 104), fill="#0b1220")
    draw.text((54, 24), title, font=font(31, True), fill=TEXT)
    draw.text((56, 68), subtitle, font=font(16), fill=MUTED)
    draw.text((1170, 36), f"{step}/{total}", font=font(19, True), fill=ACCENT)
    return image, draw


def fit_image(path: Path, width: int, height: int) -> Image.Image:
    with Image.open(path) as original:
        original = original.convert("RGB")
        ratio = min(width / original.width, height / original.height)
        fitted = original.resize((round(original.width * ratio), round(original.height * ratio)), Image.Resampling.LANCZOS)
    result = Image.new("RGB", (width, height), "#edf2f7")
    result.paste(fitted, ((width - fitted.width) // 2, (height - fitted.height) // 2))
    return result


def card(
    canvas: Image.Image,
    draw: ImageDraw.ImageDraw,
    path: Path,
    box: tuple[int, int, int, int],
    label: str,
) -> None:
    x0, y0, x1, y1 = box
    draw.rounded_rectangle(box, radius=18, fill=CARD, outline="#334155", width=2)
    image = fit_image(path, x1 - x0 - 24, y1 - y0 - 66)
    canvas.paste(image, (x0 + 12, y0 + 12))
    draw.text((x0 + 20, y1 - 43), label, font=font(17, True), fill=TEXT)


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
        y += f.size + 8
    return y


def asset_paths(asset_id: str) -> tuple[Path, Path]:
    return (
        BUNDLE / "before" / f"{asset_id}.png",
        ROOT / "catalog/kits/construction-equipment/previews" / f"{asset_id}.png",
    )


def main() -> None:
    FRAMES.mkdir(parents=True, exist_ok=True)
    verification = json.loads((BUNDLE / "verification.json").read_text(encoding="utf-8"))
    settings = json.loads((BUNDLE / "demo-settings.json").read_text(encoding="utf-8"))
    assets = [
        ("towable-light-tower", "Towable light tower"),
        ("ride-on-power-trowel", "Ride-on power trowel"),
        ("concrete-batch-plant", "Concrete batch plant"),
    ]

    image, draw = new_frame(
        "Construction equipment · silhouette refinement",
        "Three existing CC0 assets · source changes rendered into the local catalog",
        1,
    )
    x_positions = [42, 454, 866]
    for x, (asset_id, title) in zip(x_positions, assets):
        draw.rounded_rectangle((x, 132, x + 372, 654), radius=18, fill=CARD, outline="#334155", width=2)
        before, after = asset_paths(asset_id)
        image.paste(fit_image(before, 346, 208), (x + 13, 145))
        image.paste(fit_image(after, 346, 208), (x + 13, 398))
        draw.text((x + 21, 365), "Before", font=font(15, True), fill=MUTED)
        draw.text((x + 21, 619), title + " · updated", font=font(16, True), fill=TEXT)
    draw.text((55, 674), "Same asset IDs · more visible parts · four independent material controls per refined asset.", font=font(16), fill=MUTED)
    image.save(FRAMES / "frame-01.png")

    details = [
        ("towable-light-tower", "Towable light tower", "Trailer wheels, generator enclosure, two-stage mast, lamp lenses and four screw jacks.", "Mast: 1200 / 1800 / 2400 · lamp bank: 2 / 4 / 6"),
        ("ride-on-power-trowel", "Ride-on power trowel", "Twin open rotor guards, radial blade shoes, engine housing, bucket seat and paired steering controls.", "Rotors: compact / standard / wide · blades: 4 / 6"),
        ("concrete-batch-plant", "Concrete batch plant", "Raised tapered aggregate hoppers, shared feed belt, visible mixer drum and silo service frame.", "Bins: 2 / 3 / 4 · silo body: 1200 / 1500 / 1900"),
    ]
    for step, (asset_id, title, description, choices) in enumerate(details, start=2):
        image, draw = new_frame(title + " · source to preview", "The default catalog angle now shows the parts that identify the machine", step)
        before, after = asset_paths(asset_id)
        card(image, draw, before, (44, 136, 614, 624), "Before · existing checked-in preview")
        card(image, draw, after, (666, 136, 1236, 624), "After · refreshed source-built preview")
        wrap(draw, description, (56, 642), 1160, font(15), MUTED)
        draw.text((56, 678), choices, font=font(16, True), fill=ACCENT)
        image.save(FRAMES / f"frame-{step:02d}.png")

    image, draw = new_frame(
        "Material controls and named palettes",
        "High-visibility is rendered from each source preset; each color names a visible material zone",
        5,
    )
    for x, (asset_id, title) in zip(x_positions, assets):
        variant = BUNDLE / "variants" / f"{asset_id}-highVisibility.png"
        card(image, draw, variant, (x, 132, x + 372, 490), title + " · highVisibility")
    controls = [
        ("Tower", "equipmentPaintColor · structuralSteelColor · tireRubberColor · lampLensColor"),
        ("Trowel", "equipmentPaintColor · structuralSteelColor · rubberColor · seatVinylColor"),
        ("Batch plant", "equipmentPaintColor · structuralSteelColor · aggregateColor · cementSiloColor"),
    ]
    y = 523
    for label, text in controls:
        draw.text((58, y), label, font=font(16, True), fill=ORANGE)
        draw.text((196, y), text, font=font(15), fill=TEXT)
        y += 40
    draw.text((58, 654), "Existing palettes: weathered · highVisibility", font=font(17, True), fill=ACCENT)
    image.save(FRAMES / "frame-05.png")

    image, draw = new_frame(
        "Shape choices rebuild the object",
        "Source-driven geometry variants · choices change geometry, not just color",
        6,
    )
    variant_ids = [
        ("towable-light-tower-six-lamps-tall-mast", "mastHeight=2400 · lampCount=6"),
        ("ride-on-power-trowel-wide-four-blades-per-rotor", "rotorSize=wide · bladeCount=4"),
        ("concrete-batch-plant-four-bins-tall-silo", "aggregateBinCount=4 · siloHeight=1900"),
    ]
    for x, (variant_id, choices) in zip(x_positions, variant_ids):
        card(image, draw, BUNDLE / "variants" / f"{variant_id}.png", (x, 132, x + 372, 570), variant_id.split("-")[0] + " · geometry choice")
        wrap(draw, choices, (x + 18, 590), 335, font(15, True), ACCENT)
    draw.text((58, 676), "The same source supports the default and each selectable form.", font=font(16), fill=MUTED)
    image.save(FRAMES / "frame-06.png")

    image, draw = new_frame(
        "Local catalog verification",
        "Source builds, software previews, generated index and catalog checks",
        7,
    )
    draw.rounded_rectangle((44, 136, 1236, 622), radius=18, fill=CARD, outline="#334155", width=2)
    integration = verification["catalogIntegration"]
    lines = [
        ("ASSETS", "3 existing sources refined · no IDs added or duplicated", ACCENT),
        ("BUDGETS", "Tower 1328/2200 · trowel 1112/2200 · batch plant 1500/2200 tris", ACCENT),
        ("PREVIEWS + INDEX", "60/60 kit previews re-rendered · source hashes and preview paths verified", ACCENT),
        ("QUALITY GATE", f"{verification['catalogQuality']['passed']}/{verification['catalogQuality']['total']} passing ({verification['catalogQuality']['passRate']}) · 0 thin assets", ACCENT),
        ("KIT GATE", f"{verification['kitQuality']['passed']}/{verification['kitQuality']['total']} passing · ESLint passed", ACCENT),
        ("INTEGRATION", f"{integration['files']} files · {integration['tests']} tests passed", ACCENT),
        ("LOCAL PAGES", "3/3 generated pages and copied previews checked · branch not deployed", ACCENT),
    ]
    y = 165
    for label, value, color in lines:
        draw.text((82, y), label, font=font(15, True), fill=ORANGE)
        draw.text((254, y), value, font=font(18, True), fill=color)
        y += 52
    wrap(
        draw,
        "Local source renders and catalog checks only. The existing Chrome CDP attach timed out; no new browser was started. No equipment operation, performance, safety, manufacturing, deployment or physical acceptance is claimed.",
        (82, 560),
        1084,
        font(15),
        MUTED,
    )
    image.save(FRAMES / "frame-07.png")

    subprocess.run([
        "ffmpeg", "-y", "-framerate", "1/3", "-i", str(FRAMES / "frame-%02d.png"),
        "-c:v", "libx264", "-profile:v", "high", "-level", "4.0", "-pix_fmt", "yuv420p",
        "-preset", "medium", "-crf", "20", "-r", str(settings["video"]["fps"]),
        "-movflags", "+faststart",
        str(BUNDLE / "construction-equipment-silhouette-refinement.mp4"),
    ], check=True, capture_output=True, text=True)
    (BUNDLE / "poster.png").write_bytes((FRAMES / "frame-01.png").read_bytes())
    print(f"wrote {BUNDLE / 'construction-equipment-silhouette-refinement.mp4'}")


if __name__ == "__main__":
    main()
