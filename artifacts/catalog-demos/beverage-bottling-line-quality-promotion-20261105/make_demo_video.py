#!/usr/bin/env python3
"""Build an inspected side-by-side MP4 from the retained catalog renders."""

from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BUNDLE = Path(__file__).resolve().parent
EVIDENCE = BUNDLE / "evidence"
FRAMES = BUNDLE / "frames"
VIDEO = BUNDLE / "beverage-bottling-line-quality-promotion.mp4"
SIZE = (1080, 720)
BACKGROUND = (22, 31, 39)
FOREGROUND = (239, 244, 245)
MUTED = (172, 190, 197)
ACCENT = (103, 190, 199)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    return ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/{name}", size)


def start_slide(title: str, subtitle: str = "") -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", SIZE, BACKGROUND)
    draw = ImageDraw.Draw(image)
    draw.text((54, 42), title, fill=FOREGROUND, font=font(34, True))
    if subtitle:
        draw.text((56, 94), subtitle, fill=MUTED, font=font(18))
    draw.line((54, 650, 1026, 650), fill=(62, 82, 92), width=2)
    draw.text((56, 666), "Local catalog render · feature branch · not deployed", fill=MUTED, font=font(15))
    return image, draw


def cover() -> Image.Image:
    image, draw = start_slide("Beverage bottling line", "Quality promotion · 5 November 2026")
    draw.text((58, 180), "50 existing assets", fill=ACCENT, font=font(38, True))
    draw.text((58, 242), "137 material-named color controls", fill=FOREGROUND, font=font(27))
    draw.text((58, 291), "100 named preset entries", fill=FOREGROUND, font=font(27))
    draw.text((58, 340), "50 refreshed rendered previews", fill=FOREGROUND, font=font(27))
    draw.text((58, 448), "Each model keeps its existing ID and adds recognizable machine details,", fill=MUTED, font=font(19))
    draw.text((58, 478), "material-specific colors and two switchable appearance presets.", fill=MUTED, font=font(19))
    return image


def compare(id: str, title: str, knobs: str, result: str) -> Image.Image:
    image, draw = start_slide(title, f"Material controls: {knobs}")
    for x, suffix, label in [(58, "default", "Default finish"), (552, "sanitaryLine", "sanitaryLine preset")]:
        preview = Image.open(EVIDENCE / f"{id}-{suffix}.png").convert("RGB")
        preview.thumbnail((440, 440), Image.Resampling.LANCZOS)
        panel = Image.new("RGB", (450, 450), (235, 240, 241))
        panel.paste(preview, ((450 - preview.width) // 2, (450 - preview.height) // 2))
        image.paste(panel, (x, 158))
        draw.text((x + 4, 616), label, fill=FOREGROUND, font=font(20, True))
    draw.text((58, 132), result, fill=ACCENT, font=font(16))
    return image


def summary() -> Image.Image:
    image, draw = start_slide("Previewed, indexed, and locally checked", "The branch contains catalog sources and generated assets")
    lines = [
        "50 / 50 sources pass the catalog quality gate",
        "1,704 / 2,390 assets pass overall (71.3%)",
        "686 thin assets remain (28.7%)",
        "All 50 previews are regenerated and indexed",
        "ESLint clean; catalog integration: 4 files / 15 tests passed",
    ]
    for index, line in enumerate(lines):
        draw.text((64, 190 + index * 58), f"•  {line}", fill=FOREGROUND, font=font(23))
    draw.text((64, 520), "The local evidence does not claim deployment or physical acceptance.", fill=MUTED, font=font(18))
    return image


def main() -> None:
    FRAMES.mkdir(exist_ok=True)
    slides = [
        cover(),
        compare("beverage-blend-tank", "Beverage blend tank", "stainlessSteel · powderCoat · glass", "Jacket band, manway, agitator, sight glass and outlet"),
        compare("bottle-case-packer", "Bottle case packer", "stainless steel · powder coat · food polymer · board", "Open guarded frame, lift table, carton and six bottles"),
        compare("rotary-filler", "Rotary bottle filler", "stainless steel · powder coat · food polymer", "Twelve bottle positions around the rotary filling table"),
        summary(),
    ]
    for index, slide in enumerate(slides, 1):
        slide.save(FRAMES / f"slide-{index:02d}.png")
    subprocess.run([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-framerate", "1/3", "-i", str(FRAMES / "slide-%02d.png"),
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "24", "-movflags", "+faststart",
        str(VIDEO),
    ], check=True)
    for index in range(5):
        subprocess.run([
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-ss", str(index * 3 + 1), "-i", str(VIDEO), "-frames:v", "1",
            str(EVIDENCE / f"video-frame-{index + 1:02d}.png"),
        ], check=True)
    print(f"wrote {VIDEO}")


if __name__ == "__main__":
    main()
