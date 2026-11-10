#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
"""Compose a short source-to-preview workflow demo from checked-in renders."""

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
        background = Image.new("RGB", model_area.size, model_area.getpixel((0, 0)))
        difference = ImageChops.difference(model_area, background).convert("L")
        bounds = difference.point(lambda value: 255 if value > 14 else 0).getbbox()
        if bounds is not None:
            left, top, right, bottom = bounds
            margin = 12
            image = model_area.crop((max(0, left - margin), max(0, top - margin), min(source_w, right + margin), min(source_h - 64, bottom + margin)))
    image.thumbnail(size, Image.Resampling.LANCZOS)
    panel = Image.new("RGB", size, WHITE)
    panel.paste(image, ((size[0] - image.width) // 2, (size[1] - image.height) // 2))
    return panel


def base_frame(title: str, subtitle: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    frame = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(frame)
    draw.rectangle((0, 0, W, 92), fill=INK)
    draw.text((54, 20), "kernelCAD · standard-components", font=font(21, True), fill=(176, 202, 219))
    draw.text((55, 111), title, font=font(29, True), fill=INK)
    draw.text((56, 154), subtitle, font=font(16), fill=MUTED)
    draw.rectangle((0, H - 48, W, H), fill=INK)
    draw.text((55, H - 34), FOOTER, font=font(14), fill=(224, 233, 241))
    return frame, draw


def before_after() -> None:
    frame, draw = base_frame(
        "Three existing assets refined in place",
        "The default previews now show their recognizable interfaces and separate materials.",
    )
    rows = [
        ("bulkhead-adapter", "Bulkhead adapter"),
        ("linear-guide-rail", "Linear guide"),
        ("shaft-coupling", "Shaft coupling"),
    ]
    draw.text((434, 188), "Before", font=font(18, True), fill=ACCENT)
    draw.text((869, 188), "Updated default", font=font(18, True), fill=ACCENT)
    for index, (asset, label) in enumerate(rows):
        y = 220 + index * 132
        draw.text((58, y + 47), label, font=font(16, True), fill=MUTED)
        frame.paste(contain(OUT / "before" / f"{asset}.png", (260, 112)), (350, y))
        frame.paste(contain(ROOT / "catalog/kits/standard-components/previews" / f"{asset}.png", (360, 112)), (800, y))
    frame.save(OUT / "frames" / "01-before-after.png")


def variant_slide(title: str, subtitle: str, variants: list[tuple[str, str]], filename: str) -> None:
    frame, draw = base_frame(title, subtitle)
    for index, (variant, label) in enumerate(variants):
        x = 40 + index * 410
        frame.paste(contain(OUT / "variants" / f"{variant}.png", (380, 390)), (x, 198))
        draw.text((x + 8, 600), label, font=font(16, True), fill=ACCENT)
    frame.save(OUT / "frames" / filename)


def verification_slide() -> None:
    frame, draw = base_frame(
        "Source variants, 50 refreshed previews and local checks",
        "Three existing IDs · three material controls each · selectable object geometry",
    )
    lines = (OUT / "verification-summary.txt").read_text(encoding="utf-8").splitlines()
    y = 210
    for line in lines:
        draw.rounded_rectangle((94, y, 1187, y + 50), radius=10, fill=WHITE)
        draw.text((122, y + 13), line, font=font(17, True), fill=ACCENT)
        y += 64
    draw.text((96, 612), "Local source validation only; deployment and physical acceptance are not shown.", font=font(16), fill=MUTED)
    frame.save(OUT / "frames" / "05-local-verification.png")


def main() -> None:
    required = [
        OUT / "before" / f"{asset}.{suffix}"
        for asset in ["bulkhead-adapter", "linear-guide-rail", "shaft-coupling"]
        for suffix in ["png", "kcad.ts"]
    ]
    required += [OUT / "variants" / f"{name}.png" for name in [
        "adapter-default", "adapter-brass", "adapter-large",
        "guide-center", "guide-right", "guide-high-visibility",
        "coupling-set-screws", "coupling-split-clamp", "coupling-weathered",
    ]]
    required += [OUT / "verification-summary.txt"]
    missing = [str(path) for path in required if not path.is_file()]
    if missing:
        raise SystemExit(f"missing source evidence: {', '.join(missing)}")

    (OUT / "frames").mkdir(exist_ok=True)
    (OUT / "video-review").mkdir(exist_ok=True)
    before_after()
    variant_slide(
        "Bulkhead adapter: through bore, washer and locknut",
        "The brass barrel, stainless flanges and dark rubber seal remain separate material zones.",
        [("adapter-default", "Standard · stainless / brass / rubber"),
         ("adapter-brass", "Brass palette"),
         ("adapter-large", "Large size choice")],
        "02-bulkhead-adapter.png",
    )
    variant_slide(
        "Linear guide: move the carriage along its rail",
        "Four top mounting wells and orange end wipers make the carriage visible in the preview.",
        [("guide-center", "Carriage centered"),
         ("guide-right", "Carriage moved right"),
         ("guide-high-visibility", "High visibility palette")],
        "03-linear-guide.png",
    )
    variant_slide(
        "Shaft coupling: choose the retention layout",
        "Compare radial set screws with split hubs and crossing clamp bolts; the weathered palette is also selectable.",
        [("coupling-set-screws", "Set-screw retention"),
         ("coupling-split-clamp", "Split-clamp retention"),
         ("coupling-weathered", "Weathered palette")],
        "04-shaft-coupling.png",
    )
    verification_slide()

    video = OUT / "standard-components-guide-retention-details.mp4"
    concat = OUT / "frames" / "concat.txt"
    names = [
        "01-before-after.png", "02-bulkhead-adapter.png", "03-linear-guide.png",
        "04-shaft-coupling.png", "05-local-verification.png",
    ]
    concat.write_text("".join(f"file '{OUT / 'frames' / name}'\nduration 3\n" for name in names)
                      + f"file '{OUT / 'frames' / names[-1]}'\n", encoding="utf-8")
    command = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0",
        "-i", str(concat), "-vf", "fps=24,scale=1280:720,format=yuv420p", "-c:v", "libx264",
        "-preset", "medium", "-crf", "20", "-movflags", "+faststart", str(video),
    ]
    subprocess.run(command, check=True)
    thumbs = [contain(OUT / "frames" / name, (400, 225)) for name in names]
    sheet = Image.new("RGB", (1236, 500), BG)
    for index, thumb in enumerate(thumbs):
        sheet.paste(thumb, (12 + (index % 3) * 412, 12 + (index // 3) * 237))
    sheet.save(OUT / "video-review" / "contact-sheet.png")
    print(f"wrote {video} ({video.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
