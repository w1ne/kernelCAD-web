#!/usr/bin/env python3
"""Build readable slides for the local sludge-thickener material review."""

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
FOOTER = "Software-rendered local preview · branch not deployed · no acceptance claim"


def font(size: int, mono: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(MONO if mono else FONT, size)


def base(title: str):
    image = Image.new("RGB", (WIDTH, HEIGHT), BACKGROUND)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, WIDTH, 64), fill=NAVY)
    draw.text((18, 18), title, fill=WHITE, font=font(22))
    draw.rectangle((0, 576, WIDTH, 640), fill=NAVY)
    draw.text((18, 599), FOOTER, fill=WHITE, font=font(11))
    return image, draw


def place_preview(image: Image.Image, preview_path: Path, caption: str):
    preview = Image.open(preview_path).convert("RGB")
    preview.thumbnail((520, 455), Image.Resampling.LANCZOS)
    image.paste(preview, ((WIDTH - preview.width) // 2, 72))
    ImageDraw.Draw(image).text((18, 540), caption, fill=NAVY, font=font(16))
    return image


def contact_sheet():
    image, draw = base("WATER TREATMENT / FIVE-PREVIEW AUDIT")
    samples = [
        ("activated-carbon-filter-vessel", BUNDLE / "samples/activated-carbon-filter-vessel.png"),
        ("dual-pump-manifold-skid", BUNDLE / "samples/dual-pump-manifold-skid.png"),
        ("aeration-basin", BUNDLE / "samples/aeration-basin.png"),
        ("sodium-hypochlorite-cabinet", BUNDLE / "samples/sodium-hypochlorite-cabinet.png"),
        ("sludge-thickener-tank", BUNDLE / "previews/after/sludge-thickener-tank.png"),
    ]
    positions = [(22, 78), (252, 78), (482, 78), (137, 326), (367, 326)]
    for (name, path), (x, y) in zip(samples, positions):
        preview = Image.open(path).convert("RGB")
        preview.thumbnail((212, 212), Image.Resampling.LANCZOS)
        image.paste(preview, (x + (212 - preview.width) // 2, y))
        draw.text((x, y + 216), name, fill=NAVY, font=font(12))
    return image


def source_card():
    image, draw = base("SOURCE CHANGE / MATERIAL ASSIGNMENT")
    draw.text((28, 98), "Sludge thickener center drive and scraper arm", fill=NAVY, font=font(20))
    draw.text((28, 140), "Concrete basin, structural-steel bridge and rake, cast-iron drive:", fill=NAVY, font=font(15))
    source = (BUNDLE / "source/after/sludge-thickener-tank.kcad.ts").read_text(encoding="utf-8")
    changed = [
        line.strip()
        for line in source.splitlines()
        if any(f'p.part("{name}"' in line for name in ("tank", "bridge", "drive", "scraper-arm"))
    ]
    y = 185
    for line in changed:
        for segment in wrap(line, width=78, break_long_words=False, break_on_hyphens=False):
            draw.text((28, y), segment, fill="#245a38", font=font(12, mono=True))
            y += 20
        y += 8
    draw.text((28, 446), "The source description and both presets expose all three materials.", fill=NAVY, font=font(15))
    draw.text((28, 478), "Mesh remains 500 triangles; drive elevation updates the envelope.", fill=NAVY, font=font(14))
    return image


def checks_card():
    image, draw = base("LOCAL CHECKS / SOURCE-DRIVEN PREVIEW")
    draw.text((28, 102), "Verification summary", fill=NAVY, font=font(25))
    lines = (BUNDLE / "verification/demo-verification-summary.txt").read_text(encoding="utf-8").splitlines()
    y = 163
    for line in lines[:5]:
        for segment in wrap(line, width=68, break_long_words=False, break_on_hyphens=False):
            draw.text((30, y), segment, fill="#245a38", font=font(15))
            y += 28
        y += 8
    draw.text((28, 464), "Local source and software renders only; no process simulation.", fill=NAVY, font=font(15))
    draw.text((28, 496), "No deployment, equipment rating or physical acceptance is shown.", fill=NAVY, font=font(14))
    return image


def main():
    SLIDES.mkdir(parents=True, exist_ok=True)
    contact_sheet().save(SLIDES / "01-five-preview-audit.png")
    source_card().save(SLIDES / "02-source-material.png")
    before, _ = base("BEFORE / DRIVE HIDDEN INSIDE THE FEED WELL")
    place_preview(before, BUNDLE / "previews/before/sludge-thickener-tank.png", "The center drive is hidden and shares the basin's concrete finish.")
    before.save(SLIDES / "03-before.png")
    after, _ = base("AFTER / DRIVE AND BASIN USE DISTINCT MATERIALS")
    place_preview(after, BUNDLE / "previews/after/sludge-thickener-tank.png", "The center drive now has a cast-iron control.")
    after.save(SLIDES / "04-after.png")
    checks_card().save(SLIDES / "05-verification.png")


if __name__ == "__main__":
    main()
