#!/usr/bin/env python3
"""Build readable stills for the local chain-hoist material-review MP4."""

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


def font(size: int, mono: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(MONO if mono else FONT, size)


def base(title: str, footer: str = "Local source render · branch not deployed · no hardware acceptance"):
    image = Image.new("RGB", (WIDTH, HEIGHT), BACKGROUND)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, WIDTH, 64), fill=NAVY)
    draw.text((18, 18), title, fill=WHITE, font=font(22))
    draw.rectangle((0, 576, WIDTH, 640), fill=NAVY)
    draw.text((18, 599), footer, fill=WHITE, font=font(14))
    return image, draw


def place_preview(image: Image.Image, preview_path: Path, caption: str):
    preview = Image.open(preview_path).convert("RGB")
    preview = preview.crop((0, 0, preview.width, min(preview.height, 456)))
    preview.thumbnail((500, 455), Image.Resampling.LANCZOS)
    x = (WIDTH - preview.width) // 2
    image.paste(preview, (x, 70))
    draw = ImageDraw.Draw(image)
    draw.text((18, 540), caption, fill=NAVY, font=font(17))
    return image


def contact_sheet():
    image, draw = base("INDUSTRIAL PLANT / FIVE-PREVIEW AUDIT")
    samples = [
        ("axial-flow-fan", "axial-flow-fan.png"),
        ("industrial-boiler", "industrial-boiler.png"),
        ("palletizer-robot-cell", "palletizer-robot-cell.png"),
        ("forklift-truck", "forklift-truck.png"),
        ("electric-chain-hoist", "electric-chain-hoist.png"),
    ]
    positions = [(22, 78), (252, 78), (482, 78), (137, 326), (367, 326)]
    for (name, filename), (x, y) in zip(samples, positions):
        preview = Image.open(BUNDLE / "samples" / filename).convert("RGB")
        preview.thumbnail((212, 212), Image.Resampling.LANCZOS)
        image.paste(preview, (x + (212 - preview.width) // 2, y))
        draw.text((x, y + 216), name, fill=NAVY, font=font(14))
    return image


def source_card():
    image, draw = base("SOURCE CHANGE / MATERIAL ASSIGNMENT")
    draw.text((28, 112), "Electric hoist load chain", fill=NAVY, font=font(25))
    draw.text((28, 170), "The source maps the chain part to the existing steel control:", fill=NAVY, font=font(17))
    source_text = (BUNDLE / "source/after/electric-chain-hoist.kcad.ts").read_text(encoding="utf-8")
    line = next(line.strip() for line in source_text.splitlines() if "p.part('chain'" in line)
    for index, segment in enumerate(wrap(line, width=73, break_long_words=False, break_on_hyphens=False)):
        draw.text((28, 220 + index * 28), segment, fill="#245a38", font=font(15, mono=True))
    draw.text((28, 328), "The previous source assigned safetyPaint to this load-chain part.", fill=NAVY, font=font(17))
    draw.text((28, 394), "The existing material control now gives the chain a", fill=NAVY, font=font(17))
    draw.text((28, 424), "neutral metal finish consistent with the model palette.", fill=NAVY, font=font(17))
    draw.text((28, 496), "No vendor geometry or dimensions copied.", fill=NAVY, font=font(16))
    return image


def checks_card():
    image, draw = base("LOCAL CHECKS / SOURCE-DRIVEN PREVIEW")
    draw.text((28, 102), "Verification summary", fill=NAVY, font=font(25))
    summary = BUNDLE / "verification" / "demo-verification-summary.txt"
    lines = summary.read_text(encoding="utf-8").splitlines()
    for index, line in enumerate(lines[:6]):
        draw.text((30, 163 + index * 42), line, fill="#245a38", font=font(17))
    draw.text((28, 468), "Software-rendered catalog prop; not deployed.", fill=NAVY, font=font(17))
    draw.text((28, 498), "No simulation, load rating, or physical acceptance shown.", fill=NAVY, font=font(15))
    return image


def main():
    SLIDES.mkdir(parents=True, exist_ok=True)
    contact_sheet().save(SLIDES / "01-five-preview-audit.png")
    source_card().save(SLIDES / "02-source-material.png")
    before, _ = base("BEFORE / CHAIN ASSIGNED SAFETY PAINT")
    place_preview(before, BUNDLE / "previews/before/electric-chain-hoist.png", "Load-chain primitive is safety yellow.")
    before.save(SLIDES / "03-before.png")
    after, _ = base("AFTER / CHAIN ASSIGNED STEEL")
    place_preview(after, BUNDLE / "previews/after/electric-chain-hoist.png", "Load chain now follows the existing steel control.")
    after.save(SLIDES / "04-after.png")
    checks_card().save(SLIDES / "05-verification.png")


if __name__ == "__main__":
    main()
