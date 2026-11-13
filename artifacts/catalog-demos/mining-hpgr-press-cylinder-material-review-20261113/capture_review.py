#!/usr/bin/env python3
"""Build slides for the local HPGR press-cylinder material review."""

from pathlib import Path

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
ASSET = "high-pressure-grinding-rolls.png"
CROP = (290, 170, 410, 270)  # press cylinders on the floating-roll side


def font(size, mono=False):
    return ImageFont.truetype(MONO if mono else FONT, size)


def base(title):
    image = Image.new("RGB", (WIDTH, HEIGHT), BACKGROUND)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, WIDTH, 64), fill=NAVY)
    draw.text((18, 18), title, fill=WHITE, font=font(22))
    draw.rectangle((0, 576, WIDTH, 640), fill=NAVY)
    draw.text((18, 599), FOOTER, fill=WHITE, font=font(11))
    return image, draw


def contact_sheet():
    image, draw = base("MINING / FIVE-PREVIEW AUDIT")
    names = ["sag-mill", "cone-crusher-module", "slurry-pump-skid", "apron-feeder"]
    samples = [(n, BUNDLE / f"samples/{n}.png") for n in names]
    samples.append(("high-pressure-grinding-rolls", BUNDLE / "previews/before" / ASSET))
    positions = [(22, 78), (252, 78), (482, 78), (137, 326), (367, 326)]
    for (name, path), (x, y) in zip(samples, positions):
        preview = Image.open(path).convert("RGB")
        preview.thumbnail((212, 212), Image.Resampling.LANCZOS)
        image.paste(preview, (x + (212 - preview.width) // 2, y))
        draw.text((x, y + 216), name, fill=NAVY, font=font(12))
    return image


def source_card():
    image, draw = base("SOURCE CHANGE / ONE PART FAMILY")
    lines = [
        "press-cylinder-{j}-{i}  (4 barrels)",
        "  before: .color(chrome)          #c3cacc",
        "  after:  .color(structuralSteel) #4b5459",
        "",
        "press-cylinder-rod-{j}-{i}  (4 rods)",
        "  unchanged: .color(chrome)",
        "",
        "structuralSteel label:",
        "  'Drive, cylinder barrel and bin steel'",
        "",
        "Why: a hydraulic cylinder barrel is painted",
        "steel tube. Only the piston rod is hard-chrome.",
        "Before, barrel and rod were one bright colour.",
    ]
    for k, line in enumerate(lines):
        draw.text((30, 90 + k * 34), line, fill=NAVY, font=font(17, mono=True))
    return image


def preview_slide(title, path, caption):
    image, draw = base(title)
    preview = Image.open(path).convert("RGB")
    preview.thumbnail((520, 455), Image.Resampling.LANCZOS)
    image.paste(preview, ((WIDTH - preview.width) // 2, 72))
    draw.text((18, 540), caption, fill=NAVY, font=font(16))
    return image


def closeup():
    image, draw = base("CLOSE-UP / PRESS CYLINDERS (3x crop)")
    for k, (label, folder) in enumerate([("before", "before"), ("after", "after")]):
        crop = Image.open(BUNDLE / "previews" / folder / ASSET).convert("RGB").crop(CROP)
        crop = crop.resize((crop.width * 3, crop.height * 3), Image.Resampling.NEAREST)
        x = 18 + k * 352
        image.paste(crop, (x, 100))
        draw.text((x, 420), label, fill=NAVY, font=font(20))
    draw.text((18, 470), "Before: chrome barrel and rod. After: dark barrel, chrome rod end.", fill=NAVY, font=font(15))
    return image


def verification():
    image, draw = base("LOCAL VERIFICATION")
    lines = (BUNDLE / "verification/demo-verification-summary.txt").read_text().splitlines()
    for k, line in enumerate(lines):
        draw.text((30, 90 + k * 34), line, fill=NAVY, font=font(16))
    return image


def main():
    SLIDES.mkdir(exist_ok=True)
    contact_sheet().save(SLIDES / "01-five-preview-audit.png")
    source_card().save(SLIDES / "02-source-material.png")
    preview_slide("BEFORE", BUNDLE / "previews/before" / ASSET, "Press-cylinder barrels render as bare chrome.").save(SLIDES / "03-before.png")
    preview_slide("AFTER", BUNDLE / "previews/after" / ASSET, "Barrels painted steel; rods stay chrome. 5,142 triangles.").save(SLIDES / "04-after.png")
    closeup().save(SLIDES / "05-closeup.png")
    verification().save(SLIDES / "06-verification.png")


if __name__ == "__main__":
    main()
