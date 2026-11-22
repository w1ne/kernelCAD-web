#!/usr/bin/env python3
"""Compose a short MP4 from actual before/after, preset, and kit preview renders."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
KIT = ROOT / "catalog/kits/water-treatment"
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
    image, draw = base("Water-treatment quality promotion", "Existing kernelCAD assets · editable material roles · named palettes · regenerated previews")
    draw.rounded_rectangle((58, 144, 1222, 654), radius=24, fill=PANEL, outline="#344956", width=2)
    ids = ["activated-carbon-filter-vessel", "circular-clarifier", "horizontal-split-case-pump"]
    for i, asset_id in enumerate(ids):
        x = 84 + i * 374
        preview = Image.open(KIT / "previews" / f"{asset_id}.png").convert("RGB")
        preview.thumbnail((340, 360), Image.Resampling.LANCZOS)
        image.paste(preview, (x + (340 - preview.width) // 2, 166))
        draw.text((x + 4, 542), asset_id.replace("-", " ").title(), fill=TEXT, font=font(16, True))
    draw.text((88, 601), "50 existing models · zero IDs added · 139 material controls · 100 preset entries", fill=GOLD, font=font(18, True))
    return image


def filter_frame():
    image, draw = base("A pressure vessel reads in its materials", "Same source ID · lofted shoulders · stainless process ports · structural supports")
    tile(image, BUNDLE / "before/activated-carbon-filter-vessel.png", (64, 145, 614, 650), "Before · one flat color")
    tile(image, KIT / "previews/activated-carbon-filter-vessel.png", (666, 145, 1216, 650), "After · coated steel, ports and feet")
    draw.text((72, 676), "The result is rendered from the updated .kcad.ts source.", fill=MUTED, font=font(15))
    return image


def lamella_frame():
    image, draw = base("Inclined plates define a lamella clarifier", "The solid plate-pack block becomes six angled plates carried by side rails")
    tile(image, BUNDLE / "before/lamella-clarifier.png", (64, 145, 614, 650), "Before · solid placeholder block")
    tile(image, KIT / "previews/lamella-clarifier.png", (666, 145, 1216, 650), "After · concrete, steel and sloped plates")
    draw.text((72, 676), "Inclination and visible support rails are authored in the model source.", fill=MUTED, font=font(15))
    return image


def preset_frame():
    image, draw = base("Render the indexed highVisibility preset", "The same pump source uses a different equipment-paint palette")
    tile(image, KIT / "previews/horizontal-split-case-pump.png", (64, 145, 614, 650), "Default source controls")
    tile(image, VARIANTS / "horizontal-split-case-pump.highVisibility.png", (666, 145, 1216, 650), "highVisibility · local render")
    draw.text((72, 676), "Preset values are read from catalog/index.json, then rendered locally.", fill=MUTED, font=font(15))
    return image


def gallery_frame():
    image, draw = base("The kit keeps its 50 existing IDs", "The regenerated local previews cover intake, treatment, filtration and monitoring equipment")
    ids = sorted(path.name.removesuffix(".kcad.ts") for path in KIT.glob("*.kcad.ts"))
    cell_w, cell_h = 110, 88
    start_x, start_y = 58, 137
    for i, asset_id in enumerate(ids):
        col, row = i % 10, i // 10
        x, y = start_x + col * (cell_w + 6), start_y + row * (cell_h + 9)
        preview = Image.open(KIT / "previews" / f"{asset_id}.png").convert("RGB")
        preview.thumbnail((cell_w - 6, 60), Image.Resampling.LANCZOS)
        image.paste(preview, (x + (cell_w - preview.width) // 2, y))
        draw.text((x + 2, y + 62), asset_id[:16], fill=TEXT, font=font(8))
    draw.text((61, 671), "50 rendered previews · every row has an indexed preview path", fill=GOLD, font=font(16, True))
    return image


def validation_frame():
    image, draw = base("Local verification", "Source quality, ESLint, catalog integration and generated page checks")
    audit = json.loads((BUNDLE / "promotion-audit.json").read_text())
    rows = [
        ("Existing assets promoted", str(audit["assetsPromoted"])),
        ("Material controls / presets", f"{audit['materialControls']} controls · {audit['presetEntries']} preset entries"),
        ("Previews / indexed rows", f"{audit['indexedRowsWithPreview']} / {audit['assetsPromoted']}"),
        ("Quality gate", audit["qualityGate"]),
        ("Kit ESLint", audit["eslint"]),
        ("Catalog integration", audit["catalogIntegration"]),
        ("Local catalog pages", "PASS" if audit["localPages"] else "FAIL"),
    ]
    y = 147
    for label, value in rows:
        draw.rounded_rectangle((76, y, 1204, y + 55), radius=11, fill=PANEL, outline="#344956", width=1)
        draw.text((98, y + 15), label, fill=GOLD, font=font(16, True))
        passed = value == "PASS" or value == "50/50 pass"
        draw.text((620, y + 15), value, fill=GREEN if passed else TEXT, font=font(16))
        y += 66
    draw.text((78, 625), "Branch-only renders and checks · no deployment or process-performance claim", fill=MUTED, font=font(14))
    draw.text((78, 650), "Visualization geometry only · no installation, regulatory or physical acceptance", fill=MUTED, font=font(14))
    return image


def main():
    required = ["promotion-audit.json", "catalog-pages-check.json", "catalog-eslint-status.json", "catalog-test-status.json"]
    if not all((BUNDLE / name).is_file() for name in required):
        raise SystemExit("run the audit, local page checks, ESLint and catalog integration before capture")
    if not (VARIANTS / "horizontal-split-case-pump.highVisibility.png").is_file():
        raise SystemExit("render the indexed highVisibility pump variant before capture")
    audit = json.loads((BUNDLE / "promotion-audit.json").read_text())
    if not audit.get("passed"):
        raise SystemExit("promotion audit did not pass")
    FRAMES.mkdir(parents=True, exist_ok=True)
    frames = [cover_frame(), filter_frame(), lamella_frame(), preset_frame(), gallery_frame(), validation_frame()]
    for i, frame in enumerate(frames, 1):
        frame.save(FRAMES / f"frame-{i:02d}.png", optimize=True)
    output = BUNDLE / "water-treatment-quality-promotion.mp4"
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "1/4",
        "-i", str(FRAMES / "frame-%02d.png"), "-c:v", "libx264", "-r", "24",
        "-pix_fmt", "yuv420p", "-crf", "24", "-movflags", "+faststart", str(output),
    ], check=True)
    frames[0].save(BUNDLE / "poster.png", optimize=True)
    print(f"wrote {output}")


if __name__ == "__main__":
    main()
