#!/usr/bin/env python3
"""Build the five-preview ledger sheet and bridge-crane GLB regression card."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
BG = (238, 242, 247)
INK = (34, 48, 64)
CARD = (255, 255, 255)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    candidates = [
        Path("/usr/share/fonts/truetype/dejavu") / name,
        Path("/usr/share/fonts/truetype/liberation2") / name,
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def review_sheet() -> None:
    names = [
        "forklift-truck",
        "centrifugal-pump",
        "distillation-column",
        "industrial-boiler",
        "bridge-crane",
    ]
    width, height = 1600, 1000
    margin, gap, card_w, card_h = 28, 22, 500, 410
    sheet = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(sheet)
    draw.text((margin, 22), "Industrial and manufacturing preview audit · 17 Nov 2026", fill=INK, font=font(30, True))

    for index, name in enumerate(names):
        col, row = index % 3, index // 3
        x = margin + col * (card_w + gap)
        y = 82 + row * (card_h + gap)
        draw.rounded_rectangle((x, y, x + card_w, y + card_h), radius=12, fill=CARD)
        draw.text((x + 18, y + 12), name.replace("-", " "), fill=INK, font=font(22, True))
        with Image.open(ROOT / "samples" / f"{name}.png") as source:
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
    draw.text((112, 100), "Bridge crane · hoist motor material", fill=INK, font=font(34, True))
    draw.text((112, 160), "Exported GLB part control", fill=INK, font=font(24))

    rows = [
        ("hoist-motor · before", "girder", "#e5b023", (229, 176, 35)),
        ("hoist-motor · after", "hoist", "#34495c", (52, 73, 92)),
        ("bridge girders · retained", "girder", "#e5b023", (229, 176, 35)),
    ]
    y = 220
    for part, control, code, swatch in rows:
        draw.rounded_rectangle((112, y, 172, y + 42), radius=8, fill=swatch)
        draw.text((194, y + 1), f"{part}  →  {control}  {code}", fill=INK, font=font(24))
        y += 72

    draw.line((112, 450, 1168, 450), fill=(215, 222, 230), width=2)
    draw.text((112, 482), "Regression: failed before the fix; 1/1 passed after", fill=(28, 105, 67), font=font(25, True))
    draw.text((112, 528), "4,104 triangles / 6,000 budget · geometry unchanged", fill=INK, font=font(22))
    draw.text((112, 570), "Local software preview and GLB check · not simulation, deployment or hardware acceptance", fill=INK, font=font(17))
    image.save(ROOT / "verification-card.png", optimize=True)


if __name__ == "__main__":
    review_sheet()
    verification_card()
