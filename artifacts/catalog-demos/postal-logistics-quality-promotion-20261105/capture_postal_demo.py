#!/usr/bin/env python3
"""Build a short MP4 from actual local source renders and verification results."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BUNDLE = Path(__file__).resolve().parent
ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog/kits/postal-logistics"
FRAMES = BUNDLE / "frames"
TEXT = "#f1f4f5"
MUTED = "#aebcc4"
GOLD = "#e4bc66"
PANEL = "#1d2a33"
BG = "#101820"


def font(size: int, bold: bool = False):
    path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    return ImageFont.truetype(path, size)


def base(title: str, subtitle: str):
    image = Image.new("RGB", (1280, 720), BG)
    draw = ImageDraw.Draw(image)
    draw.text((58, 34), title, fill=TEXT, font=font(30, True))
    draw.text((60, 82), subtitle, fill=MUTED, font=font(16))
    draw.line((58, 116, 1222, 116), fill="#3a4b57", width=2)
    draw.text((60, 688), "kernelCAD local source + render checks · visualization only · no deployment or physical acceptance", fill=MUTED, font=font(13))
    return image, draw


def tile(image, path: Path, bounds: tuple[int, int, int, int], label: str):
    draw = ImageDraw.Draw(image)
    x0, y0, x1, y1 = bounds
    draw.rounded_rectangle(bounds, radius=16, fill=PANEL, outline="#344956", width=2)
    source = Image.open(path).convert("RGB")
    source.thumbnail((x1 - x0 - 28, y1 - y0 - 82), Image.Resampling.LANCZOS)
    image.paste(source, (x0 + (x1 - x0 - source.width) // 2, y0 + 12))
    draw.text((x0 + 16, y1 - 54), label, fill=TEXT, font=font(16, True))


def cover_frame():
    image, draw = base("Postal logistics quality promotion", "52 existing kernelCAD assets · material controls · named finish presets · refreshed previews")
    ids = ["automated-label-applicator", "carrier-satchel", "sorting-operator-console"]
    for i, asset_id in enumerate(ids):
        x = 64 + i * 386
        preview = Image.open(KIT / "previews" / f"{asset_id}.png").convert("RGB")
        preview.thumbnail((340, 390), Image.Resampling.LANCZOS)
        image.paste(preview, (x + (340 - preview.width) // 2, 143))
        draw.text((x + 4, 552), asset_id.replace("-", " ").title(), fill=TEXT, font=font(16, True))
    draw.text((72, 614), "0 new IDs · 166 material controls · 104 named preset values", fill=GOLD, font=font(19, True))
    return image


def applicator_frame():
    image, draw = base("The label applicator gains material contrast", "Same asset ID · separate frame, process head, label stock, and round rollers")
    tile(image, BUNDLE / "before/automated-label-applicator.png", (64, 145, 614, 650), "Before · one asset color")
    tile(image, KIT / "previews/automated-label-applicator.png", (666, 145, 1216, 650), "After · local regenerated preview")
    return image


def satchel_frame():
    image, draw = base("A satchel reads through its outline and materials", "Tapered fabric body · sloped flap · front straps · metal buckles")
    tile(image, BUNDLE / "before/carrier-satchel.png", (64, 145, 614, 650), "Before · block body")
    tile(image, KIT / "previews/carrier-satchel.png", (666, 145, 1216, 650), "After · tapered body and fabric palette")
    return image


def preset_frame():
    image, draw = base("Switch the indexed highVisibility preset", "The same powered roller conveyor source with a second equipment finish")
    tile(image, KIT / "previews/powered-roller-conveyor.png", (64, 145, 614, 650), "Default material controls")
    tile(image, BUNDLE / "high-visibility-variants/powered-roller-conveyor.highVisibility.png", (666, 145, 1216, 650), "highVisibility · locally rendered")
    return image


def gallery_frame():
    image, draw = base("All 52 existing assets have fresh previews", "Induction, scanning, sortation, mail handling, route preparation, and dispatch")
    ids = sorted(path.name.removesuffix(".kcad.ts") for path in KIT.glob("*.kcad.ts"))
    cell_w, cell_h = 140, 70
    start_x, start_y = 57, 132
    for i, asset_id in enumerate(ids):
        col, row = i % 8, i // 8
        x, y = start_x + col * (cell_w + 6), start_y + row * (cell_h + 4)
        preview = Image.open(KIT / "previews" / f"{asset_id}.png").convert("RGB")
        preview.thumbnail((cell_w - 8, 48), Image.Resampling.LANCZOS)
        image.paste(preview, (x + (cell_w - preview.width) // 2, y))
        draw.text((x + 2, y + 49), asset_id[:19], fill=TEXT, font=font(8))
    draw.text((61, 663), "52/52 preview PNGs indexed in the regenerated catalog", fill=GOLD, font=font(17, True))
    return image


def validation_frame():
    image, draw = base("Local verification", "Source quality, ESLint, catalog integration, source hashes, and local pages")
    audit = json.loads((BUNDLE / "promotion-audit.json").read_text())
    eslint = json.loads((BUNDLE / "catalog-eslint-status.json").read_text())
    tests = json.loads((BUNDLE / "catalog-test-status.json").read_text())
    pages = json.loads((BUNDLE / "catalog-pages-check.json").read_text())
    rows = [
        ("Promoted source IDs", f"{audit['assets']} · added 0"),
        ("Material controls / preset values", "166 · 104"),
        ("Source hashes / indexed previews", f"{audit['indexedSourceHashesMatch']}/52 · {audit['indexedPreviewsExist']}/52"),
        ("Kit quality gate", audit["kitQualityGate"].upper()),
        ("Kit ESLint", "PASS" if eslint["exitCode"] == 0 else "FAIL"),
        ("Catalog integration", f"{tests['summary']}"),
        ("Locally generated pages", "PASS" if pages["passed"] else "FAIL"),
    ]
    y = 137
    for label, value in rows:
        draw.rounded_rectangle((76, y, 1204, y + 54), radius=11, fill=PANEL, outline="#344956", width=1)
        draw.text((98, y + 14), label, fill=GOLD, font=font(16, True))
        draw.text((620, y + 14), value, fill=TEXT, font=font(16))
        y += 62
    draw.text((78, 590), "Branch-only source and rendering checks · production update remains pending integration", fill=MUTED, font=font(14))
    draw.text((78, 616), "Stylized visualization only · no throughput, safety, or physical-acceptance claim", fill=MUTED, font=font(14))
    return image


def main():
    required = ["promotion-audit.json", "catalog-eslint-status.json", "catalog-test-status.json", "catalog-pages-check.json"]
    if not all((BUNDLE / name).is_file() for name in required):
        raise SystemExit("run the audit, local page check, kit ESLint, and catalog integration before capture")
    if not json.loads((BUNDLE / "promotion-audit.json").read_text()).get("passed"):
        raise SystemExit("promotion audit did not pass")
    if not json.loads((BUNDLE / "catalog-pages-check.json").read_text()).get("passed"):
        raise SystemExit("local catalog pages did not pass")
    if not (BUNDLE / "high-visibility-variants/powered-roller-conveyor.highVisibility.png").is_file():
        raise SystemExit("render the indexed highVisibility preset before capture")
    FRAMES.mkdir(parents=True, exist_ok=True)
    frames = [cover_frame(), applicator_frame(), satchel_frame(), preset_frame(), gallery_frame(), validation_frame()]
    for i, frame in enumerate(frames, 1):
        frame.save(FRAMES / f"frame-{i:02d}.png", optimize=True)
    output = BUNDLE / "postal-logistics-quality-promotion.mp4"
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "1/4",
        "-i", str(FRAMES / "frame-%02d.png"), "-c:v", "libx264", "-r", "24",
        "-pix_fmt", "yuv420p", "-crf", "24", "-movflags", "+faststart", str(output),
    ], check=True)
    frames[0].save(BUNDLE / "poster.png", optimize=True)
    print(f"wrote {output}")


if __name__ == "__main__":
    main()
