#!/usr/bin/env python3
"""Compose a short local preview audit and result video from retained evidence."""

from pathlib import Path
import json
import shutil
import subprocess

from PIL import Image, ImageDraw, ImageFont


BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
WIDTH, HEIGHT = 1280, 720
FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT = ImageFont.truetype(FONT_PATH, 23)
SMALL = ImageFont.truetype(FONT_PATH, 18)
LABEL = ImageFont.truetype(FONT_BOLD_PATH, 22)
TITLE = ImageFont.truetype(FONT_BOLD_PATH, 31)
SUBTITLE = ImageFont.truetype(FONT_PATH, 18)


def canvas(title: str, subtitle: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (WIDTH, HEIGHT), "#eaf1f6")
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, WIDTH, 98), fill="#183044")
    draw.text((48, 17), title, font=TITLE, fill="#ffffff")
    draw.text((50, 62), subtitle, font=SUBTITLE, fill="#c9d9e6")
    return image, draw


def paste_preview(image: Image.Image, path: Path, center_x: int, top: int, size: int) -> None:
    preview = Image.open(path).convert("RGB")
    preview.thumbnail((size, size), Image.Resampling.LANCZOS)
    x = center_x - preview.width // 2
    image.paste(preview, (x, top))


def make_audit_slide() -> Image.Image:
    image, draw = canvas("KernelCAD catalog preview audit", "Five rendered industrial assets · local source and preview review")
    items = [
        ("cyclone-separator", 205, 120),
        ("cable-tray-bridge", 640, 120),
        ("horizontal-pressure-vessel", 1075, 120),
        ("vibratory-feeder", 420, 410),
        ("electric-chain-hoist", 860, 410),
    ]
    for asset, center_x, top in items:
        path = BUNDLE / "samples" / f"{asset}.png"
        paste_preview(image, path, center_x, top, 210)
        draw.text((center_x, top + 215), asset.replace("-", " "), font=SMALL, fill="#183044", anchor="mt")
    draw.text((48, 682), "One material mismatch selected: cable-tray side rails used safety paint.", font=SMALL, fill="#485d6d")
    return image


def make_comparison_slide() -> Image.Image:
    image, draw = canvas("Cable tray bridge · material correction", "Side rails now share the structural steel finish used by the rungs")
    paste_preview(image, BUNDLE / "before" / "cable-tray-bridge.png", 335, 125, 430)
    paste_preview(image, BUNDLE / "after-cable-tray-bridge.png", 945, 125, 430)
    draw.text((335, 570), "BEFORE · painted side rails", font=LABEL, fill="#aa6423", anchor="mt")
    draw.text((945, 570), "AFTER · steel tray rails", font=LABEL, fill="#183044", anchor="mt")
    draw.text((640, 628), "Orange support feet remain safety painted · 168 triangles · geometry unchanged", font=SMALL, fill="#485d6d", anchor="mt")
    return image


def make_verification_slide() -> Image.Image:
    image, draw = canvas("Verification", "Source evaluation · software preview · exported-GLB material regression")
    paste_preview(image, BUNDLE / "after-cable-tray-bridge.png", 350, 145, 420)
    draw.text((655, 175), "PASS", font=ImageFont.truetype(FONT_BOLD_PATH, 45), fill="#167552")
    checks = [
        "Both tray rails use steel",
        "Tray rungs use the same steel",
        "Safety-painted feet retained",
        "168 tris / 1,400 budget",
        "Catalog index regenerated",
    ]
    for index, line in enumerate(checks):
        y = 248 + index * 53
        draw.rounded_rectangle((660, y, 688, y + 28), radius=6, fill="#d9efe6", outline="#167552", width=2)
        draw.text((704, y - 2), line, font=FONT, fill="#183044")
    draw.text((640, 662), "Local software-rendered preview and code regression only · no simulation or hardware acceptance", font=SMALL, fill="#485d6d", anchor="mt")
    return image


def main() -> None:
    slide_dir = BUNDLE / "video-review" / "slides"
    slide_dir.mkdir(parents=True, exist_ok=True)
    slides = [make_audit_slide(), make_comparison_slide(), make_verification_slide()]
    paths = []
    for index, slide in enumerate(slides, start=1):
        path = slide_dir / f"slide-{index:02d}.png"
        slide.save(path)
        paths.append(path)

    concat = slide_dir / "slides.txt"
    with concat.open("w", encoding="utf-8") as handle:
        for path in paths:
            handle.write(f"file '{path.resolve()}'\n")
            handle.write("duration 5\n")
        handle.write(f"file '{paths[-1].resolve()}'\n")

    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise SystemExit("ffmpeg is required to encode the audit MP4")
    output = BUNDLE / "industrial-plant-cable-tray-bridge-side-rail-material-review.mp4"
    subprocess.run([
        ffmpeg, "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(concat),
        "-t", "15", "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "medium",
        "-crf", "22", "-movflags", "+faststart", str(output),
    ], check=True)
    probe = shutil.which("ffprobe")
    if probe:
        result = subprocess.run([
            probe, "-v", "error", "-show_streams", "-show_format", "-of", "json", str(output),
        ], check=True, capture_output=True, text=True)
        (BUNDLE / "video-review").mkdir(exist_ok=True)
        (BUNDLE / "video-review" / "ffprobe.json").write_text(result.stdout, encoding="utf-8")
    print(output.relative_to(ROOT))


if __name__ == "__main__":
    main()
