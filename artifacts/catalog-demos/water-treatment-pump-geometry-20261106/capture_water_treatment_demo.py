#!/usr/bin/env python3
"""Create a short local source-to-preview demo for three water-treatment assets."""

import json
import subprocess
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/water-treatment"
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, TEAL, ORANGE = "#101923", "#1d2935", "#eef3f5", "#a6b6c0", "#61c6bf", "#e88b49"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
FRAME_DIR = BUNDLE / "frames"
OUT = BUNDLE / "water-treatment-pump-geometry.mp4"


def font(size, path=FONT):
    return ImageFont.truetype(path, size)


def canvas():
    return Image.new("RGB", (WIDTH, HEIGHT), BG)


def header(draw, section, title, detail):
    draw.text((54, 28), section.upper(), fill=TEAL, font=font(16, BOLD))
    draw.text((54, 58), title, fill=TEXT, font=font(31, BOLD))
    draw.text((54, 101), detail, fill=MUTED, font=font(15))


def footer(draw):
    draw.line((54, 678, WIDTH - 54, 678), fill="#35434e", width=1)
    draw.text((54, 688), "Local source and software renders · no deployment, treatment performance, or physical acceptance shown", fill=MUTED, font=font(11))


def fit(image, size):
    out = image.convert("RGB")
    out.thumbnail(size, Image.Resampling.LANCZOS)
    return out


def paste_center(target, image, box):
    x, y, w, h = box
    preview = fit(image, (w, h))
    target.paste(preview, (x + (w - preview.width) // 2, y + (h - preview.height) // 2))


def card(draw, x, y, w, h, title, color=TEAL):
    draw.rounded_rectangle((x, y, x + w, y + h), radius=13, fill=PANEL, outline="#344651", width=1)
    draw.text((x + 16, y + 12), title, fill=color, font=font(16, BOLD))


def title_frame(report):
    image = canvas()
    draw = ImageDraw.Draw(image)
    draw.text((66, 38), "kernelCAD  /  CATALOG VISUAL FOLLOW-UP", fill=TEAL, font=font(18, BOLD))
    draw.text((66, 82), "WATER-TREATMENT MACHINES", fill=TEXT, font=font(38, BOLD))
    draw.text((68, 134), "Three existing assets now read as the equipment they model.", fill=MUTED, font=font(18))
    ids = ["high-lift-pump-skid", "horizontal-split-case-pump", "reverse-osmosis-skid"]
    captions = ["Scroll pump + finned motor", "Split casing + paired ports", "Horizontal membrane vessels"]
    for index, (asset_id, caption) in enumerate(zip(ids, captions)):
        x = 54 + index * 397
        card(draw, x, 188, 374, 390, asset_id.replace("-", " ").title())
        paste_center(image, Image.open(KIT / "previews" / f"{asset_id}.png"), (x + 12, 226, 350, 266))
        draw.text((x + 14, 518), caption, fill=TEXT, font=font(13))
    draw.text((67, 608), "No new kits or IDs · material palettes retained · geometry choices added", fill=TEAL, font=font(18, BOLD))
    footer(draw)
    return image


def before_after_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "01 / compare", "From block stacks to pump assemblies", "Before previews are from the indexed baseline; after previews are software renders of the revised sources.")
    rows = [
        ("high-lift-pump-skid", "Motor, coupling, scroll casing and outlet riser"),
        ("horizontal-split-case-pump", "Split casing, paired risers and finned motor"),
    ]
    for index, (asset_id, caption) in enumerate(rows):
        y = 150 + index * 242
        draw.rounded_rectangle((54, y, 1226, y + 220), radius=14, fill=PANEL, outline="#344651", width=1)
        draw.text((74, y + 12), asset_id.replace("-", " ").title(), fill=TEAL, font=font(15, BOLD))
        paste_center(image, Image.open(BUNDLE / "before" / f"{asset_id}.png"), (80, y + 40, 440, 144))
        paste_center(image, Image.open(KIT / "previews" / f"{asset_id}.png"), (615, y + 40, 440, 144))
        draw.text((94, y + 188), "BEFORE", fill=MUTED, font=font(12, BOLD))
        draw.text((632, y + 188), "AFTER", fill=ORANGE, font=font(12, BOLD))
        draw.text((806, y + 186), caption, fill=TEXT, font=font(12))
    footer(draw)
    return image


def membrane_variants_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "02 / vary", "The vessel-count choice changes the skid", "Each render uses the source highVisibility palette and a different membraneVessels value.")
    cards = [
        (54, "BASELINE", BUNDLE / "before/reverse-osmosis-skid.png", "3 vertical tubes · baseline"),
        (350, "REVISED", KIT / "previews/reverse-osmosis-skid.png", "3 horizontal tubes · revised"),
        (646, "2 VESSELS", BUNDLE / "variants/reverse-osmosis-skid-two-vessels.png", "membraneVessels = 2"),
        (942, "4 VESSELS", BUNDLE / "variants/reverse-osmosis-skid-four-vessels.png", "membraneVessels = 4"),
    ]
    for x, label, path, caption in cards:
        card(draw, x, 163, 280, 426, label, ORANGE if label in ("2 VESSELS", "4 VESSELS") else TEAL)
        paste_center(image, Image.open(path), (x + 7, 204, 266, 270))
        draw.text((x + 12, 520), caption, fill=TEXT, font=font(12))
    draw.text((74, 612), "The skid keeps its manifolds, supports, feed pump and cabinet as the vessel count changes.", fill=TEAL, font=font(16, BOLD))
    footer(draw)
    return image


def parameters_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "03 / source controls", "Keep the finish knobs; add equipment choices", "Existing material controls and weathered/highVisibility palettes remain source-defined.")
    draw.rounded_rectangle((54, 153, 736, 588), radius=14, fill=PANEL, outline="#344651", width=1)
    snippets = [
        "pumpCapacity: compact / standard / highFlow",
        "casingSize: compact / standard / heavyDuty",
        "membraneVessels: 2 / 3 / 4",
        "presets: weathered / highVisibility",
        "materials: coated steel / structure / stainless",
    ]
    y = 198
    for line in snippets:
        for wrapped in textwrap.wrap(line, width=46, subsequent_indent="  "):
            draw.text((82, y), wrapped, fill=TEAL if "presets:" in line or ":" in line else TEXT, font=font(17, MONO))
            y += 42
    draw.text((82, 490), "Parameters change object configuration.", fill=TEXT, font=font(15))
    draw.text((82, 521), "Named palettes change the visible materials.", fill=MUTED, font=font(14))
    card(draw, 770, 153, 456, 435, "highVisibility · highFlow")
    paste_center(image, Image.open(BUNDLE / "variants/high-lift-pump-skid-highVisibility.png"), (790, 196, 416, 316))
    swatches = [("coated steel", "#e5682d"), ("structural", "#505b60"), ("stainless", "#e1ddd0")]
    x = 800
    for name, value in swatches:
        draw.rounded_rectangle((x, 526, x + 28, 552), radius=3, fill=value)
        draw.text((x + 34, 531), name, fill=TEXT, font=font(10))
        x += 135
    footer(draw)
    return image


def verification_frame(report):
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "04 / verify locally", "All three sources build under their budgets", "Generated previews, source hashes and local catalog pages were checked on this branch.")
    draw.rounded_rectangle((54, 155, 1226, 558), radius=16, fill=PANEL, outline="#344651", width=2)
    assets = report["assets"]
    checks = report["checks"]
    rows = [
        ("High-lift pump", f"{assets[0]['triangles']} / {assets[0]['triangleBudget']} triangles"),
        ("Split-case pump", f"{assets[1]['triangles']} / {assets[1]['triangleBudget']} triangles"),
        ("Reverse-osmosis skid", f"{assets[2]['triangles']} / {assets[2]['triangleBudget']} triangles"),
        ("Water-treatment gate", f"{report['waterTreatmentQuality']['passing']} / {report['waterTreatmentQuality']['total']} pass"),
        ("Whole catalog", f"{report['catalogQuality']['passing']} / {report['catalogQuality']['total']} pass (100%)"),
        ("Lint / integration", "passed · 4 files / 15 tests"),
        ("Local pages", "3 assets checked · branch not deployed"),
    ]
    y = 181
    for label, value in rows:
        draw.text((86, y), label, fill=TEAL, font=font(15, BOLD))
        draw.text((455, y), value, fill=TEXT, font=font(15))
        y += 45
    draw.text((86, 514), "No deployment, treatment-performance or physical-acceptance result is claimed.", fill=MUTED, font=font(13))
    footer(draw)
    return image


def main():
    report = json.loads((BUNDLE / "verification.json").read_text(encoding="utf-8"))
    if not report["pass"]:
        raise SystemExit("local verification has failures; refusing to create completion demo")
    ids = ["high-lift-pump-skid", "horizontal-split-case-pump", "reverse-osmosis-skid"]
    if not all((KIT / "previews" / f"{asset_id}.png").is_file() for asset_id in ids):
        raise SystemExit("missing regenerated kit preview")
    frames = [title_frame(report), before_after_frame(), membrane_variants_frame(), parameters_frame(), verification_frame(report)]
    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    for index, frame in enumerate(frames, 1):
        frame.save(FRAME_DIR / f"frame-{index:02d}.png", optimize=True)
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "1/3",
        "-i", str(FRAME_DIR / "frame-%02d.png"), "-c:v", "libx264", "-r", "24",
        "-pix_fmt", "yuv420p", "-crf", "24", "-movflags", "+faststart", str(OUT),
    ], check=True)
    Image.open(FRAME_DIR / "frame-01.png").save(BUNDLE / "poster.png", optimize=True)
    settings = {
        "workflow": "water-treatment .kcad.ts sources -> software-rendered before/after previews -> highVisibility and geometry-choice variants -> regenerated catalog index and local checks",
        "video": str(OUT.relative_to(ROOT)),
        "canvas": {"width": WIDTH, "height": HEIGHT},
        "frames": len(frames),
        "durationSeconds": len(frames) * 3,
        "ffmpeg": "ffmpeg -framerate 1/3 -c:v libx264 -r 24 -pix_fmt yuv420p -crf 24 -movflags +faststart",
        "invocation": "python3 artifacts/catalog-demos/water-treatment-pump-geometry-20261106/capture_water_treatment_demo.py",
        "variantInvocation": "npx tsx artifacts/catalog-demos/water-treatment-pump-geometry-20261106/render_water_treatment_variants.ts",
        "previewInvocation": "npx tsx scripts/renderCatalogPreviews.ts high-lift-pump-skid horizontal-split-case-pump reverse-osmosis-skid",
        "indexInvocation": "npx tsx scripts/buildAssetCatalog.ts",
        "provenance": "Generated locally from checked-in kernelCAD sources, baseline/current catalog previews, source-defined palettes and local verification. The feature branch is not deployed; treatment performance and physical acceptance are not shown.",
    }
    (BUNDLE / "demo-settings.json").write_text(json.dumps(settings, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT} ({len(frames) * 3}s)")


if __name__ == "__main__":
    main()
