#!/usr/bin/env python3
"""Build local review slides for the mobile platform description correction."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BUNDLE = Path(__file__).resolve().parent
SLIDES = BUNDLE / "slides"
PREVIEWS = Path("catalog/kits")
WIDTH, HEIGHT = 1280, 720
BG, NAVY, TEXT, MUTED, WHITE = "#f0f4f8", "#203848", "#23313b", "#596a78", "#ffffff"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def font(size: int, bold: bool = False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT, size)


def base(title: str, eyebrow: str):
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    draw.text((54, 32), eyebrow.upper(), font=font(18, True), fill="#287c88")
    draw.text((54, 62), title, font=font(36, True), fill=NAVY)
    return image, draw


def footer(draw, text: str):
    draw.line((54, 674, WIDTH - 54, 674), fill="#cad3da", width=2)
    draw.text((54, 686), text, font=font(14), fill=MUTED)


def preview(kit: str, asset: str) -> Image.Image:
    return Image.open(PREVIEWS / kit / "previews" / f"{asset}.png").convert("RGB")


def save_audit_grid():
    image, draw = base("Five rendered industrial previews", "Semantic quality screen · 17 November 2026")
    items = [
        ("construction-equipment", "concrete-batch-plant", "Concrete batch plant"),
        ("grid-substation", "substation-gas-insulated-breaker-module", "GIS breaker module"),
        ("recycling-facility", "aerosol-can-safety-drum", "Aerosol-can safety drum"),
        ("mining", "mill-relining-machine", "Mill relining machine"),
        ("shipyard", "mobile-hull-access-platform", "Mobile hull access platform"),
    ]
    positions = [(60, 130), (460, 130), (860, 130), (260, 390), (660, 390)]
    for (kit, asset, label), (x, y) in zip(items, positions, strict=True):
        draw.rounded_rectangle((x, y, x + 360, y + 230), radius=12, fill=WHITE, outline="#d6dfe5", width=2)
        thumb = preview(kit, asset).resize((180, 180))
        image.paste(thumb, (x + 90, y + 4))
        box = draw.textbbox((0, 0), label, font=font(16, True))
        label_x = x + (360 - (box[2] - box[0])) / 2
        draw.text((label_x, y + 185), label, font=font(16, True), fill=TEXT)
        kit_label = kit.replace("-", " ")
        box = draw.textbbox((0, 0), kit_label, font=font(13))
        kit_x = x + (360 - (box[2] - box[0])) / 2
        draw.text((kit_x, y + 207), kit_label, font=font(13), fill=MUTED)
    footer(draw, "Local PNG previews from catalog/kits/*/previews · five samples opened and reviewed")
    image.save(SLIDES / "01-five-preview-audit.png")


def save_before_after():
    image, draw = base("A description claim now matches the model", "Shipyard · mobile hull access platform")
    same = preview("shipyard", "mobile-hull-access-platform").resize((400, 400))
    draw.rounded_rectangle((62, 130, 622, 610), radius=12, fill=WHITE, outline="#d6dfe5", width=2)
    draw.rounded_rectangle((658, 130, 1218, 610), radius=12, fill=WHITE, outline="#d6dfe5", width=2)
    image.paste(same, (142, 148))
    image.paste(same, (738, 148))
    draw.text((84, 166), "BEFORE", font=font(18, True), fill="#a24a37")
    draw.text((680, 166), "AFTER", font=font(18, True), fill="#287c58")
    draw.rounded_rectangle((83, 545, 602, 596), radius=8, fill="#fff0ec")
    draw.rounded_rectangle((679, 545, 1198, 596), radius=8, fill="#e9f5ed")
    draw.text((99, 560), "adjustable-height posts", font=font(20, True), fill=TEXT)
    draw.text((695, 560), "fixed-height support posts", font=font(20, True), fill=TEXT)
    footer(draw, "Preview pixels are unchanged: the source correction updates descriptive metadata only")
    image.save(SLIDES / "02-platform-before-after.png")


def save_checks():
    image, draw = base("Source, index, and regression check", "Local verification · software-rendered asset")
    rows = [
        ("Description", "Fixed-height support posts; no adjustment claim"),
        ("Published controls", "scale · yardPaint · structuralSteel · elastomer"),
        ("Mesh", "592 triangles / 1,800 budget"),
        ("Envelope", "1.785 × 1.355 × 1.385 m (X × Z(up) × Y)"),
        ("Index", "Regenerated from source; preview path retained"),
        ("Regression", "Focused catalog test and shipyard ESLint"),
    ]
    y = 150
    for label, value in rows:
        draw.rounded_rectangle((66, y, 1214, y + 66), radius=9, fill=WHITE, outline="#d6dfe5", width=1)
        draw.text((90, y + 19), label, font=font(19, True), fill=NAVY)
        draw.text((300, y + 20), value, font=font(18), fill=TEXT)
        y += 77
    draw.rounded_rectangle((66, 623, 1214, 660), radius=8, fill="#eaf0f5")
    draw.text((82, 632), "Local preview and checks only · branch not deployed · no safety or hardware acceptance", font=font(15, True), fill=MUTED)
    image.save(SLIDES / "03-catalog-checks.png")


if __name__ == "__main__":
    SLIDES.mkdir(parents=True, exist_ok=True)
    save_audit_grid()
    save_before_after()
    save_checks()
