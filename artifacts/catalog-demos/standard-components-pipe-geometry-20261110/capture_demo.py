#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
"""Compose a short source-to-preview demo from actual catalog variant renders."""

from __future__ import annotations

import hashlib
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
FOOTER = "Local software renders and checks · branch not deployed · no physical acceptance"
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
    draw.text((55, 111), title, font=font(30, True), fill=INK)
    draw.text((56, 154), subtitle, font=font(16), fill=MUTED)
    draw.rectangle((0, H - 48, W, H), fill=INK)
    draw.text((55, H - 34), FOOTER, font=font(14), fill=(224, 233, 241))
    return frame, draw


def before_after() -> None:
    frame, draw = base_frame("Three existing assets, refined in place", "Same catalog IDs; the default views now show the working geometry and material zones.")
    assets = [
        ("pipe-reducer", "Pipe reducer"),
        ("retaining-ring", "Retaining ring"),
        ("tubular-spacer", "Tubular spacer"),
    ]
    for index, (asset, title) in enumerate(assets):
        x = 26 + index * 412
        draw.text((x + 10, 192), title, font=font(18, True), fill=ACCENT)
        draw.text((x + 10, 222), "Previous", font=font(13, True), fill=MUTED)
        draw.text((x + 211, 222), "Updated", font=font(13, True), fill=MUTED)
        before = contain(OUT / "before" / f"{asset}.png", (190, 335))
        after = contain(ROOT / f"catalog/kits/standard-components/previews/{asset}.png", (190, 335))
        frame.paste(before, (x + 4, 248))
        frame.paste(after, (x + 207, 248))
    frame.save(OUT / "frames/01-before-after.png")


def reducer_ratio() -> None:
    frame, draw = base_frame("Choose the reducer outlet ratio", "The small end diameter changes while the inlet interface stays fixed.")
    variants = [
        ("reducer-half", "0.50 ratio"),
        ("reducer-default", "0.60 ratio"),
        ("reducer-three-quarter", "0.75 ratio"),
    ]
    for index, (variant, label) in enumerate(variants):
        x = 50 + index * 412
        frame.paste(contain(OUT / "variants" / f"{variant}.png", (370, 400)), (x, 207))
        draw.text((x + 10, 616), label, font=font(19, True), fill=ACCENT)
    frame.save(OUT / "frames/02-reducer-ratios.png")


def spacer_length() -> None:
    frame, draw = base_frame("Set spacer length and bore material", "Short, standard, and long options change the sleeve; the palette changes its liner.")
    variants = [
        ("spacer-short", "22 mm · short"),
        ("spacer-default", "36 mm · standard"),
        ("spacer-long", "50 mm · long"),
        ("spacer-insulated", "Insulated palette"),
    ]
    for index, (variant, label) in enumerate(variants):
        x = 26 + index * 309
        frame.paste(contain(OUT / "variants" / f"{variant}.png", (275, 390)), (x + 4, 207))
        draw.text((x + 7, 610), label, font=font(16, True), fill=ACCENT)
    frame.save(OUT / "frames/03-spacer-lengths.png")


def retaining_gap() -> None:
    frame, draw = base_frame("Change the retaining-ring gap", "The opening and plier-ear spacing follow the selected gap; the blue-phosphate palette remains separate.")
    variants = [
        ("ring-compact-gap", "4 mm gap"),
        ("ring-default", "6 mm gap"),
        ("ring-wide-gap", "8 mm gap"),
        ("ring-blue-phosphate", "Blue phosphate"),
    ]
    for index, (variant, label) in enumerate(variants):
        x = 26 + index * 309
        frame.paste(contain(OUT / "variants" / f"{variant}.png", (275, 390)), (x + 4, 207))
        draw.text((x + 7, 610), label, font=font(16, True), fill=ACCENT)
    frame.save(OUT / "frames/04-retaining-ring.png")


def preview_review() -> None:
    entries = [
        ("pipe-reducer", "Pipe reducer", "Hollow taper, collars, red seal"),
        ("retaining-ring", "Retaining ring", "Open band, pierced plier ears"),
        ("tubular-spacer", "Tubular spacer", "Long sleeve, polymer liner, rims"),
    ]
    sheet = Image.new("RGB", (1320, 560), BG)
    draw = ImageDraw.Draw(sheet)
    draw.text((28, 20), "Standard-components preview review", font=font(24, True), fill=INK)
    for index, (asset, title, note) in enumerate(entries):
        x = 20 + index * 435
        sheet.paste(contain(ROOT / "catalog/kits/standard-components/previews" / f"{asset}.png", (405, 420)), (x, 70))
        draw.text((x + 8, 500), title, font=font(17, True), fill=ACCENT)
        draw.text((x + 8, 526), note, font=font(12), fill=MUTED)
    sheet.save(OUT / "preview-review/three-previews.png")


def verification() -> None:
    frame, draw = base_frame("Rebuild and verify the local catalog", "The branch stays local until the pull request is merged and the site deploys.")
    lines = [
        "3 existing assets refined · no new IDs or kits",
        "2 new material controls · 3 additional named palettes",
        "12 source variants rendered; geometry and color checks passed",
        "50/50 standard-components assets pass the quality gate",
        "Global gate: 2,402/2,402 assets pass (100.00%)",
        "All 50 kit previews regenerated; catalog index source hashes match",
        "ESLint clean · catalog integration suite passed",
        "Local static pages checked · deployment and physical acceptance not claimed",
    ]
    y = 205
    for line in lines:
        draw.rounded_rectangle((94, y, 1187, y + 45), radius=10, fill=WHITE)
        draw.text((122, y + 13), line, font=font(15, True), fill=ACCENT)
        y += 55
    frame.save(OUT / "frames/05-verification.png")


def main() -> None:
    required = [
        *[OUT / "before" / f"{asset}.png" for asset in ("pipe-reducer", "retaining-ring", "tubular-spacer")],
        *[OUT / "variants" / f"{name}.png" for name in (
            "reducer-half", "reducer-default", "reducer-three-quarter", "spacer-short",
            "spacer-default", "spacer-long", "spacer-insulated", "ring-compact-gap",
            "ring-default", "ring-wide-gap", "ring-blue-phosphate",
        )],
        OUT / "quality-global-output.txt",
        OUT / "eslint-output.txt",
        OUT / "integration-output.txt",
        OUT / "local-page-check.json",
    ]
    missing = [str(path) for path in required if not path.is_file()]
    if missing:
        raise SystemExit(f"missing demo evidence: {', '.join(missing)}")
    preview_review()
    before_after()
    reducer_ratio()
    spacer_length()
    retaining_gap()
    verification()

    video = OUT / "standard-components-pipe-geometry.mp4"
    concat = OUT / "frames/concat.txt"
    names = [
        "01-before-after.png",
        "02-reducer-ratios.png",
        "03-spacer-lengths.png",
        "04-retaining-ring.png",
        "05-verification.png",
    ]
    concat.write_text("".join(f"file '{OUT / 'frames' / name}'\nduration 3.5\n" for name in names) + f"file '{OUT / 'frames' / names[-1]}'\n", encoding="utf-8")
    subprocess.run([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0",
        "-i", str(concat), "-vf", "fps=24,scale=1280:720,format=yuv420p", "-c:v", "libx264",
        "-preset", "medium", "-crf", "20", "-movflags", "+faststart", str(video),
    ], check=True)
    (OUT / "capture-output.txt").write_text(
        "Invocation: python3 artifacts/catalog-demos/standard-components-pipe-geometry-20261110/capture_demo.py\n"
        "Video command: ffmpeg -f concat -safe 0 -i frames/concat.txt -vf fps=24,scale=1280:720,format=yuv420p -c:v libx264 -preset medium -crf 20 -movflags +faststart\n"
        f"Settings SHA256: {hashlib.sha256((OUT / 'demo-settings.json').read_bytes()).hexdigest()}\n"
        f"Output: {video.relative_to(ROOT)} ({video.stat().st_size} bytes)\n",
        encoding="utf-8",
    )
    print(f"wrote {video} ({video.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
