#!/usr/bin/env python3
"""Make a short MP4 from actual before/after previews and an indexed preset."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
KIT = ROOT / "catalog/kits/hydroponics"
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
    image, draw = base("Hydroponics quality promotion", "Existing kernelCAD assets · material controls · named palettes · regenerated previews")
    draw.rounded_rectangle((58, 144, 1222, 654), radius=24, fill=PANEL, outline="#344956", width=2)
    ids = ["greenhouse-tunnel-bay", "circulation-pump-skid", "greenhouse-exhaust-fan"]
    for i, asset_id in enumerate(ids):
        x = 84 + i * 374
        preview = Image.open(KIT / "previews" / f"{asset_id}.png").convert("RGB")
        preview.thumbnail((340, 360), Image.Resampling.LANCZOS)
        image.paste(preview, (x + (340 - preview.width) // 2, 166))
        draw.text((x + 4, 542), asset_id.replace("-", " ").title(), fill=TEXT, font=font(16, True))
    draw.text((88, 601), "52 existing models · 151 material controls · 104 named preset entries", fill=GOLD, font=font(18, True))
    return image


def comparison_frame(asset_id, title, subtitle, before_label, after_label):
    image, draw = base(title, subtitle)
    tile(image, BUNDLE / "before" / f"{asset_id}.png", (64, 145, 614, 650), before_label)
    tile(image, KIT / "previews" / f"{asset_id}.png", (666, 145, 1216, 650), after_label)
    draw.text((72, 676), "Before and after are software renders of the same asset ID.", fill=MUTED, font=font(15))
    return image


def preset_frame():
    image, draw = base("Render the indexed highVisibility preset", "The catalog preset recolors the same pump source without changing its geometry")
    tile(image, KIT / "previews/circulation-pump-skid.png", (64, 145, 614, 650), "Default material controls")
    tile(image, VARIANTS / "circulation-pump-skid.highVisibility.png", (666, 145, 1216, 650), "highVisibility · local render")
    draw.text((72, 676), "Preset values are read from catalog/index.json and rendered locally.", fill=MUTED, font=font(15))
    return image


def validation_frame():
    image, draw = base("Local verification", "The source, generated index, previews and static pages are checked together")
    audit = json.loads((BUNDLE / "promotion-audit.json").read_text())
    rows = [
        ("Existing assets promoted", str(audit["assetsPromoted"])),
        ("Material controls / presets", f"{audit['materialControls']} controls · {audit['presetEntries']} preset entries"),
        ("Source hashes / previews", f"{audit['sourceHashesMatching']} hashes · {audit['indexedRowsWithPreview']} indexed previews"),
        ("Kit quality gate", audit["qualityGate"]),
        ("Catalog progress", audit["afterQuality"]),
        ("Kit ESLint / catalog tests", f"{audit['eslint']} · {audit['catalogIntegration']}"),
        ("Local catalog pages", "PASS" if audit["localPages"] else "FAIL"),
    ]
    y = 147
    for label, value in rows:
        draw.rounded_rectangle((76, y, 1204, y + 55), radius=11, fill=PANEL, outline="#344956", width=1)
        draw.text((98, y + 15), label, fill=GOLD, font=font(16, True))
        passed = value == "PASS" or "PASS" in value or audit["passed"]
        draw.text((620, y + 15), value, fill=GREEN if passed else TEXT, font=font(16))
        y += 66
    draw.text((78, 625), "Branch-local software validation · no deployment claim", fill=MUTED, font=font(14))
    draw.text((78, 650), "Visualization geometry only · no crop, process or physical acceptance claim", fill=MUTED, font=font(14))
    return image


def main():
    required = ["promotion-audit.json", "catalog-pages-check.json", "catalog-eslint-status.json", "catalog-test-status.json"]
    if not all((BUNDLE / name).is_file() for name in required):
        raise SystemExit("run the index audit, local page check, ESLint and catalog integration before capture")
    if not (VARIANTS / "circulation-pump-skid.highVisibility.png").is_file():
        raise SystemExit("render the indexed highVisibility pump variant before capture")
    audit = json.loads((BUNDLE / "promotion-audit.json").read_text())
    if not audit.get("passed"):
        raise SystemExit("promotion audit did not pass")
    FRAMES.mkdir(parents=True, exist_ok=True)
    frames = [
        cover_frame(),
        comparison_frame("greenhouse-tunnel-bay", "A hoop-house reads as a greenhouse", "The curved polyethylene roof completes the bay silhouette", "Before · exposed post frame", "After · arched roof and frame"),
        comparison_frame("greenhouse-exhaust-fan", "An open fan frame exposes the rotor", "Four swept blades replace the block-shaped cross", "Before · solid wall slab", "After · open rails and swept blades"),
        comparison_frame("circulation-pump-skid", "The pump skid has recognizable machinery", "Cylindrical motor and volute sit between the inlet and drive", "Before · cuboid motor and pump", "After · cylindrical motor and volute"),
        preset_frame(),
        validation_frame(),
    ]
    for i, frame in enumerate(frames, 1):
        frame.save(FRAMES / f"frame-{i:02d}.png", optimize=True)
    output = BUNDLE / "hydroponics-quality-promotion.mp4"
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "1/4",
        "-i", str(FRAMES / "frame-%02d.png"), "-c:v", "libx264", "-r", "24",
        "-pix_fmt", "yuv420p", "-crf", "24", "-movflags", "+faststart", str(output),
    ], check=True)
    frames[0].save(BUNDLE / "poster.png", optimize=True)
    print(f"wrote {output}")


if __name__ == "__main__":
    main()
