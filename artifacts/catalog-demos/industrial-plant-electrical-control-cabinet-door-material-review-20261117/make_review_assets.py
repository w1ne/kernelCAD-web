#!/usr/bin/env python3
"""Build the five-preview audit sheet and the cabinet before/after card."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
BG = (238, 242, 247)
INK = (34, 48, 64)
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


def fit(source_path: Path, width: int, height: int) -> Image.Image:
    with Image.open(source_path) as source:
        image = source.convert("RGB")
    image.thumbnail((width, height), Image.Resampling.LANCZOS)
    return image


def audit_sheet() -> None:
    names = [
        "electrical-control-cabinet",
        "gantry-crane",
        "jib-crane",
        "machine-guard-enclosure",
        "pallet-rack-bay",
    ]
    width, height = 1600, 1040
    margin, gap, card_w, card_h = 28, 22, 500, 430
    sheet = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(sheet)
    draw.text((margin, 20), "Industrial-plant preview audit · 17 Nov 2026", fill=INK, font=font(30, True))
    draw.text((margin, 57), "Five rendered objects; one door finish mismatch selected", fill=INK, font=font(20))
    for index, name in enumerate(names):
        col, row = index % 3, index // 3
        x = margin + col * (card_w + gap)
        y = 98 + row * (card_h + gap)
        draw.rounded_rectangle((x, y, x + card_w, y + card_h), radius=12, fill=(255, 255, 255))
        draw.text((x + 18, y + 12), name.replace("-", " "), fill=INK, font=font(22, True))
        preview = fit(ROOT / "audit" / f"{name}.png", card_w - 32, card_h - 54)
        px = x + (card_w - preview.width) // 2
        py = y + 48 + (card_h - 54 - preview.height) // 2
        sheet.paste(preview, (px, py))
    sheet.save(ROOT / "audit" / "five-preview-assets.png", optimize=True)


def comparison_card() -> None:
    image = Image.new("RGB", (1280, 720), BG)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((44, 36, 1236, 674), radius=24, fill=(255, 255, 255))
    draw.text((78, 58), "Electrical control cabinet · twin-door finish", fill=INK, font=font(31, True))
    for label, path, x in (
        ("Before · doors use different finishes", ROOT / "before" / "electrical-control-cabinet.png", 78),
        ("After · both doors use steel", ROOT / "after" / "electrical-control-cabinet.png", 660),
    ):
        draw.text((x, 122), label, fill=INK, font=font(20, True))
        image.paste(fit(path, 535, 310), (x, 152))
    draw.line((78, 486, 1202, 486), fill=(215, 222, 230), width=2)
    draw.text((78, 508), "264 triangles before and after · only door-0's finish changed", fill=GREEN, font=font(21, True))
    draw.text((78, 545), "Steel doors; safety-painted plinth and vent accents remain.", fill=INK, font=font(19))
    draw.text((78, 585), "Local software render only; no simulation or hardware acceptance.", fill=INK, font=font(18, True))
    image.save(ROOT / "verification-card.png", optimize=True)


if __name__ == "__main__":
    audit_sheet()
    comparison_card()
