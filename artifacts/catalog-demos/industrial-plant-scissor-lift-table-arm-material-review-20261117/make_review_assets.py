#!/usr/bin/env python3
"""Build the five-preview ledger sheet, source mapping card, and MP4 slides."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parent
BG = (238, 242, 247)
INK = (34, 48, 64)
MUTED = (91, 106, 121)
CARD = (255, 255, 255)
STEEL = (109, 124, 130)
PAINT = (230, 163, 62)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    for candidate in (
        Path("/usr/share/fonts/truetype/dejavu") / name,
        Path("/usr/share/fonts/truetype/liberation2") / name,
    ):
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def preview_card(name: str) -> Image.Image:
    source = Image.open(ROOT / "samples" / f"{name}.png").convert("RGB")
    source.thumbnail((490, 310), Image.Resampling.LANCZOS)
    card = Image.new("RGB", (520, 360), CARD)
    draw = ImageDraw.Draw(card)
    draw.text((18, 12), name.replace("-", " "), fill=INK, font=font(21, True))
    card.paste(source, ((520 - source.width) // 2, 42 + (300 - source.height) // 2))
    return card


def review_sheet() -> Image.Image:
    names = [
        "plate-heat-exchanger",
        "maintenance-platform",
        "scissor-lift-table",
        "burner-management-skid",
        "mobile-tool-cart",
    ]
    sheet = Image.new("RGB", (1640, 900), BG)
    draw = ImageDraw.Draw(sheet)
    draw.text((32, 24), "Industrial and manufacturing preview audit · 17 Nov 2026", fill=INK, font=font(30, True))
    for index, name in enumerate(names):
        col, row = index % 3, index // 3
        x, y = 32 + col * 536, 84 + row * 390
        sheet.paste(preview_card(name), (x, y))
    sheet.save(ROOT / "preview-review-five-assets.png", optimize=True)
    return sheet


def verification_card() -> Image.Image:
    image = Image.new("RGB", (1280, 720), BG)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((70, 54, 1210, 666), radius=22, fill=CARD)
    draw.text((110, 88), "Scissor lift table · arm material mapping", fill=INK, font=font(34, True))
    draw.text((110, 146), "Only the two matched B-arm assignments change", fill=MUTED, font=font(22))

    rows = [
        ("scissor-arm-a pair", "steel", "#6d7c82", STEEL, "steel", "#6d7c82", STEEL),
        ("scissor-arm-b pair", "safetyPaint", "#e6a33e", PAINT, "steel", "#6d7c82", STEEL),
        ("platform deck", "safetyPaint", "#e6a33e", PAINT, "safetyPaint", "#e6a33e", PAINT),
    ]
    y = 210
    for part, before_control, before_hex, before_color, after_control, after_hex, after_color in rows:
        draw.text((110, y + 8), part, fill=INK, font=font(22, True))
        draw.rounded_rectangle((465, y, 518, y + 40), radius=7, fill=before_color)
        draw.text((532, y + 4), f"{before_control} {before_hex}", fill=INK, font=font(18))
        draw.text((786, y + 1), "→", fill=MUTED, font=font(28, True))
        draw.rounded_rectangle((830, y, 883, y + 40), radius=7, fill=after_color)
        draw.text((897, y + 4), f"{after_control} {after_hex}", fill=INK, font=font(18))
        y += 78

    draw.line((110, 455, 1170, 455), fill=(215, 222, 230), width=2)
    draw.text((110, 485), "GLB material regression: baseline fails; 1/1 passes after", fill=(28, 105, 67), font=font(24, True))
    draw.text((110, 530), "196 triangles / 1,400 budget · geometry and preset controls unchanged", fill=INK, font=font(21))
    draw.text((110, 588), "Local software preview and GLB check · not simulation, deployment or hardware acceptance", fill=MUTED, font=font(16))
    image.save(ROOT / "verification-card.png", optimize=True)
    return image


def video_slide(title: str, caption: str, artwork: Image.Image, path: Path) -> None:
    slide = Image.new("RGB", (1280, 720), BG)
    draw = ImageDraw.Draw(slide)
    draw.text((32, 22), title, fill=INK, font=font(30, True))
    artwork = artwork.convert("RGB")
    artwork.thumbnail((1216, 570), Image.Resampling.LANCZOS)
    slide.paste(artwork, ((1280 - artwork.width) // 2, 76 + (570 - artwork.height) // 2))
    draw.rectangle((0, 660, 1280, 720), fill=(255, 255, 255))
    draw.text((30, 677), caption, fill=INK, font=font(19))
    slide.save(path, optimize=True)


def make_video_slides(sheet: Image.Image, card: Image.Image) -> None:
    slides = ROOT / "video-review"
    slides.mkdir(exist_ok=True)
    before = Image.open(ROOT / "before" / "scissor-lift-table.png")
    after = Image.open(ROOT / "after" / "scissor-lift-table.png")
    before_preview = Image.new("RGB", (900, 540), CARD)
    before.thumbnail((850, 500), Image.Resampling.LANCZOS)
    before_preview.paste(before, ((900 - before.width) // 2, (540 - before.height) // 2))
    after_preview = Image.new("RGB", (900, 540), CARD)
    after.thumbnail((850, 500), Image.Resampling.LANCZOS)
    after_preview.paste(after, ((900 - after.width) // 2, (540 - after.height) // 2))

    video_slide("Catalog preview review", "Five existing industrial assets checked; one material assignment selected.", sheet, slides / "slide-01.png")
    video_slide("Before · scissor-lift table", "Matched arm pairs split between steel and safety paint.", before_preview, slides / "slide-02.png")
    video_slide("After · scissor-lift table", "All four structural arms use steel; the platform remains safety-painted.", after_preview, slides / "slide-03.png")
    video_slide("Exported GLB regression", "Baseline fails; the corrected model passes 1/1 material checks.", card, slides / "slide-04.png")
    video_slide("Local result", "Software preview only · not simulation, deployed behavior, or hardware acceptance.", after_preview, slides / "slide-05.png")


if __name__ == "__main__":
    sheet = review_sheet()
    card = verification_card()
    make_video_slides(sheet, card)
