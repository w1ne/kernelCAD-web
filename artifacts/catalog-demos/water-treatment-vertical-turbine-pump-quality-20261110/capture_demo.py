#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
"""Compose a short source-to-preview demo for the pump head refinement."""

from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
W, H = 1280, 720
BG = (239, 243, 248)
INK = (25, 39, 58)
MUTED = (81, 98, 118)
ACCENT = (39, 101, 126)
WHITE = (255, 255, 255)
FOOTER = "Local software render and checks · not simulated or deployed · no hardware acceptance"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT, size)


def contain(path: Path, size: tuple[int, int]) -> Image.Image:
    image = Image.open(path).convert("RGB")
    source_w, source_h = image.size
    if 0.85 <= source_w / source_h <= 1.15:
        model_area = image.crop((0, 0, source_w, max(1, source_h - 64)))
        background = model_area.getpixel((0, 0))
        difference = ImageChops.difference(model_area, Image.new("RGB", model_area.size, background)).convert("L")
        bounds = difference.point(lambda value: 255 if value > 14 else 0).getbbox()
        if bounds is not None:
            left, top, right, bottom = bounds
            margin = 12
            image = model_area.crop((max(0, left - margin), max(0, top - margin), min(source_w, right + margin), min(source_h - 64, bottom + margin)))
            pixels = image.load()
            for y in range(image.height):
                for x in range(image.width):
                    color = pixels[x, y]
                    if max(abs(color[channel] - background[channel]) for channel in range(3)) <= 14:
                        pixels[x, y] = WHITE
    image.thumbnail(size, Image.Resampling.LANCZOS)
    panel = Image.new("RGB", size, WHITE)
    panel.paste(image, ((size[0] - image.width) // 2, (size[1] - image.height) // 2))
    return panel


def base_frame(title: str, subtitle: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    frame = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(frame)
    draw.rectangle((0, 0, W, 92), fill=INK)
    draw.text((54, 20), "kernelCAD · water-treatment", font=font(21, True), fill=(176, 202, 219))
    draw.text((55, 111), title, font=font(31, True), fill=INK)
    draw.text((56, 154), subtitle, font=font(17), fill=MUTED)
    draw.rectangle((0, H - 48, W, H), fill=INK)
    draw.text((55, H - 34), FOOTER, font=font(14), fill=(224, 233, 241))
    return frame, draw


def before_after() -> None:
    frame, draw = base_frame(
        "Vertical turbine pump head",
        "Existing catalog asset · clearer discharge, motor, and terminal details.",
    )
    draw.text((300, 190), "Previous default", font=font(19, True), fill=ACCENT)
    draw.text((830, 190), "Updated front-discharge default", font=font(19, True), fill=ACCENT)
    frame.paste(contain(OUT / "before" / "vertical-turbine-pump.png", (480, 420)), (90, 230))
    frame.paste(contain(ROOT / "catalog/kits/water-treatment/previews/vertical-turbine-pump.png", (480, 420)), (710, 230))
    frame.save(OUT / "frames" / "01-before-after.png")


def outlet_choices() -> None:
    frame, draw = base_frame(
        "Select the discharge direction",
        "The outlet moves; the pump column and motor stay fixed.",
    )
    items = [
        ("front-default", "Front discharge"),
        ("right-discharge", "Right discharge"),
    ]
    for index, (variant, label) in enumerate(items):
        x = 130 + index * 520
        frame.paste(contain(OUT / "variants" / f"{variant}.png", (480, 400)), (x, 210))
        draw.text((x + 34, 620), label, font=font(20, True), fill=ACCENT)
    frame.save(OUT / "frames" / "02-outlet-choices.png")


def material_presets() -> None:
    frame, draw = base_frame(
        "Material presets",
        "Four named color controls; presets restyle the same geometry.",
    )
    draw.text((300, 196), "Weathered preset", font=font(19, True), fill=ACCENT)
    draw.text((830, 196), "High-visibility preset", font=font(19, True), fill=ACCENT)
    frame.paste(contain(OUT / "variants" / "weathered-front.png", (480, 390)), (82, 230))
    frame.paste(contain(OUT / "variants" / "high-visibility-front.png", (480, 390)), (710, 230))
    draw.text((115, 628), "Muted steel and motor tones", font=font(16, True), fill=MUTED)
    draw.text((800, 628), "Orange pump coating with contrasting steel", font=font(16, True), fill=MUTED)
    frame.save(OUT / "frames" / "03-material-presets.png")


def verification() -> None:
    frame, draw = base_frame(
        "Local source and checks",
        "One existing asset refined in place; no catalog IDs or kits added.",
    )
    lines = [
        "2,276 / 2,800 triangles · four source variants pass",
        "Front/right moves the outlet and swaps footprint axes",
        "Weathered and highVisibility presets render different colors",
        "Water-treatment quality: 50 / 50 assets pass",
        "Global catalog quality: 2,402 / 2,402 pass (100%)",
        "Kit ESLint clean · catalog integration: 15 / 15 pass",
        "50 kit previews rebuilt · source hash matches index",
        "Local page verified · no simulation, deployment, or hardware claim",
    ]
    y = 207
    for line in lines:
        draw.rounded_rectangle((94, y, 1187, y + 44), radius=10, fill=WHITE)
        draw.text((122, y + 12), line, font=font(15, True), fill=ACCENT)
        y += 53
    frame.save(OUT / "frames" / "04-local-verification.png")


def kit_preview_review() -> None:
    entries = [
        ("vertical-turbine-pump", "Vertical turbine pump", "Column, ribbed motor, side flange, four material colors"),
        ("horizontal-split-case-pump", "Horizontal split-case pump", "Scroll casing, motor, suction cover, rail base"),
        ("surface-aerator", "Surface aerator", "Circular float frame, central motor, radial supports"),
    ]
    sheet = Image.new("RGB", (1320, 560), BG)
    draw = ImageDraw.Draw(sheet)
    draw.text((28, 20), "Water-treatment kit preview review", font=font(24, True), fill=INK)
    for index, (asset, title, note) in enumerate(entries):
        x = 20 + index * 435
        sheet.paste(contain(ROOT / "catalog/kits/water-treatment/previews" / f"{asset}.png", (405, 420)), (x, 70))
        draw.text((x + 8, 500), title, font=font(17, True), fill=ACCENT)
        draw.text((x + 8, 526), note, font=font(12), fill=MUTED)
    (OUT / "preview-review").mkdir(exist_ok=True)
    sheet.save(OUT / "preview-review" / "three-previews.png")


def main() -> None:
    required = [
        OUT / "before" / "vertical-turbine-pump.png",
        ROOT / "catalog/kits/water-treatment/previews/vertical-turbine-pump.png",
        *[OUT / "variants" / f"{name}.png" for name in ["front-default", "right-discharge", "weathered-front", "high-visibility-front"]],
        OUT / "verification-summary.txt",
    ]
    missing = [str(path) for path in required if not path.is_file()]
    if missing:
        raise SystemExit(f"missing source evidence: {', '.join(missing)}")
    (OUT / "frames").mkdir(exist_ok=True)
    (OUT / "video-review").mkdir(exist_ok=True)
    kit_preview_review()
    before_after()
    outlet_choices()
    material_presets()
    verification()

    video = OUT / "water-treatment-vertical-turbine-pump-quality.mp4"
    concat = OUT / "frames" / "concat.txt"
    names = ["01-before-after.png", "02-outlet-choices.png", "03-material-presets.png", "04-local-verification.png"]
    concat.write_text("".join(f"file '{OUT / 'frames' / name}'\nduration 3\n" for name in names) + f"file '{OUT / 'frames' / names[-1]}'\n", encoding="utf-8")
    subprocess.run([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0",
        "-i", str(concat), "-vf", "fps=24,scale=1280:720,format=yuv420p", "-c:v", "libx264",
        "-preset", "medium", "-crf", "20", "-movflags", "+faststart", str(video),
    ], check=True)
    thumbs = [contain(OUT / "frames" / name, (400, 225)) for name in names]
    sheet = Image.new("RGB", (824, 488), BG)
    for index, thumb in enumerate(thumbs):
        x = 8 + (index % 2) * 408
        y = 8 + (index // 2) * 236
        sheet.paste(thumb, (x, y))
    sheet.save(OUT / "video-review" / "contact-sheet.png")
    print(f"wrote {video} ({video.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
