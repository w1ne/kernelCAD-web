#!/usr/bin/env python3
"""Create a short local source-to-preview demo for the scrubber material audit."""

import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, TEAL, ORANGE = "#101923", "#1d2935", "#eef3f5", "#a6b6c0", "#61c6bf", "#e88b49"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FRAME_DIR = BUNDLE / "frames"
OUT = BUNDLE / "industrial-plant-packed-scrubber-material-review.mp4"
ASSETS = ["baghouse-dust-collector", "bridge-crane", "industrial-boiler", "industrial-transformer", "packed-scrubber-column"]
LABELS = ["BAGHOUSE", "BRIDGE CRANE", "BOILER", "TRANSFORMER", "PACKED SCRUBBER"]


def font(size, bold=False):
    return ImageFont.truetype(BOLD if bold else FONT, size)


def canvas():
    return Image.new("RGB", (WIDTH, HEIGHT), BG)


def footer(draw):
    draw.line((54, 678, WIDTH - 54, 678), fill="#35434e", width=1)
    draw.text((54, 688), "Local source render + software checks · not deployed · no simulation or physical acceptance claimed", fill=MUTED, font=font(11))


def header(draw, section, title, detail):
    draw.text((54, 28), section.upper(), fill=TEAL, font=font(16, True))
    draw.text((54, 58), title, fill=TEXT, font=font(31, True))
    draw.text((54, 101), detail, fill=MUTED, font=font(15))


def paste_fit(target, path, rect, max_size):
    image = Image.open(path).convert("RGB")
    image.thumbnail(max_size, Image.Resampling.LANCZOS)
    x = rect[0] + (rect[2] - rect[0] - image.width) // 2
    y = rect[1] + (rect[3] - rect[1] - image.height) // 2
    target.paste(image, (x, y))


def title_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    draw.text((68, 46), "kernelCAD  /  INDUSTRIAL-PLANT PREVIEW AUDIT", fill=TEAL, font=font(18, True))
    draw.text((68, 108), "PACKED SCRUBBER COLUMN", fill=TEXT, font=font(42, True))
    draw.text((70, 176), "Five rendered previews reviewed; one material mismatch selected.", fill=MUTED, font=font(19))
    draw.rounded_rectangle((68, 260, 1212, 564), radius=18, fill=PANEL, outline="#344651", width=1)
    rows = [
        ("SOURCE", "existing industrial-plant asset ID retained"),
        ("MATERIAL", "sump + two process nozzles now match the vessel finish"),
        ("ACCESS", "safety-painted decks and ladder rails remain"),
    ]
    for index, (label, value) in enumerate(rows):
        y = 304 + index * 78
        draw.text((104, y), label, fill=TEAL, font=font(15, True))
        draw.text((330, y), value, fill=TEXT, font=font(16))
    draw.text((70, 614), "One in-place color correction · no geometry or catalog count change", fill=ORANGE, font=font(18, True))
    footer(draw)
    return image


def compare_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "01 / material correction", "Sump and process nozzles now share the vessel finish", "The before image is the live checked-in baseline; the after image is rendered locally.")
    draw.rounded_rectangle((54, 145, 1226, 620), radius=16, fill=PANEL, outline="#344651", width=1)
    draw.text((132, 163), "BEFORE · PUBLIC BASELINE", fill=ORANGE, font=font(16, True))
    draw.text((699, 163), "AFTER · LOCAL SOURCE", fill=TEAL, font=font(16, True))
    paste_fit(image, BUNDLE / "before/packed-scrubber-column.png", (88, 195, 600, 555), (480, 340))
    paste_fit(image, BUNDLE / "after/packed-scrubber-column.png", (642, 195, 1192, 555), (510, 350))
    draw.text((111, 572), "Yellow sump and process fittings", fill=MUTED, font=font(14))
    draw.text((674, 572), "Vessel finish; yellow access parts remain", fill=MUTED, font=font(14))
    footer(draw)
    return image


def audit_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "02 / five-preview ledger", "Four recognizable previews stayed unchanged", "The scrubber carried the single selected material mismatch.")
    draw.rounded_rectangle((54, 145, 1226, 620), radius=16, fill=PANEL, outline="#344651", width=1)
    x0, tile_w = 76, 224
    for index, (asset, label) in enumerate(zip(ASSETS, LABELS)):
        x = x0 + index * 230
        draw.text((x, 162), label, fill=TEAL if index < 4 else ORANGE, font=font(11, True))
        preview = BUNDLE / f"before/{asset}.png"
        paste_fit(image, preview, (x, 188, x + tile_w, 432), (tile_w, 244))
    rows = [
        ("UNCHANGED", "Baghouse · bridge crane · boiler · distribution transformer", TEXT),
        ("FIXED", "Scrubber sump and two process nozzles → vessel finish", ORANGE),
        ("RETAINED", "Safety paint on service decks and ladder rails", TEAL),
    ]
    y = 468
    for label, value, color in rows:
        draw.text((88, y), label, fill=color, font=font(13, True))
        draw.text((248, y), value, fill=TEXT, font=font(13))
        y += 39
    footer(draw)
    return image


def detail_frame(report):
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "03 / source and render", "Existing controls and presets remain", "Only three part-to-color assignments changed; geometry is unchanged.")
    draw.rounded_rectangle((54, 145, 1226, 620), radius=16, fill=PANEL, outline="#344651", width=1)
    paste_fit(image, BUNDLE / "after/packed-scrubber-column.png", (82, 168, 650, 586), (540, 400))
    target = report["catalogTarget"]
    notes = [
        "steel + safetyPaint controls retained",
        "weathered + highVisibility presets retained",
        f"{target['triangles']} triangles / {target['triangleBudget']} budget",
        "No part geometry or asset ID changed",
    ]
    y = 230
    for note in notes:
        draw.ellipse((694, y + 4, 706, y + 16), fill=TEAL)
        draw.text((722, y), note, fill=TEXT, font=font(16))
        y += 62
    footer(draw)
    return image


def verification_frame(report):
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "04 / local verification", "Source, preview, index and checks recorded", "These results describe the local branch; deployment is separate.")
    draw.rounded_rectangle((54, 155, 1226, 560), radius=16, fill=PANEL, outline="#344651", width=2)
    checks = report["checks"]
    rows = [
        ("Material regression", checks["focusedTest"]),
        ("Catalog integration", checks["integration"]),
        ("ESLint / kit quality", f"{checks['eslint']} · {report['kitQuality']['passing']}/{report['kitQuality']['total']} pass"),
        ("Generated index", checks["index"]),
        ("Local detail page", checks["localPage"]),
        ("Catalog-wide quality", f"{report['catalogQuality']['passing']}/{report['catalogQuality']['total']} ({report['catalogQuality']['rate']})"),
    ]
    y = 184
    for label, value in rows:
        draw.text((86, y), label, fill=TEAL, font=font(14, True))
        draw.text((420, y), value, fill=TEXT, font=font(14))
        y += 45
    draw.text((86, 500), "Static source rendering only; no motion simulation, deployment, or hardware check.", fill=MUTED, font=font(13))
    footer(draw)
    return image


def main():
    report = json.loads((BUNDLE / "verification.json").read_text(encoding="utf-8"))
    if not report.get("targetChecksPass"):
        raise SystemExit("targeted local verification has failures; refusing to create completion demo")
    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    frames = [title_frame(), compare_frame(), audit_frame(), detail_frame(report), verification_frame(report)]
    for index, frame in enumerate(frames, 1):
        frame.save(FRAME_DIR / f"frame-{index:02d}.png", optimize=True)
    frames[0].save(BUNDLE / "poster.png", optimize=True)
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "1/3",
        "-i", str(FRAME_DIR / "frame-%02d.png"), "-c:v", "libx264", "-r", "24",
        "-pix_fmt", "yuv420p", "-crf", "24", "-movflags", "+faststart", str(OUT),
    ], check=True)
    settings = {
        "capturedOn": datetime.now(timezone.utc).date().isoformat(),
        "workflow": "five industrial-plant previews -> local material review -> source correction -> target preview render -> generated index -> tests and page checks",
        "video": str(OUT.relative_to(ROOT)),
        "canvas": {"width": WIDTH, "height": HEIGHT},
        "frames": len(frames),
        "durationSeconds": len(frames) * 3,
        "ffmpeg": "ffmpeg -framerate 1/3 -c:v libx264 -r 24 -pix_fmt yuv420p -crf 24 -movflags +faststart",
        "invocation": "python3 artifacts/catalog-demos/industrial-plant-packed-scrubber-material-review-20261117/capture_demo.py",
        "previewInvocation": "npx tsx scripts/renderCatalogPreviews.ts packed-scrubber-column",
        "indexInvocation": "npx tsx scripts/buildAssetCatalog.ts",
        "testInvocation": "npx vitest run tests/integration/catalog/packedScrubberWettedPartsMaterial.test.ts",
        "inspectionInvocation": "python3 artifacts/catalog-demos/industrial-plant-packed-scrubber-material-review-20261117/inspect_video.py",
        "provenance": "Local software renders and checks of the checked-in kernelCAD source. The branch is not deployed; no simulation or physical acceptance is claimed.",
    }
    (BUNDLE / "demo-settings.json").write_text(json.dumps(settings, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
