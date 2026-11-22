#!/usr/bin/env python3
"""Compose a short source-to-preview MP4 for archaeology fieldwork."""

import json
import subprocess
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
KIT = ROOT / "catalog/kits/archaeology-fieldwork"
FRAMES = BUNDLE / "frames"
VARIANTS = BUNDLE / "weathered-variants"
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, GOLD, GREEN, BLUE = (
    "#111923", "#1d2935", "#eef3f5", "#a6b6c0", "#e5b64b", "#88c89a", "#82c7d2"
)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
FOOTER = "Replay of local software renders · no simulation · deployment unverified · no field/hardware acceptance"


def font(size, path=FONT):
    return ImageFont.truetype(path, size)


def canvas(title, subtitle):
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, WIDTH, 10), fill=GOLD)
    draw.text((54, 28), title, fill=TEXT, font=font(30, BOLD))
    draw.text((56, 75), subtitle, fill=MUTED, font=font(16))
    draw.line((54, 675, WIDTH - 54, 675), fill="#35434e", width=1)
    draw.text((54, 686), FOOTER, fill=MUTED, font=font(13))
    return image, draw


def paste_fit(image, path, box):
    x, y, width, height = box
    preview = Image.open(path).convert("RGB")
    preview.thumbnail((width, height), Image.Resampling.LANCZOS)
    image.paste(preview, (x + (width - preview.width) // 2, y + (height - preview.height) // 2))


def card(image, path, box, label):
    x, y, width, height = box
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((x, y, x + width, y + height), radius=12, fill=PANEL, outline="#344651", width=2)
    paste_fit(image, path, (x + 10, y + 10, width - 20, height - 58))
    draw.text((x + 14, y + height - 40), label, fill=TEXT, font=font(15, BOLD))


def cover_frame():
    image, draw = canvas(
        "Archaeology fieldwork · quality promotion",
        "50 existing assets · distinct material controls · two editable appearance presets",
    )
    ids = [
        ("archaeologist-trowel", "Tapered steel blade / timber grip"),
        ("field-loupe", "Glass lens / metal rim / polymer grip"),
        ("total-station", "Survey instrument / tripod / display"),
    ]
    for i, (asset_id, label) in enumerate(ids):
        card(image, KIT / "previews" / (asset_id + ".png"), (54 + i * 398, 150, 374, 440), label)
    draw.text((60, 614), "No IDs added · scale retained · every asset has two to four material controls", fill=GOLD, font=font(17, BOLD))
    return image


def before_after_frame():
    image, draw = canvas(
        "The material split clarifies the tool silhouette",
        "The same existing ID keeps its shape, with timber, steel, glass and polymer visible as separate zones",
    )
    items = [
        ("Original trowel preview", BUNDLE / "before/archaeologist-trowel.png"),
        ("Updated trowel preview", KIT / "previews/archaeologist-trowel.png"),
        ("Original loupe preview", BUNDLE / "before/field-loupe.png"),
        ("Updated loupe preview", KIT / "previews/field-loupe.png"),
    ]
    for i, (label, path) in enumerate(items):
        row, col = divmod(i, 2)
        card(image, path, (54 + col * 590, 145 + row * 245, 560, 218), label)
    draw.text((60, 636), "The trowel now ends in a pointed blade; the loupe has a visible glass face.", fill=GREEN, font=font(15, BOLD))
    return image


def source_frame():
    image, draw = canvas(
        "Material roles and named palettes live in source",
        "The controls color actual assembly parts; presets change the same source's material values",
    )
    source = (KIT / "archaeologist-trowel.kcad.ts").read_text().splitlines()
    selected = [line.strip() for line in source if any(token in line for token in (
        "const timber =", "const stainlessSteel =", "fieldReady:", "weathered:",
        'p.part("handle"', 'p.part("blade"',
    ))]
    draw.rounded_rectangle((54, 132, 775, 610), radius=14, fill=PANEL, outline="#344651", width=2)
    y = 164
    for line in selected:
        wrapped = textwrap.wrap(line, width=84, break_long_words=False, break_on_hyphens=False)
        for part in wrapped:
            draw.text((74, y), part, fill=BLUE if ".color(" in line else TEXT, font=font(12, MONO))
            y += 22
        y += 16
    card(image, KIT / "previews/archaeologist-trowel.png", (816, 165, 408, 390), "Rendered from the updated source")
    draw.text((824, 580), "fieldReady · weathered", fill=GOLD, font=font(15, BOLD))
    return image


def preset_frame():
    image, draw = canvas(
        "Switch the total station to its weathered preset",
        "The named preset is read from the rebuilt index, applied to source parameters, then software-rendered",
    )
    card(image, KIT / "previews/total-station.png", (54, 144, 560, 470), "Default material controls")
    card(image, VARIANTS / "total-station.weathered.png", (666, 144, 560, 470), "weathered · local preset render")
    return image


def verification_frame():
    image, draw = canvas(
        "Archaeology fieldwork · local checks",
        "Rendered previews, generated catalog index, and local detail pages",
    )
    audit = json.loads((BUNDLE / "promotion-audit.json").read_text())
    pages = json.loads((BUNDLE / "catalog-pages-check.json").read_text())
    rows = [
        ("Existing IDs", "50 · no additions or renames"),
        ("Material controls / presets", str(audit["materialControls"]) + " controls · " + str(audit["presetEntries"]) + " preset entries"),
        ("Rendered and indexed previews", str(audit["indexedRowsWithPreview"]) + " / 50"),
        ("Quality gate", audit["qualityGate"]),
        ("Kit ESLint", json.loads((BUNDLE / "catalog-eslint-status.json").read_text())["summary"]),
        ("Catalog integration", json.loads((BUNDLE / "catalog-test-status.json").read_text())["summary"]),
        ("Local detail pages", str(pages["pagesBuilt"]) + " / 50 with matching preview copies"),
        ("Catalog-wide quality", "1,904 / 2,390 pass · 79.7% · 486 thin"),
    ]
    y = 125
    for label, value in rows:
        draw.rounded_rectangle((64, y, 1216, y + 54), radius=10, fill=PANEL, outline="#344651", width=1)
        draw.text((88, y + 15), label, fill=GOLD, font=font(15, BOLD))
        draw.text((558, y + 15), value, fill=GREEN if "pass" in value.lower() or "clean" in value.lower() else TEXT, font=font(15))
        y += 63
    return image


def main():
    required = [
        "promotion-audit.json", "catalog-pages-check.json",
        "catalog-eslint-status.json", "catalog-test-status.json",
    ]
    if not all((BUNDLE / name).is_file() for name in required):
        raise SystemExit("run the audit, local page check, ESLint and catalog integration first")
    if not (VARIANTS / "total-station.weathered.png").is_file():
        raise SystemExit("render the indexed weathered total-station preset first")
    audit = json.loads((BUNDLE / "promotion-audit.json").read_text())
    if not audit.get("passed"):
        raise SystemExit("promotion audit is not passing")
    FRAMES.mkdir(parents=True, exist_ok=True)
    frames = [cover_frame(), before_after_frame(), source_frame(), preset_frame(), verification_frame()]
    for index, frame in enumerate(frames, 1):
        frame.save(FRAMES / ("frame-" + str(index).zfill(2) + ".png"), optimize=True)
    output = BUNDLE / "archaeology-fieldwork-quality-promotion.mp4"
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "1/4",
        "-i", str(FRAMES / "frame-%02d.png"), "-c:v", "libx264", "-r", "24",
        "-pix_fmt", "yuv420p", "-crf", "24", "-movflags", "+faststart", str(output),
    ], check=True)
    frames[0].save(BUNDLE / "poster.png", optimize=True)
    print("wrote " + str(output))


if __name__ == "__main__":
    main()
