#!/usr/bin/env python3
"""Build readable slides for the local horizontal pressure-vessel material review."""

from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont

BUNDLE = Path(__file__).resolve().parent
SLIDES = BUNDLE / "slides"
WIDTH, HEIGHT = 720, 640
BACKGROUND = "#f0f4f8"
NAVY = "#203848"
WHITE = "#ffffff"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
FOOTER = "Software-rendered local preview · branch not deployed · no engineering acceptance"


def font(size: int, mono: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(MONO if mono else FONT, size)


def base(title: str):
    image = Image.new("RGB", (WIDTH, HEIGHT), BACKGROUND)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, WIDTH, 64), fill=NAVY)
    draw.text((18, 18), title, fill=WHITE, font=font(22))
    draw.rectangle((0, 576, WIDTH, 640), fill=NAVY)
    draw.text((18, 599), FOOTER, fill=WHITE, font=font(12))
    return image, draw


def place_preview(image: Image.Image, preview_path: Path, caption: str):
    preview = Image.open(preview_path).convert("RGB")
    preview = preview.crop((0, 0, preview.width, min(preview.height, 456)))
    preview.thumbnail((520, 455), Image.Resampling.LANCZOS)
    image.paste(preview, ((WIDTH - preview.width) // 2, 70))
    ImageDraw.Draw(image).text((18, 540), caption, fill=NAVY, font=font(17))
    return image


def contact_sheet():
    image, draw = base("INDUSTRIAL PLANT / FIVE-PREVIEW AUDIT")
    samples = [
        "belt-conveyor",
        "bucket-elevator",
        "compressed-air-receiver",
        "distillation-column",
        "horizontal-pressure-vessel",
    ]
    positions = [(22, 78), (252, 78), (482, 78), (137, 326), (367, 326)]
    for name, (x, y) in zip(samples, positions):
        preview = Image.open(BUNDLE / "samples" / f"{name}.png").convert("RGB")
        preview.thumbnail((212, 212), Image.Resampling.LANCZOS)
        image.paste(preview, (x + (212 - preview.width) // 2, y))
        draw.text((x, y + 216), name, fill=NAVY, font=font(13))
    return image


def source_card():
    image, draw = base("SOURCE CHANGE / MATERIAL ASSIGNMENT")
    draw.text((28, 104), "Horizontal pressure-vessel heads and nozzle necks", fill=NAVY, font=font(20))
    draw.text((28, 154), "The source routes all four pressure-boundary parts to steel:", fill=NAVY, font=font(16))
    source = (BUNDLE / "source/after/horizontal-pressure-vessel.kcad.ts").read_text(encoding="utf-8")
    changed = [
        line.strip()
        for line in source.splitlines()
        if any(f"p.part('{name}'" in line for name in ("left-head", "right-head", "top-port-0", "top-port-1"))
    ]
    y = 198
    for line in changed:
        for segment in wrap(line, width=76, break_long_words=False, break_on_hyphens=False):
            draw.text((28, y), segment, fill="#245a38", font=font(12, mono=True))
            y += 20
        y += 8
    draw.text((28, 438), "The shell and flanges already use the same steel control.", fill=NAVY, font=font(16))
    draw.text((28, 474), "Geometry stays at 468 triangles under its 1,400-triangle budget.", fill=NAVY, font=font(15))
    return image


def checks_card():
    image, draw = base("LOCAL CHECKS / SOURCE-DRIVEN PREVIEW")
    draw.text((28, 102), "Verification summary", fill=NAVY, font=font(25))
    lines = (BUNDLE / "verification/demo-verification-summary.txt").read_text(encoding="utf-8").splitlines()
    for index, line in enumerate(lines[:6]):
        draw.text((30, 163 + index * 42), line, fill="#245a38", font=font(16))
    draw.text((28, 464), "Local source and software render only; this is not a simulation.", fill=NAVY, font=font(15))
    draw.text((28, 496), "No deployment, pressure rating, or physical acceptance is shown.", fill=NAVY, font=font(14))
    return image


def main():
    SLIDES.mkdir(parents=True, exist_ok=True)
    contact_sheet().save(SLIDES / "01-five-preview-audit.png")
    source_card().save(SLIDES / "02-source-material.png")
    before, _ = base("BEFORE / HEADS AND PORT NECKS ASSIGNED SAFETY PAINT")
    place_preview(before, BUNDLE / "previews/before/horizontal-pressure-vessel.png", "Heads and top nozzle necks render safety yellow.")
    before.save(SLIDES / "03-before.png")
    after, _ = base("AFTER / PRESSURE BOUNDARY ASSIGNED STEEL")
    place_preview(after, BUNDLE / "previews/after/horizontal-pressure-vessel.png", "Heads and nozzle necks follow the existing steel control.")
    after.save(SLIDES / "04-after.png")
    checks_card().save(SLIDES / "05-verification.png")


if __name__ == "__main__":
    main()
