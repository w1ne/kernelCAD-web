#!/usr/bin/env python3
"""Build a short local demo from the checked-in source's generated variants."""

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
OUT = BUNDLE / "backwash-pump-skid-demo.mp4"


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


def image_card(draw, image_path, label, detail, accent=TEAL):
    draw.rounded_rectangle((170, 145, 1110, 620), radius=16, fill=PANEL, outline="#344651", width=1)
    draw.text((194, 164), label, fill=accent, font=font(17, BOLD))
    image = Image.open(image_path).convert("RGB")
    image.thumbnail((760, 395), Image.Resampling.LANCZOS)
    x = 640 - image.width // 2
    y = 198 + (395 - image.height) // 2
    draw._image_target.paste(image, (x, y))
    draw.text((194, 574), detail, fill=TEXT, font=font(15, MONO))


def frame_with_image(section, title, detail, variant, caption, accent=TEAL):
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, section, title, detail)
    draw._image_target = image
    image_card(draw, BUNDLE / "variants" / f"backwash-pump-skid-{variant}.png", caption, f"pumpArrangement = {variant.split('-')[0]}", accent)
    footer(draw)
    return image


def title_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    draw.text((68, 46), "kernelCAD  /  CATALOG VISUAL FOLLOW-UP", fill=TEAL, font=font(18, BOLD))
    draw.text((68, 108), "FILTER BACKWASH PUMP SKID", fill=TEXT, font=font(42, BOLD))
    draw.text((70, 176), "One existing asset gains a clearer pump-package silhouette and a real layout choice.", fill=MUTED, font=font(18))
    draw.rounded_rectangle((68, 260, 1212, 564), radius=18, fill=PANEL, outline="#344651", width=1)
    items = [
        ("PUMP ARRANGEMENT", "single / duplex"),
        ("MATERIALS", "pump steel / frame / stainless / rubber"),
        ("PALETTES", "weathered / highVisibility"),
    ]
    for i, (label, value) in enumerate(items):
        y = 304 + i * 78
        draw.text((104, y), label, fill=TEAL, font=font(15, BOLD))
        draw.text((430, y), value, fill=TEXT, font=font(19, MONO))
    draw.text((70, 614), "Existing ID retained · no kits or assets added", fill=ORANGE, font=font(18, BOLD))
    footer(draw)
    return image


def verification_frame(report):
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "04 / verify locally", "Source and variants checked", "The handoff records the generated preview, refreshed index, checks and local page review.")
    draw.rounded_rectangle((54, 155, 1226, 560), radius=16, fill=PANEL, outline="#344651", width=2)
    variant_rows = report["variants"]
    rows = [
        ("Current preview", f"{report['asset']['triangles']} / {report['asset']['triangleBudget']} triangles"),
        ("Single arrangement", f"{variant_rows[0]['triangles']} / {variant_rows[0]['triangleBudget']} triangles"),
        ("Duplex arrangement", f"{variant_rows[1]['triangles']} / {variant_rows[1]['triangleBudget']} triangles"),
        ("High visibility", f"{variant_rows[2]['triangles']} / {variant_rows[2]['triangleBudget']} triangles"),
        ("Water-treatment kit", f"{report['waterTreatmentQuality']['passing']} / {report['waterTreatmentQuality']['total']} pass"),
        ("Whole catalog", f"{report['catalogQuality']['passing']} / {report['catalogQuality']['total']} pass (100%)"),
        ("Lint / integration", report["checks"]["lintIntegration"]),
        ("Local detail page", report["checks"]["localPage"]),
    ]
    y = 180
    for label, value in rows:
        draw.text((86, y), label, fill=TEAL, font=font(15, BOLD))
        draw.text((455, y), value, fill=TEXT, font=font(15))
        y += 39
    draw.text((86, 510), "No deployment, water-treatment performance or physical acceptance is claimed.", fill=MUTED, font=font(13))
    footer(draw)
    return image


def main():
    report = json.loads((BUNDLE / "verification.json").read_text(encoding="utf-8"))
    if not report["pass"]:
        raise SystemExit("local verification has failures; refusing to create completion demo")
    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    frames = [
        title_frame(),
        frame_with_image("01 / choose", "Single pump arrangement", "One pump/motor set remains on the shared skid.", "single", "SINGLE UNIT"),
        frame_with_image("02 / compare", "Duplex pump arrangement", "The same source adds the second pump, motor, valves and gauges.", "duplex", "DUPLEX UNIT", ORANGE),
        frame_with_image("03 / finish", "High-visibility palette", "Four material controls recolor distinct component groups.", "duplex-high-visibility", "HIGH VISIBILITY", ORANGE),
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
        "workflow": "checked-in .kcad.ts source -> single/duplex and highVisibility software renders -> preview and index refresh -> local quality, lint, integration and page checks",
        "video": str(OUT.relative_to(ROOT)),
        "canvas": {"width": WIDTH, "height": HEIGHT},
        "frames": len(frames),
        "durationSeconds": len(frames) * 3,
        "ffmpeg": "ffmpeg -framerate 1/3 -c:v libx264 -r 24 -pix_fmt yuv420p -crf 24 -movflags +faststart",
        "invocation": "python3 artifacts/catalog-demos/water-treatment-backwash-pump-skid-20261110/capture_demo.py",
        "variantInvocation": "npx tsx artifacts/catalog-demos/water-treatment-backwash-pump-skid-20261110/render_backwash_variants.ts",
        "previewInvocation": "npx tsx scripts/renderCatalogPreviews.ts backwash-pump-skid",
        "indexInvocation": "npx tsx scripts/buildAssetCatalog.ts",
        "provenance": "Local software renders of checked-in kernelCAD source and source-defined material/geometry choices. This branch is not deployed and no treatment performance or physical acceptance is shown.",
    }
    (BUNDLE / "demo-settings.json").write_text(json.dumps(settings, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT} ({len(frames) * 3}s)")


if __name__ == "__main__":
    main()
