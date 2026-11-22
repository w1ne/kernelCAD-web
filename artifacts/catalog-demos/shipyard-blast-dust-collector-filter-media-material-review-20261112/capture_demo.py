#!/usr/bin/env python3
"""Capture the five-preview audit and the dust-collector material correction."""
from pathlib import Path
import subprocess

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
        "Local source render and validation only · not deployed; no process simulation or equipment acceptance shown",
        fill=MUTED,
        font=font(13),
    )


def main() -> None:
    sample = HERE / "sample"
    before = HERE / "before/blast-dust-collector.png"
    after = HERE / "after/blast-dust-collector.png"
    frame_dir = HERE / "video-inputs"
    frame_dir.mkdir(exist_ok=True)

    # Slide 1: actual sample renders used for the semantic review.
    image, draw = base("Five shipyard manufacturing previews", "Semantic asset review · 12 November 2026")
    assets = [
        (sample / "abrasive-blast-pot.png", "Abrasive blast pot"),
        (before, "Blast dust collector"),
        (sample / "electrode-storage-oven.png", "Electrode storage oven"),
        (sample / "hull-block-paint-booth.png", "Hull-block paint booth"),
        (sample / "airless-coating-pump-cart.png", "Airless-coating pump cart"),
    ]
    size = (210, 210)
    positions = [(95, 126), (535, 126), (975, 126), (315, 400), (755, 400)]
    for (asset_path, label), (x, y) in zip(assets, positions, strict=True):
        image.paste(preview(asset_path, size), (x, y))
        draw.rounded_rectangle((x - 2, y - 2, x + size[0] + 2, y + size[1] + 2), radius=8, outline=(196, 207, 216), width=2)
        label_width = draw.textbbox((0, 0), label, font=font(15, True))[2]
        draw.text((x + (size[0] - label_width) / 2, y + size[1] + 10), label, fill=INK, font=font(15, True))
    footer(draw)
    image.save(frame_dir / "01-five-preview-sample.png")

    # Slide 2: before/after software renders of the exact same source asset.
    image, draw = base("Filter media now has its own finish", "Native kernelCAD asset · before / after")
    draw.text((260, 112), "BEFORE · all canisters use yardPaint", fill=BLUE, font=font(17, True))
    draw.text((868, 112), "AFTER · canisters use filterMedia", fill=GREEN, font=font(17, True))
    image.paste(preview(before, (512, 512)), (72, 142))
    image.paste(preview(after, (512, 512)), (696, 142))
    draw.rounded_rectangle((66, 136, 590, 664), radius=12, outline=(196, 207, 216), width=2)
    draw.rounded_rectangle((690, 136, 1214, 664), radius=12, outline=(125, 181, 148), width=2)
    footer(draw)
    image.save(frame_dir / "02-before-after.png")

    # Slide 3: source mapping plus local verification.
    image, draw = base("Material controls and verification", "Source-first change · no geometry edits")
    image.paste(preview(after, (410, 410)), (54, 150))
    draw.rounded_rectangle((49, 145, 469, 570), radius=12, outline=(196, 207, 216), width=2)

    draw.rounded_rectangle((500, 142, 1224, 416), radius=14, fill=(29, 39, 48))
    mappings = [
        ("filter-canister-0 / 1 / 2", "filterMedia · #d7ded8", (213, 225, 215)),
        ("skid · inlet duct · fan · service door", "yardPaint · #71837c", (178, 205, 192)),
        ("casters", "elastomer · #30383b", (220, 224, 229)),
    ]
    y = 172
    for part, material, color in mappings:
        draw.text((532, y), part, fill=WHITE, font=font(16, True))
        draw.text((532, y + 27), f"→ {material}", fill=color, font=font(17))
        y += 78
    draw.text((532, 400), "Both fresh-coat and weathered-yard presets set all three materials.", fill=(220, 224, 229), font=font(14))

    checks = [
        "GLB regression: three canister colors verified; 356 triangles",
        "Envelope unchanged: 2.05 × 2.13 × 0.995 m",
        "Catalog index regenerated from model sources",
        "ESLint and catalog integration suite passed",
    ]
    draw.rounded_rectangle((500, 440, 1224, 646), radius=14, fill=WHITE, outline=(196, 207, 216), width=2)
    for index, line in enumerate(checks):
        y = 458 + index * 43
        draw.ellipse((524, y + 4, 546, y + 26), fill=GREEN)
        draw.text((530, y + 3), "✓", fill=WHITE, font=font(16, True))
        draw.text((560, y + 1), line, fill=INK, font=font(15))
    footer(draw)
    image.save(frame_dir / "03-local-verification.png")

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
    subprocess.run([
        "ffmpeg", "-y", "-safe", "0", "-f", "concat", "-i", str(concat),
        "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "medium",
        "-crf", "20", "-movflags", "+faststart",
        str(HERE / "shipyard-blast-dust-collector-filter-media-review.mp4"),
    ], cwd=HERE, check=True)


if __name__ == "__main__":
    main()
