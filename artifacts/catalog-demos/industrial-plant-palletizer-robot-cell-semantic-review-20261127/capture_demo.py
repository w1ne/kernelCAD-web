#!/usr/bin/env python3
"""Create a short local audit-to-preview demo from retained evidence."""

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
FRAME_DIR = BUNDLE / "frames"
OUT = BUNDLE / "industrial-plant-palletizer-robot-cell-semantic-review.mp4"
AUDIT = ["palletizer-robot-cell", "centrifugal-pump", "industrial-boiler", "forklift-truck", "distillation-column"]


def font(size, bold=False):
    return ImageFont.truetype(BOLD if bold else FONT, size)


def canvas():
    return Image.new("RGB", (WIDTH, HEIGHT), BG)


def footer(draw):
    draw.line((54, 678, WIDTH - 54, 678), fill="#35434e", width=1)
    draw.text((54, 688), "Local source and software render · branch not deployed · no motion or physical acceptance claimed", fill=MUTED, font=font(11))


def header(draw, section, title, detail):
    draw.text((54, 26), section.upper(), fill=TEAL, font=font(15, True))
    draw.text((54, 54), title, fill=TEXT, font=font(30, True))
    draw.text((54, 97), detail, fill=MUTED, font=font(14))


def paste_fit(target, path, rect, max_size):
    image = Image.open(path).convert("RGB")
    image.thumbnail(max_size, Image.Resampling.LANCZOS)
    x = rect[0] + (rect[2] - rect[0] - image.width) // 2
    y = rect[1] + (rect[3] - rect[1] - image.height) // 2
    target.paste(image, (x, y))


def title_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    draw.text((68, 42), "kernelCAD  /  INDUSTRIAL-PLANT SEMANTIC REVIEW", fill=TEAL, font=font(17, True))
    draw.text((68, 101), "PALLETIZER ROBOT CELL", fill=TEXT, font=font(42, True))
    draw.text((70, 162), "A five-preview audit found a guarded cell that did not read as a palletizer.", fill=MUTED, font=font(18))
    draw.rounded_rectangle((68, 240, 1212, 574), radius=18, fill=PANEL, outline="#344651", width=1)
    items = [
        ("ASSET", "existing industrial-plant ID retained"),
        ("SCENE", "robot · open mesh fence · roller infeed · carton pallet"),
        ("CONTROLS", "concrete · steel · safety paint · carton"),
    ]
    for index, (label, value) in enumerate(items):
        y = 286 + index * 82
        draw.text((104, y), label, fill=TEAL, font=font(14, True))
        draw.text((300, y), value, fill=TEXT, font=font(17))
    draw.text((70, 614), "One in-place correction · catalog asset count unchanged", fill=ORANGE, font=font(17, True))
    footer(draw)
    return image


def audit_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "01 / audit", "One mismatch selected from five previews", "The other four industrial models remained recognizable and unchanged.")
    draw.rounded_rectangle((54, 138, 1226, 620), radius=16, fill=PANEL, outline="#344651", width=1)
    labels = ["PALLETIZER", "CENTRIFUGAL PUMP", "BOILER", "FORKLIFT", "DISTILLATION COLUMN"]
    x0, tile_w = 70, 220
    for index, (asset, label) in enumerate(zip(AUDIT, labels)):
        x = x0 + index * 230
        draw.text((x, 158), label, fill=ORANGE if index == 0 else TEAL, font=font(10, True))
        path = BUNDLE / "before/palletizer-robot-cell.png" if index == 0 else BUNDLE / f"preview-review/{asset}.png"
        paste_fit(image, path, (x, 186, x + tile_w, 430), (tile_w, 244))
    draw.text((82, 478), "SELECTED", fill=ORANGE, font=font(13, True))
    draw.text((232, 478), "Blocky enclosure hid robot and material flow", fill=TEXT, font=font(14))
    draw.text((82, 525), "UNCHANGED", fill=TEAL, font=font(13, True))
    draw.text((232, 525), "Pump · boiler · forklift · distillation column", fill=TEXT, font=font(14))
    footer(draw)
    return image


def compare_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "02 / finding", "The old preview hid the palletizing work cell", "Before image retained from origin/develop; after image is rendered from the revised source.")
    draw.rounded_rectangle((54, 138, 1226, 620), radius=16, fill=PANEL, outline="#344651", width=1)
    draw.text((118, 160), "BEFORE", fill=ORANGE, font=font(15, True))
    draw.text((696, 160), "AFTER · LOCAL", fill=TEAL, font=font(15, True))
    paste_fit(image, BUNDLE / "before/palletizer-robot-cell.png", (78, 186, 614, 550), (520, 350))
    paste_fit(image, BUNDLE / "after/palletizer-robot-cell.png", (648, 186, 1196, 550), (530, 350))
    draw.text((100, 566), "Solid panels · blocky silhouette", fill=MUTED, font=font(13))
    draw.text((668, 566), "Robot · open mesh · roller infeed · loaded pallet", fill=MUTED, font=font(13))
    footer(draw)
    return image


def geometry_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "03 / modeled result", "The scene now shows the work flow", "A static display pose; no cycle, reach, or safety behavior is represented.")
    draw.rounded_rectangle((54, 138, 1226, 620), radius=16, fill=PANEL, outline="#344651", width=1)
    paste_fit(image, BUNDLE / "after/palletizer-robot-cell.png", (72, 156, 650, 596), (560, 420))
    notes = [
        "Articulated robot with visible links and joints",
        "Open mesh guard and a framed access gate",
        "Eleven crosswise rollers carry an infeed carton",
        "Timber pallet station holds eight cartons",
        "7,777 triangles / 12,000 budget",
    ]
    y = 212
    for note in notes:
        draw.ellipse((684, y + 4, 696, y + 16), fill=TEAL)
        draw.text((714, y), note, fill=TEXT, font=font(15))
        y += 64
    footer(draw)
    return image


def controls_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "04 / controls", "Material controls and presets", "Color changes update the corresponding parts while keeping the same scene structure.")
    draw.rounded_rectangle((54, 138, 1226, 620), radius=16, fill=PANEL, outline="#344651", width=1)
    paste_fit(image, BUNDLE / "after/palletizer-robot-cell.png", (72, 158, 610, 594), (520, 410))
    labels = [("concrete", "#8a8e89"), ("steel", "#53636a"), ("safetyPaint", "#e9a43b"), ("carton", "#b47a4e")]
    y = 190
    for name, color in labels:
        draw.rounded_rectangle((658, y, 704, y + 30), radius=5, fill=color, outline="#71808a")
        draw.text((724, y + 4), name, fill=TEXT, font=font(15))
        y += 55
    draw.text((660, 430), "PRESETS", fill=TEAL, font=font(13, True))
    draw.rounded_rectangle((660, 462, 892, 506), radius=9, fill="#263742", outline="#52636d")
    draw.rounded_rectangle((914, 462, 1160, 506), radius=9, fill="#263742", outline="#52636d")
    draw.text((683, 474), "weathered", fill=TEXT, font=font(14, True))
    draw.text((941, 474), "highVisibility", fill=TEXT, font=font(14, True))
    footer(draw)
    return image


def verification_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    report = json.loads((BUNDLE / "verification/verification.json").read_text(encoding="utf-8"))
    header(draw, "05 / local verification", "Evidence retained with the correction", "Results describe the local branch and its generated catalog data.")
    draw.rounded_rectangle((54, 138, 1226, 610), radius=16, fill=PANEL, outline="#344651", width=1)
    rows = [
        ("Focused GLB regression", report["checks"]["focusedTest"]),
        ("Catalog integration", report["checks"]["integration"]),
        ("ESLint", report["checks"]["eslint"]),
        ("Catalog quality", report["checks"]["catalogQuality"]),
        ("Generated index", report["checks"]["catalogIndex"]),
        ("Asset IDs and count", "unchanged" if report["assetIdsAndCountsUnchanged"] else "changed"),
    ]
    y = 176
    for label, value in rows:
        draw.text((86, y), label, fill=TEAL, font=font(14, True))
        draw.text((412, y), value, fill=TEXT, font=font(14))
        y += 49
    draw.text((86, 504), "Preview and local detail page match the checked-in source. No deployment or physical acceptance is claimed.", fill=MUTED, font=font(12))
    footer(draw)
    return image


def main():
    report = json.loads((BUNDLE / "verification/verification.json").read_text(encoding="utf-8"))
    if not report.get("targetChecksPass"):
        raise SystemExit("required local checks are incomplete; refusing to make completion demo")
    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    frames = [title_frame(), audit_frame(), compare_frame(), geometry_frame(), controls_frame(), verification_frame()]
    for index, frame in enumerate(frames, 1):
        frame.save(FRAME_DIR / f"frame-{index:02d}.png", optimize=True)
    frames[0].save(BUNDLE / "poster.png", optimize=True)
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "1/3",
        "-i", str(FRAME_DIR / "frame-%02d.png"), "-c:v", "libx264", "-r", "24",
        "-pix_fmt", "yuv420p", "-crf", "24", "-movflags", "+faststart", str(OUT),
    ], check=True)
    settings = {
        "workflow": "five-preview audit -> in-place source correction -> software preview -> regenerated index -> local checks",
        "video": str(OUT.relative_to(ROOT)),
        "canvas": {"width": WIDTH, "height": HEIGHT},
        "frames": len(frames),
        "durationSeconds": len(frames) * 3,
        "ffmpeg": "ffmpeg -framerate 1/3 -c:v libx264 -r 24 -pix_fmt yuv420p -crf 24 -movflags +faststart",
        "invocation": "python3 artifacts/catalog-demos/industrial-plant-palletizer-robot-cell-semantic-review-20261127/capture_demo.py",
        "previewInvocation": "npx tsx scripts/renderCatalogPreviews.ts palletizer-robot-cell",
        "indexInvocation": "npx tsx scripts/buildAssetCatalog.ts",
        "inspectionInvocation": "python3 artifacts/catalog-demos/industrial-plant-palletizer-robot-cell-semantic-review-20261127/inspect_video.py",
        "inspection": "video-review/inspection.json and video-review/contact-sheet.png",
        "provenance": "Local kernelCAD source and local software-rendered preview. The branch is not deployed; the demo shows no motion simulation, manufacturing validation, or physical acceptance.",
    }
    (BUNDLE / "demo-settings.json").write_text(json.dumps(settings, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT} ({len(frames) * 3}s)")


if __name__ == "__main__":
    main()
