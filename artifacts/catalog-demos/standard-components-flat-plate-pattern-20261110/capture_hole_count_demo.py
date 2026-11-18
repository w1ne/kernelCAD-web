#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
"""Compose a short local source-to-preview demo for the hole-count choice."""

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
FOOTER = "Local kernelCAD source · software-rendered · not deployed · no physical acceptance"
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
    draw.text((54, 20), "kernelCAD · standard-components", font=font(21, True), fill=(176, 202, 219))
    draw.text((55, 111), title, font=font(31, True), fill=INK)
    draw.text((56, 154), subtitle, font=font(17), fill=MUTED)
    draw.rectangle((0, H - 48, W, H), fill=INK)
    draw.text((55, H - 34), FOOTER, font=font(14), fill=(224, 233, 241))
    return frame, draw


def before_after() -> None:
    frame, draw = base_frame(
        "Flat joining plate: the existing asset gets a real layout choice",
        "The same catalog ID keeps its size and material controls while its in-line fastener pattern becomes selectable.",
    )
    draw.text((300, 190), "Previous default", font=font(19, True), fill=ACCENT)
    draw.text((830, 190), "Updated four-hole default", font=font(19, True), fill=ACCENT)
    frame.paste(contain(OUT / "before" / "flat-joining-plate.png", (480, 420)), (90, 230))
    frame.paste(contain(ROOT / "catalog/kits/standard-components/previews/flat-joining-plate.png", (480, 420)), (710, 230))
    frame.save(OUT / "frames" / "01-before-after.png")


def layout_choices() -> None:
    frame, draw = base_frame(
        "Choose the hole count; geometry follows",
        "Each row keeps a 20 mm pitch and a 12 mm end margin; the through-bores and matching fasteners move together.",
    )
    items = [
        ("hole-three", "3 holes · 64 mm"),
        ("hole-four", "4 holes · 84 mm"),
        ("hole-five", "5 holes · 104 mm"),
    ]
    for index, (variant, label) in enumerate(items):
        x = 28 + index * 410
        frame.paste(contain(OUT / "variants" / f"{variant}.png", (380, 390)), (x, 210))
        draw.text((x + 14, 616), label, font=font(19, True), fill=ACCENT)
    frame.save(OUT / "frames" / "02-layout-choices.png")


def material_preset() -> None:
    frame, draw = base_frame(
        "Material colors remain independent of the layout",
        "Painted-steel and zinc-fastener controls stay separate; the existing brass palette changes the fastener finish.",
    )
    draw.text((300, 196), "Default palette", font=font(19, True), fill=ACCENT)
    draw.text((830, 196), "Existing brass preset", font=font(19, True), fill=ACCENT)
    frame.paste(contain(OUT / "variants" / "hole-five.png", (480, 390)), (82, 230))
    frame.paste(contain(OUT / "variants" / "hole-five-brass.png", (480, 390)), (710, 230))
    draw.text((124, 628), "Blue painted steel · silver zinc-plated fasteners", font=font(16, True), fill=MUTED)
    draw.text((810, 628), "Blue-gray steel · brass-colored fasteners", font=font(16, True), fill=MUTED)
    frame.save(OUT / "frames" / "03-material-preset.png")


def verification() -> None:
    frame, draw = base_frame(
        "Source variants, preview and local checks",
        "No IDs or kits added; quality pass rate stays 2,402 / 2,402 (100.00%).",
    )
    lines = (OUT / "verification-summary.txt").read_text(encoding="utf-8").splitlines()
    y = 228
    for line in lines:
        draw.rounded_rectangle((94, y, 1187, y + 56), radius=10, fill=WHITE)
        draw.text((122, y + 16), line, font=font(18, True), fill=ACCENT)
        y += 74
    draw.text((96, 612), "Local software evidence only; this branch has not been deployed.", font=font(16), fill=MUTED)
    frame.save(OUT / "frames" / "04-local-verification.png")


def main() -> None:
    required = [
        OUT / "before" / "flat-joining-plate.png",
        ROOT / "catalog/kits/standard-components/previews/flat-joining-plate.png",
        *[OUT / "variants" / f"{name}.png" for name in ["hole-three", "hole-four", "hole-five", "hole-five-brass"]],
        OUT / "verification-summary.txt",
    ]
    missing = [str(path) for path in required if not path.is_file()]
    if missing:
        raise SystemExit(f"missing source evidence: {', '.join(missing)}")
    (OUT / "frames").mkdir(exist_ok=True)
    (OUT / "video-review").mkdir(exist_ok=True)
    before_after()
    layout_choices()
    material_preset()
    verification()

    video = OUT / "standard-components-flat-plate-pattern.mp4"
    concat = OUT / "frames" / "concat.txt"
    names = ["01-before-after.png", "02-layout-choices.png", "03-material-preset.png", "04-local-verification.png"]
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
