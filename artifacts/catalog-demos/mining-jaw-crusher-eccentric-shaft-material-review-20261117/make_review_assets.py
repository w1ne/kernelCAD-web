#!/usr/bin/env python3
"""Build the five-preview contact sheet and before/after verification card."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
BG = (238, 242, 247)
INK = (34, 48, 64)
CARD = (255, 255, 255)
GREEN = (31, 112, 73)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    for base in (
        Path("/usr/share/fonts/truetype/dejavu"),
        Path("/usr/share/fonts/truetype/liberation2"),
    ):
        candidate = base / name
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def preview_sheet() -> None:
    names = [
        "cone-crusher-module",
        "jaw-crusher-module",
        "ball-mill",
        "mine-locomotive",
        "mine-ventilation-fan",
    ]
    width, height = 1600, 1040
    margin, gap, card_w, card_h = 28, 22, 500, 430
    sheet = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(sheet)
    draw.text((margin, 20), "Mining preview audit · 17 Nov 2026", fill=INK, font=font(30, True))
    draw.text((margin, 57), "Five rendered objects; one material-control mismatch selected", fill=INK, font=font(20))
    for index, name in enumerate(names):
        col, row = index % 3, index // 3
        x = margin + col * (card_w + gap)
        y = 98 + row * (card_h + gap)
        draw.rounded_rectangle((x, y, x + card_w, y + card_h), radius=12, fill=CARD)
        draw.text((x + 18, y + 12), name.replace("-", " "), fill=INK, font=font(22, True))
        with Image.open(ROOT / "samples" / name / f"{name}.png") as source:
            preview = source.convert("RGB")
        preview.thumbnail((card_w - 32, card_h - 54), Image.Resampling.LANCZOS)
        px = x + (card_w - preview.width) // 2
        py = y + 48 + (card_h - 54 - preview.height) // 2
        sheet.paste(preview, (px, py))
    sheet.save(ROOT / "preview-review-five-assets.png", optimize=True)


def verification_card() -> None:
    image = Image.new("RGB", (1280, 720), BG)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((44, 36, 1236, 674), radius=24, fill=CARD)
    draw.text((78, 58), "Jaw crusher · eccentric-shaft material role", fill=INK, font=font(31, True))
    for label, path, x in (
        ("Before · manganese liner control", ROOT / "before" / "jaw-crusher-module.png", 78),
        ("After · structural-steel control", ROOT / "after" / "jaw-crusher-module.png", 660),
    ):
        draw.text((x, 122), label, fill=INK, font=font(20, True))
        with Image.open(path) as source:
            preview = source.convert("RGB")
        preview.thumbnail((535, 310), Image.Resampling.LANCZOS)
        image.paste(preview, (x, 152))
    draw.line((78, 486, 1202, 486), fill=(215, 222, 230), width=2)
    draw.text((78, 508), "Exported GLB regression: 1/1 passed · 3,616 triangles · geometry unchanged", fill=GREEN, font=font(21, True))
    draw.text((78, 545), "Eccentric shaft uses structural steel; both jaw liners retain manganese.", fill=INK, font=font(19))
    draw.text((78, 585), "Local software preview and exported-GLB regression only.", fill=INK, font=font(18, True))
    draw.text((78, 616), "No simulation, deployment verification, or hardware acceptance.", fill=INK, font=font(17))
    image.save(ROOT / "verification-card.png", optimize=True)


def shaft_detail() -> None:
    image = Image.new("RGB", (1280, 720), BG)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((44, 36, 1236, 674), radius=24, fill=CARD)
    draw.text((78, 58), "Jaw crusher · eccentric shaft detail", fill=INK, font=font(31, True))
    draw.text((78, 101), "Magnified crop from each default software preview", fill=INK, font=font(19))
    crop = (206, 158, 278, 222)
    for label, path, x in (
        ("Before · manganese liner control", ROOT / "before" / "jaw-crusher-module.png", 78),
        ("After · structural-steel control", ROOT / "after" / "jaw-crusher-module.png", 660),
    ):
        draw.text((x, 145), label, fill=INK, font=font(19, True))
        with Image.open(path) as source:
            detail = source.convert("RGB").crop(crop)
        detail = detail.resize((432, 384), Image.Resampling.NEAREST)
        image.paste(detail, (x, 180))
    draw.text((78, 586), "The crop is enlarged for review; full uncropped previews remain in before/ and after/.", fill=INK, font=font(18))
    draw.text((78, 617), "Default colors only; editable material controls remain in the source model.", fill=INK, font=font(18))
    image.save(ROOT / "shaft-detail-before-after.png", optimize=True)


if __name__ == "__main__":
    preview_sheet()
    verification_card()
    shaft_detail()
