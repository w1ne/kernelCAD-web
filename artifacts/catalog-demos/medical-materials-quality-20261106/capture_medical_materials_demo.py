#!/usr/bin/env python3
"""Capture material controls, exact preset renders and local validation in an MP4."""

import json
import subprocess
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/medical"
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, TEAL = "#101923", "#1d2935", "#eef3f5", "#a6b6c0", "#61c6bf"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
FRAME_DIR = BUNDLE / "frames"
OUT = BUNDLE / "medical-materials-quality-demo.mp4"


def font(size, path=FONT):
    return ImageFont.truetype(path, size)


def canvas():
    return Image.new("RGB", (WIDTH, HEIGHT), BG)


def header(draw, section, title, detail):
    draw.text((54, 30), section.upper(), fill=TEAL, font=font(16, BOLD))
    draw.text((54, 62), title, fill=TEXT, font=font(32, BOLD))
    draw.text((54, 105), detail, fill=MUTED, font=font(16))


def footer(draw, detail="Source-driven local renders · no Studio session, deployment or clinical acceptance shown"):
    draw.line((54, 678, WIDTH - 54, 678), fill="#35434e", width=1)
    draw.text((54, 688), detail, fill=MUTED, font=font(12))


def fit(image, size):
    out = image.convert("RGB")
    out.thumbnail(size, Image.Resampling.LANCZOS)
    return out


def paste_center(target, image, box):
    x, y, w, h = box
    preview = fit(image, (w, h))
    target.paste(preview, (x + (w - preview.width) // 2, y + (h - preview.height) // 2))


def title_frame(report):
    image = canvas()
    draw = ImageDraw.Draw(image)
    draw.text((64, 66), "kernelCAD  /  CATALOG QUALITY", fill=TEAL, font=font(18, BOLD))
    draw.text((64, 126), "MEDICAL, WITH MATERIALS", fill=TEXT, font=font(38, BOLD))
    draw.text((68, 190), "40 existing assets · 132 material-specific controls", fill=TEXT, font=font(20))
    draw.rounded_rectangle((64, 266, 670, 522), radius=18, fill=PANEL, outline="#344651", width=2)
    draw.text((96, 306), "Polymer · steel · glass · upholstery", fill=TEAL, font=font(19, BOLD))
    draw.text((96, 353), "Rubber · paper · gauze · silicone", fill=TEXT, font=font(18))
    draw.text((96, 411), "Clinic and emergency presets per asset", fill=MUTED, font=font(16))
    draw.text((96, 463), f"Catalog quality {report['quality']['passing']}/{report['quality']['total']} passing · 100.00%", fill=TEXT, font=font(16))
    draw.rounded_rectangle((704, 176, 1216, 586), radius=14, fill=PANEL, outline="#344651", width=1)
    paste_center(image, Image.open(KIT / "previews/wheelchair.png"), (724, 196, 472, 348))
    draw.text((746, 548), "Upholstery · aluminum · rubber · polymer", fill=TEAL, font=font(14, BOLD))
    footer(draw)
    return image


def source_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "01 / author", "Controls name modeled materials", "Example source: wheelchair.kcad.ts · each control colors its own assembly parts.")
    source = (KIT / "wheelchair.kcad.ts").read_text(encoding="utf-8").splitlines()
    lines = [line.strip() for line in source if " = param(" in line or "presets({" in line or "clinic:" in line or "emergency:" in line]
    draw.rounded_rectangle((54, 164, 744, 604), radius=14, fill=PANEL, outline="#344651", width=1)
    y = 191
    for line in lines[:12]:
        draw.text((76, y), textwrap.shorten(line, width=78, placeholder=" …"), fill=TEXT, font=font(13, MONO))
        y += 30
    draw.rounded_rectangle((770, 164, 1226, 604), radius=14, fill=PANEL, outline="#344651", width=1)
    paste_center(image, Image.open(KIT / "previews/wheelchair.png"), (790, 184, 416, 304))
    draw.text((810, 510), "Vinyl upholstery · anodized aluminum", fill=TEAL, font=font(13, BOLD))
    draw.text((810, 538), "Rubber tires · molded armrests", fill=TEXT, font=font(13))
    draw.text((810, 572), "Existing rail / shelf / tube choices preserved", fill=MUTED, font=font(11))
    footer(draw)
    return image


def object_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "02 / recognizable shapes", "Material zones follow the object", "Existing IDs stay in place; five forms gain small identifying details.")
    cards = [
        ("WHEELCHAIR", KIT / "previews/wheelchair.png", "fabric seat · metal frame · rubber wheels"),
        ("PATIENT MONITOR", KIT / "previews/diagnostic-monitor.png", "glass screen · metal post · polymer case"),
        ("ERLENMEYER FLASK", KIT / "previews/erlenmeyer-flask.png", "tapered loft · liquid level · graduations"),
    ]
    for index, (name, path, detail) in enumerate(cards):
        x = 54 + index * 394
        draw.rounded_rectangle((x, 164, x + 374, 604), radius=14, fill=PANEL, outline="#344651", width=1)
        draw.text((x + 18, 184), name, fill=TEAL, font=font(13, BOLD))
        paste_center(image, Image.open(path), (x + 10, 220, 354, 254))
        draw.text((x + 18, 520), textwrap.shorten(detail, width=43, placeholder=" …"), fill=TEXT, font=font(12))
    footer(draw)
    return image


def preset_frame(variants):
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "03 / choose a look", "Presets recolor the named materials", "The same source geometry renders as clinic or emergency equipment.")
    cards = []
    for row in variants["variants"]:
        title = f"{row['assetId'].replace('-', ' ').upper()}  /  {row['preset'].upper()}"
        cards.append((title, BUNDLE / row["png"], f"{row['triangles']} triangles · {row['triangleBudget']} budget"))
    card_w, card_h, gap_x, gap_y = 374, 207, 18, 14
    for index, (name, path, detail) in enumerate(cards):
        col, row = index % 3, index // 3
        x, y = 54 + col * (card_w + gap_x), 164 + row * (card_h + gap_y)
        draw.rounded_rectangle((x, y, x + card_w, y + card_h), radius=12, fill=PANEL, outline="#344651", width=1)
        draw.text((x + 14, y + 12), name, fill=TEAL, font=font(11, BOLD))
        paste_center(image, Image.open(path), (x + 10, y + 36, card_w - 20, 132))
        draw.text((x + 14, y + 174), detail, fill=MUTED, font=font(11))
    footer(draw)
    return image


def before_after_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "04 / silhouette detail", "The flask now reads from its profile", "A ruled loft narrows from the vessel body to the neck; the front shows a liquid window and marks.")
    cards = [
        ("BEFORE · STEPPED CYLINDERS", BUNDLE / "before-previews/erlenmeyer-flask.png"),
        ("AFTER · TAPERED LOFT + MARKS", KIT / "previews/erlenmeyer-flask.png"),
    ]
    for index, (name, path) in enumerate(cards):
        x = 54 + index * 590
        draw.rounded_rectangle((x, 164, x + 558, 604), radius=14, fill=PANEL, outline="#344651", width=1)
        draw.text((x + 20, 184), name, fill=TEAL, font=font(13, BOLD))
        paste_center(image, Image.open(path), (x + 16, 218, 526, 300))
        draw.text((x + 24, 552), "Same asset ID · same triangle budget", fill=TEXT, font=font(13))
    footer(draw)
    return image


def verification_frame(report, checks):
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "05 / local checks", "Sources, previews and index agree", "Checks describe local generation and source validation.")
    draw.rounded_rectangle((54, 164, 1226, 594), radius=16, fill=PANEL, outline="#344651", width=2)
    rows = [
        ("Medical kit", "40 / 40 assets · 132 material controls · 2–4 per asset"),
        ("Quality gate", f"{report['quality']['passing']} / {report['quality']['total']} passing (100.00%)"),
        ("Previews and index", "40 refreshed PNGs · index regenerated from source"),
        ("Lint and integration", checks["lintSummary"]),
        ("Local pages", checks["localPagesSummary"]),
        ("Public routes", "Catalog hub and asset pages returned 404 at baseline"),
        ("Deployment", "Feature branch only · not deployed"),
    ]
    y = 188
    for label, value in rows:
        draw.text((88, y), label, fill=TEAL, font=font(14, BOLD))
        draw.text((388, y), textwrap.shorten(value, width=79, placeholder=" …"), fill=TEXT, font=font(13))
        y += 48
    footer(draw, "Local source, preview and page checks only · no clinical or physical acceptance claim")
    return image


def main():
    report = json.loads((BUNDLE / "verification.json").read_text(encoding="utf-8"))
    checks = json.loads((BUNDLE / "check-results.json").read_text(encoding="utf-8"))
    variants = json.loads((BUNDLE / "preset-variants.json").read_text(encoding="utf-8"))
    if len(list(KIT.glob("previews/*.png"))) != 40:
        raise SystemExit("medical preview set is incomplete")
    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    frames = [
        title_frame(report),
        source_frame(),
        object_frame(),
        preset_frame(variants),
        before_after_frame(),
        verification_frame(report, checks),
    ]
    for index, frame in enumerate(frames, 1):
        frame.save(FRAME_DIR / f"frame-{index:02d}.png", optimize=True)
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "1/3",
        "-i", str(FRAME_DIR / "frame-%02d.png"), "-c:v", "libx264", "-r", "24",
        "-pix_fmt", "yuv420p", "-crf", "24", "-movflags", "+faststart", str(OUT),
    ], check=True)
    Image.open(FRAME_DIR / "frame-01.png").save(BUNDLE / "poster.png", optimize=True)
    settings = {
        "workflow": "existing medical sources -> material-specific controls and visible identifying details -> exact clinic/emergency preset exports -> refreshed previews and catalog index -> local lint, integration and static-page checks",
        "video": str(OUT.relative_to(ROOT)),
        "canvas": {"width": WIDTH, "height": HEIGHT},
        "frames": len(frames),
        "durationSeconds": len(frames) * 3,
        "ffmpeg": "ffmpeg -framerate 1/3 -c:v libx264 -r 24 -pix_fmt yuv420p -crf 24 -movflags +faststart",
        "invocation": "python3 artifacts/catalog-demos/medical-materials-quality-20261106/capture_medical_materials_demo.py",
        "variantInvocation": variants["invocation"],
        "previewInvocation": report["commands"]["previewRender"]["invocation"],
        "indexInvocation": report["commands"]["catalogBuild"]["invocation"],
        "checks": checks,
        "provenance": "The six palette images are GLB exports made from the checked-in source and exact indexed presets, then rasterized locally. No live Studio session, deployed behavior or clinical device validation is shown.",
    }
    (BUNDLE / "demo-settings.json").write_text(json.dumps(settings, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT} ({len(frames) * 3}s)")


if __name__ == "__main__":
    main()
