#!/usr/bin/env python3
"""Build a short local workflow demo from real catalog renders and variants."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
KIT = ROOT / "catalog/kits/hydroponics"
BEFORE = BUNDLE / "before"
VARIANTS = BUNDLE / "variants"
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
    image, draw = base("Hydroponics asset refinement", "Two existing kernelCAD models · material knobs · presets and real geometry variants")
    draw.rounded_rectangle((58, 144, 1222, 654), radius=24, fill=PANEL, outline="#344956", width=2)
    ids = ["greenhouse-tunnel-bay", "wall-mounted-co2-sensor", "greenhouse-climate-sensor-post"]
    for i, asset_id in enumerate(ids):
        x = 78 + i * 378
        preview = Image.open(KIT / "previews" / f"{asset_id}.png").convert("RGB")
        preview.thumbnail((344, 360), Image.Resampling.LANCZOS)
        image.paste(preview, (x + (344 - preview.width) // 2, 164))
        draw.text((x + 5, 538), asset_id.replace("-", " ").title(), fill=TEXT, font=font(15, True))
    draw.text((88, 596), "52 existing assets · 2 refinements · zero new IDs", fill=GOLD, font=font(19, True))
    return image


def comparison_frame(asset_id, title, subtitle, before_label, after_label):
    image, draw = base(title, subtitle)
    tile(image, BEFORE / f"{asset_id}.png", (64, 145, 614, 650), before_label)
    tile(image, KIT / "previews" / f"{asset_id}.png", (666, 145, 1216, 650), after_label)
    draw.text((72, 676), "Before and after are software renders of the same existing catalog ID.", fill=MUTED, font=font(15))
    return image


def variant_frame(asset_id, variant_file, title, subtitle, default_label, variant_label):
    image, draw = base(title, subtitle)
    tile(image, KIT / "previews" / f"{asset_id}.png", (64, 145, 614, 650), default_label)
    tile(image, VARIANTS / variant_file, (666, 145, 1216, 650), variant_label)
    draw.text((72, 676), "The alternate render uses preset values and a declared choice from the regenerated index.", fill=MUTED, font=font(15))
    return image


def validation_frame():
    image, draw = base("Local verification", "Catalog sources, previews, hashes, lint and integration checks")
    audit = json.loads((BUNDLE / "promotion-audit.json").read_text())
    rows = [
        ("Existing IDs refined", str(audit["assetsRefined"])),
        ("Hydroponics quality gate", audit["kitQuality"]),
        ("Catalog quality", audit["overallQuality"]),
        ("Kit source hashes / previews", f"{audit['sourceHashesMatching']} / {audit['indexedRowsWithPreview']}"),
        ("Kit ESLint", audit["eslint"]),
        ("Catalog integration", f"{audit['catalogIntegration']} · {audit['catalogIntegrationTestCount']} tests"),
    ]
    y = 157
    for label, value in rows:
        draw.rounded_rectangle((76, y, 1204, y + 62), radius=11, fill=PANEL, outline="#344956", width=1)
        draw.text((98, y + 18), label, fill=GOLD, font=font(16, True))
        draw.text((620, y + 18), value, fill=GREEN if "PASS" in value else TEXT, font=font(16))
        y += 72
    draw.text((78, 612), "Branch-local software validation · not deployed", fill=MUTED, font=font(14))
    draw.text((78, 638), "Visualization geometry only · no sensor or physical acceptance claim", fill=MUTED, font=font(14))
    return image


def main():
    required = ["promotion-audit.json", "variant-settings.json", "catalog-eslint-output.txt", "catalog-test-output.txt"]
    if not all((BUNDLE / name).is_file() for name in required):
        raise SystemExit("run source/index audit, ESLint and catalog integration before capture")
    if not (VARIANTS / "greenhouse-tunnel-bay.highVisibility-sideCurtains.png").is_file():
        raise SystemExit("render the indexed tunnel preset/choice variant before capture")
    if not (VARIANTS / "wall-mounted-co2-sensor.weathered-display.png").is_file():
        raise SystemExit("render the indexed sensor preset/choice variant before capture")
    audit = json.loads((BUNDLE / "promotion-audit.json").read_text())
    if not audit.get("passed"):
        raise SystemExit("catalog refinement audit did not pass")
    FRAMES.mkdir(parents=True, exist_ok=True)
    frames = [
        cover_frame(),
        comparison_frame("greenhouse-tunnel-bay", "A tunnel reads as a polytunnel", "Round hoops, ridge rail, film, timber bed rails, crop beds and a hinged end door", "Previous catalog preview", "Refined default · rolled sides"),
        variant_frame("greenhouse-tunnel-bay", "greenhouse-tunnel-bay.highVisibility-sideCurtains.png", "Change the tunnel's look and ventilation", "High visibility preset + closed side curtains", "Galvanised · rolled up", "High visibility · closed"),
        comparison_frame("wall-mounted-co2-sensor", "The transmitter has a readable instrument face", "LCD, status LED, calibration buttons, vent grille, wall plate and lower conduit", "Previous catalog preview", "Refined default · LCD"),
        variant_frame("wall-mounted-co2-sensor", "wall-mounted-co2-sensor.weathered-display.png", "Choose the sensor face and material look", "Weathered preset + blind display option", "Standard · LCD", "Weathered · blind"),
        validation_frame(),
    ]
    for i, frame in enumerate(frames, 1):
        frame.save(FRAMES / f"frame-{i:02d}.png", optimize=True)
    output = BUNDLE / "hydroponics-detail-refinement.mp4"
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "1/4",
        "-i", str(FRAMES / "frame-%02d.png"), "-c:v", "libx264", "-r", "24",
        "-pix_fmt", "yuv420p", "-crf", "24", "-movflags", "+faststart", str(output),
    ], check=True)
    frames[0].save(BUNDLE / "poster.png", optimize=True)
    print(f"wrote {output}")


if __name__ == "__main__":
    main()
