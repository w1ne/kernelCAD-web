#!/usr/bin/env python3
"""Build the audit contact sheet and readable MP4 slides from retained renders."""
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
    ids = ["bale-ejector", "belt-conveyor-head", "biofilter-bed", "glass-breaker-screen", "mobile-compactor"]
    card_w, card_h = 490, 350
    sheet = Image.new("RGB", (card_w * 3, 790), BG)
    draw = ImageDraw.Draw(sheet)
    draw.text((35, 20), "Five recycling-facility previews · one mapping selected", fill=NAVY, font=font(27, True))
    outcomes = {
        "bale-ejector": "press, ram and bale read clearly",
        "belt-conveyor-head": "drive head and walkway read clearly",
        "biofilter-bed": "media bed and feed system read clearly",
        "glass-breaker-screen": "selected: flails bypassed wearSteel",
        "mobile-compactor": "hopper, ram and container read clearly",
    }
    for index, asset_id in enumerate(ids):
        row, col = divmod(index, 3)
        x, y = 25 + col * card_w, 82 + row * 350
        draw.rounded_rectangle((x, y, x + card_w - 18, y + card_h - 16), radius=12, fill=WHITE)
        draw.text((x + 15, y + 12), asset_id, fill=INK, font=font(18, True))
        paste_fit(sheet, ROOT / "previews" / "samples" / f"{asset_id}.png", (x + 14, y + 42, card_w - 48, 270))
        selected = asset_id == "glass-breaker-screen"
        draw.text((x + 15, y + card_h - 44), outcomes[asset_id], fill=ACCENT if selected else MUTED, font=font(13, selected))
    out = ROOT / "preview-review-five-assets.png"
    sheet.save(out)
    return out


def make_slide(title: str, subtitle: str, output: Path, image: Path | None = None, detail: str | None = None,
               right_image: Path | None = None) -> None:
    canvas = Image.new("RGB", (1280, 720), BG)
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, 1280, 94), fill=NAVY)
    draw.text((38, 20), title, fill=WHITE, font=font(30, True))
    draw.text((42, 112), subtitle, fill=INK, font=font(20, True))
    if image is not None and right_image is None:
        paste_fit(canvas, image, (70, 155, 1140, 470))
    elif image is not None and right_image is not None:
        paste_fit(canvas, image, (40, 160, 580, 440))
        paste_fit(canvas, right_image, (660, 160, 580, 440))
        draw.text((185, 600), "BEFORE", fill=MUTED, font=font(18, True))
        draw.text((830, 600), "AFTER", fill=ACCENT, font=font(18, True))
    if detail:
        draw.rounded_rectangle((48, 642, 1232, 700), radius=8, fill=WHITE)
        draw.text((66, 658), detail, fill=MUTED, font=font(16))
    canvas.save(output)


def make_regression_slide(output: Path) -> None:
    canvas = Image.new("RGB", (1280, 720), BG)
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, 1280, 94), fill=NAVY)
    draw.text((38, 20), "Exported-GLB regression", fill=WHITE, font=font(30, True))
    draw.text((58, 128), "Baseline source: fails flail material assignment", fill=ACCENT, font=font(23, True))
    draw.text((58, 174), "Corrected source: passes all assertions", fill=ACCENT, font=font(23, True))
    checks = [
        "2,988 triangles / 3,600 triangle budget",
        "4 editable material controls and 4 existing presets",
        "16 named flails belong to the wearSteel palette",
        "Exported flail vertex colors match #9aa2a7",
    ]
    for index, line in enumerate(checks):
        y = 245 + index * 57
        draw.rounded_rectangle((64, y, 1215, y + 43), radius=8, fill=WHITE)
        draw.text((86, y + 9), line, fill=INK, font=font(20))
    draw.rounded_rectangle((48, 642, 1232, 700), radius=8, fill=WHITE)
    draw.text((66, 658), "Focused test output is retained in verification/focused-test.txt.", fill=MUTED, font=font(16))
    canvas.save(output)


def main() -> None:
    slides = ROOT / "video-inputs"
    slides.mkdir(parents=True, exist_ok=True)
    audit = make_audit_sheet()
    make_slide("Five-preview audit", "One source-to-control material mismatch selected", slides / "slide-01-audit.png", audit,
               "The full glass-breaker thumbnail hides most of its rotor behind the housing.")
    make_slide("Catalog preview comparison", "The infeed, hooded breaker, screen deck and two outputs remain recognizable",
               slides / "slide-02-full-before-after.png", ROOT / "previews/before/glass-breaker-screen.png",
               "Same asset preview renderer and camera; the rotor color is subtle at thumbnail scale.",
               ROOT / "previews/after/glass-breaker-screen.png")
    make_slide("Rotor material comparison", "Former hard-coded dark flails compared with the editable wear-steel mapping",
               slides / "slide-03-rotor-detail.png", ROOT / "previews/rotor-detail/before-former-dark-flails.png",
               "Isolated exported-GLB rotor parts, same geometry and view; local software raster render.",
               ROOT / "previews/rotor-detail/after-editable-wear-steel.png")
    make_regression_slide(slides / "slide-04-regression.png")
    make_slide("Review result", "Local preview and exported-GLB material mapping only", slides / "slide-05-scope.png",
               ROOT / "previews/after/glass-breaker-screen.png",
               "Not post-deploy verification, process simulation or hardware acceptance.")


if __name__ == "__main__":
    main()
