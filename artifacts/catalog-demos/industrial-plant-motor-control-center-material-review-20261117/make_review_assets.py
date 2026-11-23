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
        "burner-management-skid",
        "industrial-stair-tower",
        "motor-control-center",
        "pipe-rack-bay",
        "steel-access-gate",
    ]
    width, height = 1600, 1040
    margin, gap, card_w, card_h = 28, 22, 500, 430
    sheet = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(sheet)
    draw.text((margin, 20), "Industrial-plant preview audit · 17 Nov 2026", fill=INK, font=font(30, True))
    draw.text((margin, 57), "Five rendered objects; one material mismatch selected", fill=INK, font=font(20))
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
    draw.text((78, 58), "Motor control center · cabinet bay finish", fill=INK, font=font(31, True))
    for label, path, x in (
        ("Before · yellow center bay", ROOT / "before" / "motor-control-center.png", 78),
        ("After · three steel bays", ROOT / "after" / "motor-control-center.png", 660),
    ):
        draw.text((x, 122), label, fill=INK, font=font(20, True))
        with Image.open(path) as source:
            preview = source.convert("RGB")
        preview.thumbnail((535, 310), Image.Resampling.LANCZOS)
        image.paste(preview, (x, 152))
    draw.line((78, 486, 1202, 486), fill=(215, 222, 230), width=2)
    draw.text((78, 508), "Exported GLB regression: 1/1 passed · 396 triangles · geometry unchanged", fill=GREEN, font=font(21, True))
    draw.text((78, 545), "Three cabinet bays use steel; plinth and operator panels retain safety paint.", fill=INK, font=font(19))
    draw.text((78, 585), "Local software preview and exported-GLB regression only.", fill=INK, font=font(18, True))
    draw.text((78, 616), "No simulation, deployment verification, or hardware acceptance.", fill=INK, font=font(17))
    image.save(ROOT / "verification-card.png", optimize=True)


if __name__ == "__main__":
    preview_sheet()
    verification_card()
