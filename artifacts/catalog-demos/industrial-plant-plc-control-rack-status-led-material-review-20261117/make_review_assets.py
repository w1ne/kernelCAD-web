#!/usr/bin/env python3
"""Build the five-preview sheet and GLB verification card for this review."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
BG = (238, 242, 247)
INK = (34, 48, 64)
CARD = (255, 255, 255)


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


def review_sheet() -> None:
    names = [
        "pallet-rack-bay",
        "plc-control-rack",
        "electric-pallet-jack",
        "vertical-storage-tank",
        "diesel-generator-set",
    ]
    width, height = 1600, 1000
    margin, gap, card_w, card_h = 28, 22, 500, 410
    sheet = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(sheet)
    draw.text((margin, 22), "Industrial preview audit · 17 Nov 2026", fill=INK, font=font(30, True))

    for index, name in enumerate(names):
        col, row = index % 3, index // 3
        x = margin + col * (card_w + gap)
        y = 82 + row * (card_h + gap)
        draw.rounded_rectangle((x, y, x + card_w, y + card_h), radius=12, fill=CARD)
        draw.text((x + 18, y + 12), name.replace("-", " "), fill=INK, font=font(22, True))
        with Image.open(ROOT / "samples" / name / f"{name}.png") as source:
            preview = source.convert("RGB")
        preview.thumbnail((card_w - 36, card_h - 62), Image.Resampling.LANCZOS)
        px = x + (card_w - preview.width) // 2
        py = y + 48 + (card_h - 54 - preview.height) // 2
        sheet.paste(preview, (px, py))

    sheet.save(ROOT / "preview-review-five-assets.png", optimize=True)


def verification_card() -> None:
    image = Image.new("RGB", (1280, 720), BG)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((70, 60, 1210, 660), radius=24, fill=CARD)
    draw.text((112, 100), "PLC rack · status LED material regression", fill=INK, font=font(34, True))
    draw.text((112, 160), "Exported GLB part-color mapping", fill=INK, font=font(24))

    rows = [
        ("channel + RUN lens", "channelLed / runLed", "#4faf6e", (79, 175, 110)),
        ("ERROR lens", "errorLed", "#8a4449", (138, 68, 73)),
        ("rack + seven module housings", "steel", "#667984", (102, 121, 132)),
    ]
    y = 220
    for part, control, code, swatch in rows:
        draw.rounded_rectangle((112, y, 172, y + 42), radius=8, fill=swatch)
        draw.text((194, y + 1), f"{part}  →  {control}  {code}", fill=INK, font=font(24))
        y += 72

    draw.line((112, 450, 1168, 450), fill=(215, 222, 230), width=2)
    draw.text((112, 482), "Focused exported-GLB regression: 1/1 passed", fill=(28, 105, 67), font=font(27, True))
    draw.text((112, 528), "384 triangles / 1,400 budget · geometry unchanged", fill=INK, font=font(22))
    draw.text((112, 570), "Local preview and software regression only · no simulation or hardware acceptance", fill=INK, font=font(18))
    image.save(ROOT / "verification-card.png", optimize=True)


if __name__ == "__main__":
    review_sheet()
    verification_card()
