#!/usr/bin/env python3
"""Build a short local demo from the actual mining before/after previews."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
KIT = ROOT / "catalog/kits/mining"
VARIANTS = BUNDLE / "high-visibility-variants"
FRAMES = BUNDLE / "frames"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
BG, PANEL, TEXT, MUTED = "#101b24", "#1a2a35", "#f2f5f6", "#a9bbc4"
GOLD, GREEN = "#f1bd42", "#78c7a3"


def font(size, bold=False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, size)


def base(title, subtitle):
    image = Image.new("RGB", (1280, 720), BG)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 1280, 10), fill=GOLD)
    draw.text((58, 35), title, fill=TEXT, font=font(31, True))
    draw.text((60, 84), subtitle, fill=MUTED, font=font(17))
    return image, draw


def tile(image, path, bounds, label):
    x0, y0, x1, y1 = bounds
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle(bounds, radius=14, fill=PANEL, outline="#344956", width=2)
    source = Image.open(path).convert("RGB")
    source.thumbnail((x1 - x0 - 24, y1 - y0 - 72), Image.Resampling.LANCZOS)
    image.paste(source, (x0 + (x1 - x0 - source.width) // 2, y0 + 12))
    draw.text((x0 + 16, y1 - 48), label, fill=TEXT, font=font(16, True))


def cover_frame():
    image, draw = base("Mining asset quality promotion", "Existing kernelCAD models · material-specific controls · named palettes · regenerated previews")
    draw.rounded_rectangle((58, 144, 1222, 654), radius=24, fill=PANEL, outline="#344956", width=2)
    ids = ["mine-locomotive", "continuous-miner", "ball-mill"]
    for i, asset_id in enumerate(ids):
        x = 84 + i * 374
        preview = Image.open(KIT / "previews" / f"{asset_id}.png").convert("RGB")
        preview.thumbnail((340, 360), Image.Resampling.LANCZOS)
        image.paste(preview, (x + (340 - preview.width) // 2, 166))
        draw.text((x + 4, 542), asset_id.replace("-", " ").title(), fill=TEXT, font=font(16, True))
    draw.text((88, 601), "50 existing models · zero IDs added · 144 material controls · 100 preset entries", fill=GOLD, font=font(18, True))
    return image


def locomotive_frame():
    image, draw = base("Separate materials make the locomotive readable", "Coated cab and buffers · dark wheelsets and chassis · contrasting instrument glass")
    tile(image, BUNDLE / "before/mine-locomotive.png", (64, 145, 614, 650), "Before · one flat color")
    tile(image, KIT / "previews/mine-locomotive.png", (666, 145, 1216, 650), "After · independent material controls")
    draw.text((72, 676), "The windows and palette are authored in the same named assembly source.", fill=MUTED, font=font(15))
    return image


def miner_frame():
    image, draw = base("Add shape to the cutting and track assemblies", "Ten cutter picks and twenty track shoes sharpen the continuous-miner silhouette")
    tile(image, BUNDLE / "before/continuous-miner.png", (64, 145, 614, 650), "Before · smooth drum and solid track bars")
    tile(image, KIT / "previews/continuous-miner.png", (666, 145, 1216, 650), "After · picks, shoes and material contrast")
    draw.text((72, 676), "The cutter, track geometry and colors come from the promoted .kcad.ts model.", fill=MUTED, font=font(15))
    return image


def preset_frame():
    image, draw = base("Render the indexed highVisibility preset", "The same continuous-miner source selects an alternate equipment-paint palette")
    tile(image, KIT / "previews/continuous-miner.png", (64, 145, 614, 650), "Default source controls")
    tile(image, VARIANTS / "continuous-miner.highVisibility.png", (666, 145, 1216, 650), "highVisibility · local render")
    draw.text((72, 676), "Preset values are read from catalog/index.json, then rendered locally.", fill=MUTED, font=font(15))
    return image


def gallery_frame():
    image, draw = base("All 50 existing mining IDs have previews", "The catalog retains each source model and its own indexed rendered result")
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
    draw.text((61, 671), "50 rendered previews · each generated index row links its preview", fill=GOLD, font=font(16, True))
    return image


def validation_frame():
    image, draw = base("Local verification", "Source quality, ESLint, catalog integration, generated pages and index rows")
    audit = json.loads((BUNDLE / "promotion-audit.json").read_text())
    rows = [
        ("Existing assets promoted", str(audit["assetsPromoted"])),
        ("Material controls / presets", f"{audit['materialControls']} controls · {audit['presetEntries']} preset entries"),
        ("Previewed indexed rows", f"{audit['indexedRowsWithPreview']} / {audit['assetsPromoted']}"),
        ("Quality gate", audit["qualityGate"]),
        ("Kit ESLint", audit["eslint"]),
        ("Catalog integration", audit["catalogIntegration"]),
        ("Local catalog pages", "PASS" if audit["localPages"] else "FAIL"),
    ]
    y = 138
    for label, value in rows:
        draw.rounded_rectangle((76, y, 1204, y + 52), radius=11, fill=PANEL, outline="#344956", width=1)
        draw.text((98, y + 14), label, fill=GOLD, font=font(16, True))
        passed = value == "PASS" or value == "50/50 pass"
        draw.text((620, y + 14), value, fill=GREEN if passed else TEXT, font=font(16))
        y += 61
    draw.text((78, 590), f"Catalog quality after promotion: {audit['overallQualityAfter']}", fill=GOLD, font=font(16, True))
    draw.text((78, 625), "Branch-only renders and checks · no deployment or equipment-performance claim", fill=MUTED, font=font(14))
    draw.text((78, 650), "Stylized visualization geometry · no installation or physical acceptance claim", fill=MUTED, font=font(14))
    return image


def main():
    required = ["promotion-audit.json", "catalog-pages-check.json", "catalog-eslint-status.json", "catalog-test-status.json"]
    if not all((BUNDLE / name).is_file() for name in required):
        raise SystemExit("run the source/index audit, local page check, ESLint and catalog integration before capture")
    if not (VARIANTS / "continuous-miner.highVisibility.png").is_file():
        raise SystemExit("render the indexed highVisibility continuous-miner preset before capture")
    audit = json.loads((BUNDLE / "promotion-audit.json").read_text())
    if not audit.get("passed"):
        raise SystemExit("promotion audit did not pass")
    FRAMES.mkdir(parents=True, exist_ok=True)
    frames = [cover_frame(), locomotive_frame(), miner_frame(), preset_frame(), gallery_frame(), validation_frame()]
    for index, frame in enumerate(frames, 1):
        frame.save(FRAMES / f"frame-{index:02d}.png", optimize=True)
    output = BUNDLE / "mining-quality-promotion.mp4"
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "1/3",
        "-i", str(FRAMES / "frame-%02d.png"), "-c:v", "libx264", "-r", "24",
        "-pix_fmt", "yuv420p", "-crf", "23", "-movflags", "+faststart", str(output),
    ], check=True)
    frames[0].save(BUNDLE / "poster.png", optimize=True)
    print(f"wrote {output}")


if __name__ == "__main__":
    main()
