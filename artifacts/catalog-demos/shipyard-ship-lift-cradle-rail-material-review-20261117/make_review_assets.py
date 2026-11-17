#!/usr/bin/env python3
"""Create the five-preview sheet and the source/verification cards for the MP4."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
BG = (238, 242, 247)
INK = (34, 48, 64)
CARD = (255, 255, 255)
MUTED = (96, 111, 126)
GREEN = (28, 105, 67)
RED = (160, 58, 58)


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


def fitted(path: Path, size: tuple[int, int]) -> Image.Image:
    image = Image.open(path).convert("RGB")
    image.thumbnail(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", size, (239, 244, 249))
    canvas.paste(image, ((size[0] - image.width) // 2, (size[1] - image.height) // 2))
    return canvas


def contact_sheet() -> None:
    image = Image.new("RGB", (1280, 720), BG)
    draw = ImageDraw.Draw(image)
    draw.text((48, 28), "Five rendered shipyard catalog previews", fill=INK, font=font(30, True))
    entries = [
        ("ship-lift-cradle-before.png", "Transfer cradle · before"),
        ("shipyard-block-transporter.png", "SPMT"),
        ("plate-rolling-machine.png", "Plate rolling machine"),
        ("weld-fit-up-table.png", "Weld fit-up table"),
        ("pipe-spool-rotator.png", "Pipe spool rotator"),
    ]
    positions = [(48, 84), (450, 84), (852, 84), (249, 398), (651, 398)]
    for (filename, label), (x, y) in zip(entries, positions, strict=True):
        draw.rounded_rectangle((x, y, x + 380, y + 276), radius=14, fill=CARD)
        preview = fitted(ROOT / "samples" / filename, (360, 220))
        image.paste(preview, (x + 10, y + 10))
        draw.text((x + 18, y + 238), label, fill=INK, font=font(18, True))
    image.save(ROOT / "samples" / "five-preview-contact-sheet.png", optimize=True)


def source_mapping_card() -> None:
    image = Image.new("RGB", (1280, 720), BG)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((52, 46, 1228, 652), radius=24, fill=CARD)
    draw.text((92, 78), "One material mapping changed", fill=INK, font=font(34, True))
    draw.text((92, 140), "Before · paired side rails had different finishes", fill=RED, font=font(23, True))
    draw.rounded_rectangle((92, 184, 1188, 300), radius=12, fill=(248, 240, 240))
    draw.text((126, 206), "side-rail-0  →  yardPaint         #76847b", fill=INK, font=font(24))
    draw.text((126, 252), "side-rail-1  →  structuralSteel   #b6c1c4", fill=INK, font=font(24))
    draw.text((92, 334), "After · the pair shares the existing yard finish", fill=GREEN, font=font(23, True))
    draw.rounded_rectangle((92, 378, 1188, 494), radius=12, fill=(235, 246, 238))
    draw.text((126, 400), "side-rail-0  →  yardPaint         #76847b", fill=INK, font=font(24))
    draw.text((126, 446), "side-rail-1  →  yardPaint         #76847b", fill=INK, font=font(24))
    draw.text((92, 534), "Cross ties and guide rollers keep the structuralSteel control.", fill=MUTED, font=font(19))
    image.save(ROOT / "source-mapping.png", optimize=True)


def verification_card() -> None:
    focused = (ROOT / "verification" / "focused-test.txt").read_text(encoding="utf-8")
    eslint = (ROOT / "verification" / "eslint.txt").read_text(encoding="utf-8")
    index_check = (ROOT / "verification" / "index-check.json").read_text(encoding="utf-8")
    if "1 passed" not in focused or eslint.strip():
        raise SystemExit("focused regression or ESLint evidence is not passing")
    if '"sourceHashMatches": true' not in index_check or '"previewExists": true' not in index_check:
        raise SystemExit("generated index freshness evidence is not passing")

    image = Image.new("RGB", (1280, 720), BG)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((56, 44, 1224, 658), radius=24, fill=CARD)
    draw.text((96, 78), "Local verification", fill=INK, font=font(34, True))
    rows = [
        ("Exported-GLB regression", "1 / 1 passed", GREEN),
        ("Generated catalog index", "source hash matches · preview path exists", GREEN),
        ("Default mesh", "396 triangles / 1,800 budget", INK),
        ("Envelope", "3.00 × 0.78 × 1.83 m · unchanged", INK),
    ]
    y = 160
    for label, value, color in rows:
        draw.text((98, y), label, fill=MUTED, font=font(21))
        draw.text((490, y), value, fill=color, font=font(22, True))
        y += 72
    draw.line((98, 470, 1180, 470), fill=(215, 222, 230), width=2)
    draw.text((98, 500), "Local source, software preview, and GLB regression only.", fill=INK, font=font(20, True))
    draw.text((98, 540), "No deployment, simulation, or hardware acceptance is shown.", fill=MUTED, font=font(19))
    image.save(ROOT / "verification-card.png", optimize=True)


if __name__ == "__main__":
    contact_sheet()
    source_mapping_card()
    verification_card()
