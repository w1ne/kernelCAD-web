#!/usr/bin/env python3
"""Create a short local workflow demo from verified chiller source variants."""

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
OUT = BUNDLE / "centrifugal-chiller-demo.mp4"


def font(size, path=FONT):
    return ImageFont.truetype(path, size)


def canvas():
    return Image.new("RGB", (WIDTH, HEIGHT), BG)


def footer(draw):
    draw.line((54, 678, WIDTH - 54, 678), fill="#35434e", width=1)
    draw.text((54, 688), "Local source and software renders · not deployed or physically accepted", fill=MUTED, font=font(11))


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
    draw.text((68, 108), "WATER-COOLED CENTRIFUGAL CHILLER", fill=TEXT, font=font(37, BOLD))
    draw.text((70, 176), "An existing box-like preview becomes a recognizable shell, compressor and controls package.", fill=MUTED, font=font(17))
    draw.rounded_rectangle((68, 260, 1212, 564), radius=18, fill=PANEL, outline="#344651", width=1)
    items = [
        ("GEOMETRY CHOICE", "compact / large shell package"),
        ("MATERIALS", "shell steel / support steel / compressor paint / pipework"),
        ("PALETTES", "plant / weathered / highVisibility / stainless"),
    ]
    for i, (label, value) in enumerate(items):
        y = 304 + i * 78
        draw.text((104, y), label, fill=TEAL, font=font(15, BOLD))
        draw.text((430, y), value, fill=TEXT, font=font(16, MONO))
    draw.text((70, 614), "Existing asset ID retained · catalog count unchanged", fill=ORANGE, font=font(18, BOLD))
    footer(draw)
    return image


def compare_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "01 / silhouette", "Two horizontal vessels anchor the package", "Source-first refinement of the existing industrial-plant/centrifugal-chiller asset.")
    draw.rounded_rectangle((54, 145, 1226, 620), radius=16, fill=PANEL, outline="#344651", width=1)
    draw.text((124, 163), "BEFORE", fill=ORANGE, font=font(16, BOLD))
    draw.text((685, 163), "UPDATED", fill=TEAL, font=font(16, BOLD))
    paste_fit(image, BUNDLE / "before" / "centrifugal-chiller.png", (88, 195, 600, 555), (480, 340))
    paste_fit(image, ROOT / "catalog/kits/industrial-plant/previews/centrifugal-chiller.png", (642, 195, 1192, 555), (510, 350))
    draw.text((121, 572), "Box casing · upright cylinders", fill=MUTED, font=font(14))
    draw.text((681, 572), "Dished vessels · compressor · pipes · controls", fill=MUTED, font=font(14))
    footer(draw)
    return image


def variants_frame(section, title, detail, left_file, right_file, left_label, right_label):
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, section, title, detail)
    draw.rounded_rectangle((54, 145, 1226, 620), radius=16, fill=PANEL, outline="#344651", width=1)
    draw.text((108, 164), left_label, fill=TEAL, font=font(16, BOLD))
    draw.text((692, 164), right_label, fill=ORANGE, font=font(16, BOLD))
    paste_fit(image, BUNDLE / "variants" / left_file, (86, 198, 618, 560), (520, 350))
    paste_fit(image, BUNDLE / "variants" / right_file, (656, 198, 1190, 560), (520, 350))
    footer(draw)
    return image


def verification_frame(report):
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "04 / verify locally", "Source and preview checks recorded", "The handoff keeps local validation separate from a deployed or physical result.")
    draw.rounded_rectangle((54, 155, 1226, 560), radius=16, fill=PANEL, outline="#344651", width=2)
    checks = report["checks"]
    rows = [
        ("Default source", f"{report['asset']['triangles']} / {report['asset']['triangleBudget']} triangles"),
        ("Kit quality gate", f"{report['industrialPlantQuality']['passing']} / {report['industrialPlantQuality']['total']} pass"),
        ("Whole catalog", f"{report['catalogQuality']['passing']} / {report['catalogQuality']['total']} pass"),
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
        variants_frame("02 / configure", "Shell size changes the vessel package", "Both variants come from the indexed shellCapacity choice.", "centrifugal-chiller-compact-weathered.png", "centrifugal-chiller-large-plant.png", "COMPACT · WEATHERED", "LARGE · PLANT"),
        variants_frame("03 / finish", "Palette controls recolor material groups", "Shell, support, compressor and pipework remain independently assigned.", "centrifugal-chiller-large-high-visibility.png", "centrifugal-chiller-compact-stainless.png", "LARGE · HIGH VISIBILITY", "COMPACT · STAINLESS"),
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
        "workflow": "existing .kcad.ts source -> compact/large shell variants and material presets -> refreshed catalog preview and index -> local quality, lint, integration and page checks",
        "video": str(OUT.relative_to(ROOT)),
        "canvas": {"width": WIDTH, "height": HEIGHT},
        "frames": len(frames),
        "durationSeconds": len(frames) * 3,
        "ffmpeg": "ffmpeg -framerate 1/3 -c:v libx264 -r 24 -pix_fmt yuv420p -crf 24 -movflags +faststart",
        "invocation": "python3 artifacts/catalog-demos/industrial-plant-chiller-quality-20261110/capture_demo.py",
        "variantInvocation": "npx tsx artifacts/catalog-demos/industrial-plant-chiller-quality-20261110/render_chiller_variants.ts",
        "previewInvocation": "npx tsx scripts/renderCatalogPreviews.ts centrifugal-chiller",
        "indexInvocation": "npx tsx scripts/buildAssetCatalog.ts",
        "provenance": "Local software renders of checked-in kernelCAD source, indexed shell choice and named color presets. The current branch is not deployed; no engineering performance or physical acceptance is shown.",
    }
    (BUNDLE / "demo-settings.json").write_text(json.dumps(settings, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT} ({len(frames) * 3}s)")


if __name__ == "__main__":
    main()
