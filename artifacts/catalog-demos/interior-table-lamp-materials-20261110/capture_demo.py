#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
"""Compose a short demo from source-rendered table-lamp variants and checks."""

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
FOOTER = "Local software renders and checks · not deployed · no physical acceptance"
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
    draw.text((54, 20), "kernelCAD · interior catalog", font=font(21, True), fill=(176, 202, 219))
    draw.text((55, 111), title, font=font(31, True), fill=INK)
    draw.text((56, 154), subtitle, font=font(17), fill=MUTED)
    draw.rectangle((0, H - 48, W, H), fill=INK)
    draw.text((55, H - 34), FOOTER, font=font(14), fill=(224, 233, 241))
    return frame, draw


def before_after() -> None:
    frame, draw = base_frame("Table lamp materials", "One existing catalog asset; separated materials and a visible brass stem.")
    draw.text((300, 194), "Previous", font=font(19, True), fill=ACCENT)
    draw.text((850, 194), "Updated default", font=font(19, True), fill=ACCENT)
    frame.paste(contain(OUT / "before/table-lamp.png", (460, 420)), (92, 230))
    frame.paste(contain(ROOT / "catalog/kits/interior/previews/table-lamp.png", (460, 420)), (720, 230))
    frame.save(OUT / "frames/01-before-after.png")


def base_choice() -> None:
    frame, draw = base_frame("Choose the base style", "The same shade and hardware sit on either the jar or column base.")
    draw.text((320, 194), "Jar", font=font(19, True), fill=ACCENT)
    draw.text((858, 194), "Column", font=font(19, True), fill=ACCENT)
    frame.paste(contain(OUT / "variants/jar-default.png", (460, 420)), (92, 230))
    frame.paste(contain(OUT / "variants/column-default.png", (460, 420)), (720, 230))
    frame.save(OUT / "frames/02-base-choice.png")


def palettes() -> None:
    frame, draw = base_frame("Apply a named material palette", "Ceramic, textile, and hardware colors change together.")
    variants = [
        ("terracotta", "Terracotta"),
        ("mid-century", "Mid-century"),
        ("monochrome", "Monochrome"),
    ]
    for index, (variant, label) in enumerate(variants):
        x = 56 + index * 410
        frame.paste(contain(OUT / f"variants/{variant}.png", (370, 370)), (x, 210))
        draw.text((x + 14, 606), label, font=font(19, True), fill=ACCENT)
    frame.save(OUT / "frames/03-material-palettes.png")


def verification() -> None:
    frame, draw = base_frame("Local source and checks", "72 existing interior assets retained; no catalog IDs added.")
    lines = [
        "144 / 240 triangles · 3 material controls · 3 named presets",
        "Jar and column choices render distinct silhouettes",
        "Terracotta, midCentury, and monochrome palettes render differently",
        "Interior quality: 72 / 72 assets pass · all previews present",
        "Global quality: 2,402 / 2,402 assets pass (100%)",
        "Interior ESLint clean · catalog integration suite passes",
        "Index source hash matches · local catalog page links to Studio",
        "No simulation, deployment, electrical, or hardware-acceptance claim",
    ]
    y = 207
    for line in lines:
        draw.rounded_rectangle((94, y, 1187, y + 44), radius=10, fill=WHITE)
        draw.text((122, y + 12), line, font=font(15, True), fill=ACCENT)
        y += 53
    frame.save(OUT / "frames/04-local-verification.png")


def preview_review() -> None:
    entries = [
        ("table-lamp", "Table lamp", "Ceramic base, brass stem, tapered textile shade"),
        ("desk-lamp", "Desk lamp", "Jointed arm, counterbalanced base, cone shade"),
        ("sofa", "Sofa", "Separate seat, back, cushions, and legs"),
    ]
    sheet = Image.new("RGB", (1320, 560), BG)
    draw = ImageDraw.Draw(sheet)
    draw.text((28, 20), "Interior kit preview review", font=font(24, True), fill=INK)
    for index, (asset, title, note) in enumerate(entries):
        x = 20 + index * 435
        sheet.paste(contain(ROOT / "catalog/kits/interior/previews" / f"{asset}.png", (405, 420)), (x, 70))
        draw.text((x + 8, 500), title, font=font(17, True), fill=ACCENT)
        draw.text((x + 8, 526), note, font=font(12), fill=MUTED)
    (OUT / "preview-review").mkdir(exist_ok=True)
    sheet.save(OUT / "preview-review/three-previews.png")


def main() -> None:
    required = [
        OUT / "before/table-lamp.png",
        ROOT / "catalog/kits/interior/previews/table-lamp.png",
        *[OUT / "variants" / f"{name}.png" for name in ["jar-default", "column-default", "terracotta", "mid-century", "monochrome"]],
        OUT / "verification-summary.txt",
    ]
    missing = [str(path) for path in required if not path.is_file()]
    if missing:
        raise SystemExit(f"missing source evidence: {', '.join(missing)}")
    (OUT / "frames").mkdir(exist_ok=True)
    (OUT / "video-review").mkdir(exist_ok=True)
    preview_review()
    before_after()
    base_choice()
    palettes()
    verification()

    video = OUT / "interior-table-lamp-materials.mp4"
    concat = OUT / "frames/concat.txt"
    names = ["01-before-after.png", "02-base-choice.png", "03-material-palettes.png", "04-local-verification.png"]
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
    sheet.save(OUT / "video-review/contact-sheet.png")
    (OUT / "capture-output.txt").write_text(
        "Invocation: python3 artifacts/catalog-demos/interior-table-lamp-materials-20261110/capture_demo.py\n"
        "Video command: ffmpeg -f concat -safe 0 -i frames/concat.txt -vf fps=24,scale=1280:720,format=yuv420p -c:v libx264 -preset medium -crf 20 -movflags +faststart\n"
        f"Output: {video.relative_to(ROOT)} ({video.stat().st_size} bytes)\n",
        encoding="utf-8",
    )
    print(f"wrote {video} ({video.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
