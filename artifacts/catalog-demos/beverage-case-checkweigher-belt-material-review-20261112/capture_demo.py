#!/usr/bin/env python3
"""Create the local five-preview audit and before/after material review video."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


HERE = Path(__file__).resolve().parent
W, H = 1280, 720
BG = (239, 244, 248)
INK = (28, 42, 55)
MUTED = (82, 99, 112)
BLUE = (43, 90, 137)
GREEN = (45, 117, 79)
WHITE = (255, 255, 255)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def base(title: str, kicker: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(image)
    draw.text((48, 26), kicker.upper(), fill=BLUE, font=font(17, True))
    draw.text((48, 56), title, fill=INK, font=font(30, True))
    return image, draw


def preview(path: Path, size: tuple[int, int]) -> Image.Image:
    source = Image.open(path).convert("RGB")
    source.thumbnail(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", size, WHITE)
    canvas.paste(source, ((size[0] - source.width) // 2, (size[1] - source.height) // 2))
    return canvas


def footer(draw: ImageDraw.ImageDraw) -> None:
    draw.line((48, 680, W - 48, 680), fill=(196, 207, 216), width=1)
    draw.text(
        (48, 690),
        "Local source render and checks only · public site remains pre-change · no process simulation or equipment acceptance",
        fill=MUTED,
        font=font(12),
    )


def centered_label(draw: ImageDraw.ImageDraw, x: int, y: int, width: int, text: str) -> None:
    text_width = draw.textbbox((0, 0), text, font=font(14, True))[2]
    draw.text((x + (width - text_width) / 2, y), text, fill=INK, font=font(14, True))


def main() -> None:
    input_dir = HERE / "video-inputs"
    input_dir.mkdir(exist_ok=True)
    sample = HERE / "sample/local-preview"
    before = HERE / "before/case-checkweigher.png"
    after = HERE / "after/case-checkweigher.png"

    # Five exact baseline renders reviewed during the semantic audit.
    image, draw = base("Five beverage-line machine previews", "Semantic asset review · 12 November 2026")
    assets = [
        (sample / "rotary-filler.png", "Rotary filler"),
        (sample / "sanitary-lobe-pump.png", "Sanitary lobe pump"),
        (sample / "pet-blow-molder.png", "PET blow molder"),
        (before, "Packed-case checkweigher"),
        (sample / "flash-pasteurizer.png", "Flash pasteurizer"),
    ]
    size = (210, 210)
    positions = [(95, 126), (535, 126), (975, 126), (315, 400), (755, 400)]
    for (asset_path, label), (x, y) in zip(assets, positions, strict=True):
        image.paste(preview(asset_path, size), (x, y))
        draw.rounded_rectangle((x - 2, y - 2, x + size[0] + 2, y + size[1] + 2), radius=8, outline=(196, 207, 216), width=2)
        centered_label(draw, x, y + size[1] + 9, size[0], label)
    footer(draw)
    image.save(input_dir / "01-five-preview-sample.png")

    # Before/after render of the one selected asset.
    image, draw = base("Three conveyor belts now have their own material", "Native kernelCAD asset · before / after")
    draw.text((250, 112), "BEFORE · belt surfaces share the steel-bed color", fill=BLUE, font=font(16, True))
    draw.text((852, 112), "AFTER · three polymer belt surfaces", fill=GREEN, font=font(16, True))
    image.paste(preview(before, (512, 512)), (72, 142))
    image.paste(preview(after, (512, 512)), (696, 142))
    draw.rounded_rectangle((66, 136, 590, 664), radius=12, outline=(196, 207, 216), width=2)
    draw.rounded_rectangle((690, 136, 1214, 664), radius=12, outline=(125, 181, 148), width=2)
    footer(draw)
    image.save(input_dir / "02-before-after.png")

    # Source mapping and validation, grounded in the updated asset and test.
    image, draw = base("Material controls and local verification", "Source-first correction · belt surfaces separated from support beds")
    image.paste(preview(after, (400, 400)), (52, 154))
    draw.rounded_rectangle((47, 149, 457, 568), radius=12, outline=(196, 207, 216), width=2)

    draw.rounded_rectangle((490, 142, 1224, 382), radius=14, fill=(29, 39, 48))
    mappings = [
        ("infeed-belt · weigh-belt · outfeed-belt", "beltPolymer · default #30373b", (222, 228, 232)),
        ("sanitaryLine preset", "beltPolymer · #edf0e8", (237, 240, 232)),
        ("left / weigh / right bed supports", "stainlessSteel · #aebdc1", (174, 189, 193)),
    ]
    y = 163
    for part, material, color in mappings:
        draw.text((520, y), part, fill=WHITE, font=font(14, True))
        draw.text((520, y + 25), f"→ {material}", fill=color, font=font(15))
        y += 67

    checks = [
        "GLB regression: all three belt nodes use beltPolymer",
        "248 triangles / 320 budget; 1.26 × 0.78 × 0.785 m envelope",
        "Catalog index regenerated from source; preview path retained",
        "Beverage-line gate: 50/50; ESLint clean",
    ]
    draw.rounded_rectangle((490, 405, 1224, 646), radius=14, fill=WHITE, outline=(196, 207, 216), width=2)
    for index, line in enumerate(checks):
        y = 424 + index * 48
        draw.ellipse((514, y + 3, 536, y + 25), fill=GREEN)
        draw.text((520, y + 2), "✓", fill=WHITE, font=font(16, True))
        draw.text((550, y), line, fill=INK, font=font(14))
    footer(draw)
    image.save(input_dir / "03-local-verification.png")

    concat = HERE / "demo-slides.txt"
    concat.write_text(
        "file 'video-inputs/01-five-preview-sample.png'\n"
        "duration 4\n"
        "file 'video-inputs/02-before-after.png'\n"
        "duration 5\n"
        "file 'video-inputs/03-local-verification.png'\n"
        "duration 6\n"
        "file 'video-inputs/03-local-verification.png'\n",
        encoding="utf-8",
    )
    command = [
        "ffmpeg", "-y", "-safe", "0", "-f", "concat", "-i", str(concat),
        "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "medium",
        "-crf", "20", "-movflags", "+faststart",
        str(HERE / "beverage-case-checkweigher-belt-material-review.mp4"),
    ]
    result = subprocess.run(command, cwd=HERE, text=True, capture_output=True, check=True)
    (HERE / "video-capture-output.txt").write_text(
        "Invocation: python3 capture_demo.py\n"
        + "Command: " + " ".join(command) + "\n\n"
        + result.stdout + result.stderr,
        encoding="utf-8",
    )
    (HERE / "demo-settings.json").write_text(json.dumps({
        "resolution": [W, H],
        "fps": 30,
        "slideDurationsSeconds": [4, 5, 6],
        "codec": "H.264 / libx264",
        "crf": 20,
        "preset": "medium",
        "pixelFormat": "yuv420p",
        "captions": "Local source render and checks only; the public site remains pre-change; no process simulation or equipment acceptance is shown.",
    }, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
