#!/usr/bin/env python3
"""Build a short local workflow demo from checked-in source and render variants."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, TEAL, ORANGE = "#101923", "#1d2935", "#eef3f5", "#a6b6c0", "#61c6bf", "#e88b49"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
FRAME_DIR = BUNDLE / "frames"
OUT = BUNDLE / "air-compressor-demo.mp4"


def font(size, path=FONT):
    return ImageFont.truetype(path, size)


def canvas():
    return Image.new("RGB", (WIDTH, HEIGHT), BG)


def footer(draw):
    draw.line((54, 678, WIDTH - 54, 678), fill="#35434e", width=1)
    draw.text((54, 688), "Local source and software renders · not a deployed or performance-verified system", fill=MUTED, font=font(11))


def header(draw, section, title, detail):
    draw.text((54, 28), section.upper(), fill=TEAL, font=font(16, BOLD))
    draw.text((54, 58), title, fill=TEXT, font=font(31, BOLD))
    draw.text((54, 101), detail, fill=MUTED, font=font(15))


def paste_fit(target, image_path, rect, max_size):
    image = Image.open(image_path).convert("RGB")
    image.thumbnail(max_size, Image.Resampling.LANCZOS)
    x = rect[0] + (rect[2] - rect[0] - image.width) // 2
    y = rect[1] + (rect[3] - rect[1] - image.height) // 2
    target.paste(image, (x, y))


def title_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    draw.text((68, 46), "kernelCAD  /  CATALOG VISUAL FOLLOW-UP", fill=TEAL, font=font(18, BOLD))
    draw.text((68, 108), "INDUSTRIAL AIR COMPRESSOR", fill=TEXT, font=font(39, BOLD))
    draw.text((70, 176), "One existing machine gains a joined receiver, drive and pressure-control silhouette.", fill=MUTED, font=font(18))
    draw.rounded_rectangle((68, 260, 1212, 564), radius=18, fill=PANEL, outline="#344651", width=1)
    items = [
        ("GEOMETRY CHOICES", "80 / 120 gal · single / twin pump"),
        ("MATERIALS", "receiver steel / cast iron / motor paint / rubber"),
        ("PALETTES", "plant / weathered / highVisibility"),
    ]
    for i, (label, value) in enumerate(items):
        y = 304 + i * 78
        draw.text((104, y), label, fill=TEAL, font=font(15, BOLD))
        draw.text((430, y), value, fill=TEXT, font=font(17, MONO))
    draw.text((70, 614), "Existing ID retained · no assets or kits added", fill=ORANGE, font=font(18, BOLD))
    footer(draw)
    return image


def compare_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "01 / silhouette", "Receiver and drive now read as one package", "Source-first refinement of the existing industrial-plant/air-compressor asset.")
    draw.rounded_rectangle((54, 145, 1226, 620), radius=16, fill=PANEL, outline="#344651", width=1)
    draw.text((124, 163), "BEFORE", fill=ORANGE, font=font(16, BOLD))
    draw.text((685, 163), "UPDATED", fill=TEAL, font=font(16, BOLD))
    paste_fit(image, BUNDLE / "before" / "air-compressor.png", (88, 195, 600, 555), (480, 340))
    paste_fit(image, ROOT / "catalog/kits/industrial-plant/previews/air-compressor.png", (642, 195, 1192, 555), (510, 350))
    draw.text((121, 572), "Receiver, motor and heads separate", fill=MUTED, font=font(14))
    draw.text((681, 572), "Saddled tank · pump · belt guard · pressure controls", fill=MUTED, font=font(14))
    footer(draw)
    return image


def variant_frame(section, title, detail, filename, caption, accent=TEAL):
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, section, title, detail)
    draw.rounded_rectangle((170, 145, 1110, 620), radius=16, fill=PANEL, outline="#344651", width=1)
    draw.text((194, 164), caption, fill=accent, font=font(17, BOLD))
    paste_fit(image, BUNDLE / "variants" / filename, (310, 190, 970, 555), (630, 350))
    footer(draw)
    return image


def verification_frame(report):
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "04 / verify locally", "Source and variants checked", "The handoff records rendered previews, index regeneration and local checks.")
    draw.rounded_rectangle((54, 155, 1226, 560), radius=16, fill=PANEL, outline="#344651", width=2)
    checks = report["checks"]
    rows = [
        ("Default source", f"{report['asset']['triangles']} / {report['asset']['triangleBudget']} triangles"),
        ("Kit quality gate", f"{report['industrialPlantQuality']['passing']} / {report['industrialPlantQuality']['total']} pass"),
        ("Whole catalog", f"{report['catalogQuality']['passing']} / {report['catalogQuality']['total']} pass (100%)"),
        ("Lint / integration", checks["lintIntegration"]),
        ("Local detail page", checks["localPage"]),
        ("Asset IDs", "unchanged" if checks["assetIdsUnchanged"] else "changed"),
    ]
    y = 190
    for label, value in rows:
        draw.text((86, y), label, fill=TEAL, font=font(15, BOLD))
        draw.text((455, y), value, fill=TEXT, font=font(15))
        y += 44
    draw.text((86, 500), "No deployment, engineering performance or physical acceptance is claimed.", fill=MUTED, font=font(13))
    footer(draw)
    return image


def main():
    report = json.loads((BUNDLE / "verification.json").read_text(encoding="utf-8"))
    if not report["pass"]:
        raise SystemExit("local verification has failures; refusing to create completion demo")
    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    frames = [
        title_frame(),
        compare_frame(),
        variant_frame("02 / configure", "Smaller receiver, single pump", "Both choices alter the source geometry.", "air-compressor-80-single-weathered.png", "80 GALLON · SINGLE · WEATHERED", ORANGE),
        variant_frame("03 / finish", "Twin pump, high visibility", "Four material controls separate the main component groups.", "air-compressor-120-twin-high-visibility.png", "120 GALLON · TWIN · HIGH VISIBILITY", ORANGE),
        verification_frame(report),
    ]
    for index, frame in enumerate(frames, 1):
        frame.save(FRAME_DIR / f"frame-{index:02d}.png", optimize=True)
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "1/3",
        "-i", str(FRAME_DIR / "frame-%02d.png"), "-c:v", "libx264", "-r", "24",
        "-pix_fmt", "yuv420p", "-crf", "24", "-movflags", "+faststart", str(OUT),
    ], check=True)
    frames[0].save(BUNDLE / "poster.png", optimize=True)
    settings = {
        "workflow": "checked-in .kcad.ts source -> capacity/arrangement and palette variants -> preview and index refresh -> local quality, lint, integration and page checks",
        "video": str(OUT.relative_to(ROOT)),
        "canvas": {"width": WIDTH, "height": HEIGHT},
        "frames": len(frames),
        "durationSeconds": len(frames) * 3,
        "ffmpeg": "ffmpeg -framerate 1/3 -c:v libx264 -r 24 -pix_fmt yuv420p -crf 24 -movflags +faststart",
        "invocation": "python3 artifacts/catalog-demos/industrial-plant-air-compressor-quality-20261110/capture_demo.py",
        "variantInvocation": "npx tsx artifacts/catalog-demos/industrial-plant-air-compressor-quality-20261110/render_air_compressor_variants.ts",
        "previewInvocation": "npx tsx scripts/renderCatalogPreviews.ts air-compressor diesel-generator-set belt-conveyor",
        "indexInvocation": "npx tsx scripts/buildAssetCatalog.ts",
        "provenance": "Local software renders of checked-in kernelCAD source and source-defined choices and presets. This branch is not deployed; no engineering performance or physical acceptance is shown.",
    }
    (BUNDLE / "demo-settings.json").write_text(json.dumps(settings, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT} ({len(frames) * 3}s)")


if __name__ == "__main__":
    main()
