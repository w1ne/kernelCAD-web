#!/usr/bin/env python3
"""Build the five-preview audit sheet and MP4 slide images from retained renders."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
NAVY = (28, 43, 60)
INK = (36, 49, 64)
MUTED = (86, 101, 118)
BG = (238, 242, 247)
WHITE = (255, 255, 255)
ACCENT = (43, 125, 132)


def font(size: int, bold: bool = False):
    path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def paste_fit(canvas: Image.Image, image_path: Path, box: tuple[int, int, int, int]) -> None:
    image = Image.open(image_path).convert("RGB")
    image.thumbnail((box[2], box[3]), Image.Resampling.LANCZOS)
    x = box[0] + (box[2] - image.width) // 2
    y = box[1] + (box[3] - image.height) // 2
    canvas.paste(image, (x, y))


def make_audit_sheet() -> Path:
    ids = [
        "activated-carbon-filter-vessel",
        "equalization-basin",
        "sodium-hypochlorite-cabinet",
        "bar-screen-channel",
        "membrane-filtration-rack",
    ]
    card_w, card_h = 490, 350
    sheet = Image.new("RGB", (card_w * 3, 790), BG)
    draw = ImageDraw.Draw(sheet)
    draw.text((35, 20), "Five water-treatment previews · one material mapping selected", fill=NAVY, font=font(27, True))
    for index, asset_id in enumerate(ids):
        row, col = divmod(index, 3)
        x, y = 25 + col * card_w, 82 + row * 350
        draw.rounded_rectangle((x, y, x + card_w - 18, y + card_h - 16), radius=12, fill=WHITE)
        draw.text((x + 15, y + 12), asset_id, fill=INK, font=font(18, True))
        paste_fit(sheet, ROOT / "previews" / "samples" / f"{asset_id}.png", (x + 14, y + 42, card_w - 48, 270))
        label = "selected: basin floor and mixer finishes reversed" if asset_id == "equalization-basin" else "recognizable industrial silhouette; no selected mismatch"
        draw.text((x + 15, y + card_h - 44), label, fill=ACCENT if asset_id == "equalization-basin" else MUTED, font=font(13, asset_id == "equalization-basin"))
    out = ROOT / "preview-review-five-assets.png"
    sheet.save(out)
    return out


def make_slide(title: str, subtitle: str, picture: Path, output: Path, detail: str | None = None) -> None:
    canvas = Image.new("RGB", (1280, 720), BG)
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, 1280, 94), fill=NAVY)
    draw.text((38, 20), title, fill=WHITE, font=font(30, True))
    draw.text((42, 112), subtitle, fill=INK, font=font(20, True))
    paste_fit(canvas, picture, (60, 150, 1160, 490))
    if detail:
        draw.rounded_rectangle((48, 642, 1232, 700), radius=8, fill=WHITE)
        draw.text((66, 658), detail, fill=MUTED, font=font(16))
    canvas.save(output)


def main() -> None:
    slides = ROOT / "video-inputs"
    slides.mkdir(parents=True, exist_ok=True)
    audit = make_audit_sheet()
    before = ROOT / "previews" / "before" / "equalization-basin.png"
    after = ROOT / "previews" / "after" / "equalization-basin.png"
    make_slide(
        "Five-preview audit",
        "Water-treatment assets reviewed; one material mapping selected",
        audit,
        slides / "slide-01-audit.png",
        "The source assigned stainless steel to the concrete basin floor.",
    )
    make_slide(
        "Baseline preview",
        "Basin slab renders apart from its concrete walls; mixer uses the concrete finish",
        before,
        slides / "slide-02-before.png",
        "The regression fails on the baseline floor and mixer part assignments.",
    )
    make_slide(
        "Corrected preview",
        "Concrete basin structure; stainless-steel mixer assembly",
        after,
        slides / "slide-03-after.png",
        "224 triangles / 2,200 budget · local software preview render.",
    )
    make_slide(
        "Exported-GLB regression",
        "Checks floor and walls as concrete; mixer pedestal, arm and hub as stainless steel",
        after,
        slides / "slide-04-regression.png",
        "The regression failed on baseline source and passed after the correction.",
    )
    make_slide(
        "Review result",
        "Local software rendering and material regression only",
        after,
        slides / "slide-05-scope.png",
        "Not a process simulation, deployed-page check, treatment-performance claim, or hardware acceptance.",
    )


if __name__ == "__main__":
    main()
