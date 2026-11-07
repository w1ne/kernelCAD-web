#!/usr/bin/env python3
"""Compose a short MP4 walkthrough from real before, after and preset renders."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
KIT = ROOT / "catalog/kits/construction-equipment"
PREVIEWS = KIT / "previews"
VARIANTS = BUNDLE / "high-visibility-variants"
FRAMES = BUNDLE / "frames"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
BG = "#101b24"
PANEL = "#1a2a35"
TEXT = "#f2f5f6"
MUTED = "#a9bbc4"
GOLD = "#f1bd42"
GREEN = "#78c7a3"


def font(size, bold=False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, size)


def base(title, subtitle):
    image = Image.new("RGB", (1280, 720), BG)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 1280, 10), fill=GOLD)
    draw.text((58, 35), title, fill=TEXT, font=font(31, True))
    draw.text((60, 84), subtitle, fill=MUTED, font=font(17))
    return image, draw


def tile(image, path, box, label):
    x0, y0, x1, y1 = box
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle(box, radius=14, fill=PANEL, outline="#344956", width=2)
    source = Image.open(path).convert("RGB")
    source.thumbnail((x1 - x0 - 24, y1 - y0 - 72), Image.Resampling.LANCZOS)
    image.paste(source, (x0 + (x1 - x0 - source.width) // 2, y0 + 12))
    draw.text((x0 + 16, y1 - 48), label, fill=TEXT, font=font(16, True))


def cover_frame():
    image, draw = base("Construction equipment quality promotion", "Existing kernelCAD assets · source parameters · named palettes · regenerated previews")
    draw.rounded_rectangle((58, 144, 1222, 654), radius=24, fill=PANEL, outline="#344956", width=2)
    previews = ["articulated-dump-truck", "concrete-pump-truck", "lowboy-equipment-trailer"]
    for i, asset_id in enumerate(previews):
        x = 86 + i * 372
        source = Image.open(PREVIEWS / f"{asset_id}.png").convert("RGB")
        source.thumbnail((338, 360), Image.Resampling.LANCZOS)
        image.paste(source, (x, 166))
        draw.text((x + 4, 542), asset_id.replace("-", " ").title(), fill=TEXT, font=font(17, True))
    draw.text((88, 602), "60 existing models · zero IDs added · material roles and two presets per asset", fill=GOLD, font=font(19, True))
    return image


def before_after_frame():
    image, draw = base("A trailer reads from its silhouette", "The same source ID before and after adding a sloped loading ramp and A-frame drawbar")
    tile(image, BUNDLE / "before/lowboy-equipment-trailer.png", (64, 145, 614, 650), "Before · one body finish")
    tile(image, PREVIEWS / "lowboy-equipment-trailer.png", (666, 145, 1216, 650), "After · steel, rubber and paint")
    draw.text((72, 676), "The promoted render is generated from the edited .kcad.ts source.", fill=MUTED, font=font(15))
    return image


def preset_frame():
    image, draw = base("Switch the palette from the indexed preset", "HighVisibility changes the equipment paint, exposed steel, tire rubber and cab glass")
    tile(image, PREVIEWS / "articulated-dump-truck.png", (64, 145, 614, 650), "Default material controls")
    tile(image, VARIANTS / "articulated-dump-truck.highVisibility.png", (666, 145, 1216, 650), "highVisibility preset")
    draw.text((72, 676), "The variant is exported from the catalog index preset values and rendered locally.", fill=MUTED, font=font(15))
    return image


def pump_frame():
    image, draw = base("Recognizable components carry the color", "Concrete pump truck · tapered hopper · folded boom · hydraulic cylinders · stabilizer feet")
    tile(image, PREVIEWS / "concrete-pump-truck.png", (72, 142, 612, 654), "Default · pump truck")
    tile(image, VARIANTS / "concrete-pump-truck.highVisibility.png", (668, 142, 1208, 654), "Preset · highVisibility")
    return image


def gallery_frame():
    image, draw = base("The kit keeps its 60 existing IDs", "Updated local previews cover paving, earthmoving, concrete work, formwork and site logistics")
    ids = sorted(path.name.removesuffix(".kcad.ts") for path in KIT.glob("*.kcad.ts"))
    cell_w, cell_h = 174, 72
    start_x, start_y = 62, 137
    for i, asset_id in enumerate(ids[:36]):
        col, row = i % 9, i // 9
        x, y = start_x + col * (cell_w + 7), start_y + row * (cell_h + 10)
        preview = Image.open(PREVIEWS / f"{asset_id}.png").convert("RGB")
        preview.thumbnail((cell_w - 4, 49), Image.Resampling.LANCZOS)
        image.paste(preview, (x + (cell_w - preview.width) // 2, y))
        draw.text((x + 4, y + 50), asset_id[:23], fill=TEXT, font=font(9))
    draw.text((64, 668), "36 representative previews shown · all 60 rendered and indexed", fill=GOLD, font=font(17, True))
    return image


def validation_frame():
    image, draw = base("Local verification", "Source replay, renderer, index, lint, catalog integration and generated pages")
    audit = json.loads((BUNDLE / "promotion-audit.json").read_text())
    lint = json.loads((BUNDLE / "catalog-eslint-status.json").read_text())
    tests = json.loads((BUNDLE / "catalog-test-status.json").read_text())
    pages = json.loads((BUNDLE / "catalog-pages-check.json").read_text())
    lint_status = lint.get("status", "PASS" if lint.get("passed") else "FAIL")
    test_status = tests.get("status", "PASS" if tests.get("passed") else "FAIL")
    rows = [
        ("Existing assets promoted", str(audit["assetsPromoted"])),
        ("Material controls / presets", f"{audit['materialControls']} controls · {audit['presetEntries']} preset entries"),
        ("Previews / indexed rows", f"{audit['previewsRendered']} / {audit['indexedRowsWithPreview']}"),
        ("Kit ESLint", lint_status),
        ("Catalog integration", test_status),
        ("Local catalog pages", f"{pages['pageAndPreviewPairs']} pairs · {'PASS' if pages['passed'] else 'FAIL'}"),
    ]
    y = 166
    for label, value in rows:
        draw.rounded_rectangle((76, y, 1204, y + 62), radius=11, fill=PANEL, outline="#344956", width=1)
        draw.text((98, y + 17), label, fill=GOLD, font=font(17, True))
        draw.text((620, y + 17), value, fill=GREEN if "PASS" in value or value == "PASS" else TEXT, font=font(17))
        y += 76
    draw.text((78, 650), "Branch-only evidence · no deployment, equipment operation or hardware acceptance claimed", fill=MUTED, font=font(14))
    return image


def main():
    required = ["promotion-audit.json", "catalog-eslint-status.json", "catalog-test-status.json", "catalog-pages-check.json"]
    if not all((BUNDLE / name).is_file() for name in required):
        raise SystemExit("run promotion audit, lint, catalog integration and page checks before capture")
    if not all((VARIANTS / f"{asset}.highVisibility.png").is_file() for asset in (
        "articulated-dump-truck", "concrete-pump-truck", "lowboy-equipment-trailer"
    )):
        raise SystemExit("render all three indexed highVisibility variants before capture")
    FRAMES.mkdir(parents=True, exist_ok=True)
    frames = [cover_frame(), before_after_frame(), preset_frame(), pump_frame(), gallery_frame(), validation_frame()]
    for i, frame in enumerate(frames, 1):
        frame.save(FRAMES / f"frame-{i:02d}.png", optimize=True)
    output = BUNDLE / "construction-equipment-quality-promotion.mp4"
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "1/4",
        "-i", str(FRAMES / "frame-%02d.png"), "-c:v", "libx264", "-r", "24",
        "-pix_fmt", "yuv420p", "-crf", "24", "-movflags", "+faststart", str(output),
    ], check=True)
    frames[0].save(BUNDLE / "poster.png", optimize=True)
    print(f"wrote {output}")


if __name__ == "__main__":
    main()
