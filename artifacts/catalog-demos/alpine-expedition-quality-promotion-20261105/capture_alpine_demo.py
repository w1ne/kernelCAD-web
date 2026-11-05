#!/usr/bin/env python3
"""Compose an inspected source-to-preview replay for Alpine Expedition."""

import json
import subprocess
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
KIT = ROOT / "catalog/kits/alpine-expedition"
FRAMES = BUNDLE / "frames"
VARIANTS = BUNDLE / "high-visibility"
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, GOLD, GREEN, BLUE = (
    "#111923", "#1d2935", "#eef3f5", "#a6b6c0", "#e5b64b", "#88c89a", "#82c7d2"
)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
FOOTER = "Local software renders · no simulation · branch not deployed · no hardware acceptance"


def font(size, path=FONT):
    return ImageFont.truetype(path, size)


def canvas(title, subtitle):
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, WIDTH, 10), fill=GOLD)
    draw.text((54, 28), title, fill=TEXT, font=font(30, BOLD))
    draw.text((56, 76), subtitle, fill=MUTED, font=font(16))
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
        "Alpine Expedition · quality promotion",
        "50 existing assets · 143 material controls · 100 named preset entries",
    )
    items = [
        ("alpine-helmet", "Polycarbonate shell / foam / webbing"),
        ("basecamp-dome-tent", "Nylon canopy / groundsheet / metal poles"),
        ("ice-axe", "Aluminium shaft / steel head / rubber grip"),
    ]
    for i, (asset_id, label) in enumerate(items):
        card(image, KIT / "previews" / (asset_id + ".png"), (54 + i * 398, 148, 374, 445), label)
    draw.text((60, 620), "Existing IDs retained · 2–4 color materials per source · both presets editable", fill=GOLD, font=font(17, BOLD))
    return image


def comparison_frame():
    image, draw = canvas(
        "Silhouette and color review",
        "Original and promoted previews for three existing asset IDs",
    )
    items = [
        ("Original helmet", BUNDLE / "before/alpine-helmet.png"),
        ("Updated helmet", KIT / "previews/alpine-helmet.png"),
        ("Original dome tent", BUNDLE / "before/basecamp-dome-tent.png"),
        ("Updated dome tent", KIT / "previews/basecamp-dome-tent.png"),
    ]
    for i, (label, path) in enumerate(items):
        row, col = divmod(i, 2)
        card(image, path, (54 + col * 590, 142 + row * 245, 560, 222), label)
    draw.text((60, 634), "The helmet has a visible liner and chin straps; the tent has a raised canopy and support arches.", fill=GREEN, font=font(15, BOLD))
    return image


def source_frame():
    image, draw = canvas(
        "Material roles and presets are source parameters",
        "Controls are applied to named assembly parts; the preset changes the same model's palette",
    )
    source = (KIT / "alpine-dry-bag.kcad.ts").read_text().splitlines()
    tokens = ("const nylon =", "const webbing =", "const polymer =", "stormWorn:", "highVisibility:", 'p.part("bag-body"', 'p.part("buckle-tab-0"', 'p.part("carry-handle"')
    selected = [line.strip() for line in source if any(token in line for token in tokens)]
    draw.rounded_rectangle((54, 132, 758, 610), radius=14, fill=PANEL, outline="#344651", width=2)
    y = 166
    for line in selected:
        for part in textwrap.wrap(line, width=74, break_long_words=False, break_on_hyphens=False):
            draw.text((74, y), part, fill=BLUE if ".color(" in line else TEXT, font=font(13, MONO))
            y += 25
        y += 18
    card(image, KIT / "previews/alpine-dry-bag.png", (800, 145, 410, 450), "Default palette · nylon / webbing / polymer")
    draw.text((826, 612), "stormWorn · highVisibility", fill=GOLD, font=font(16, BOLD))
    return image


def preset_frame():
    image, _ = canvas(
        "Switch the Alpine dry bag to highVisibility",
        "The preset is read from the rebuilt catalog index, applied to source parameters, then software-rendered",
    )
    card(image, KIT / "previews/alpine-dry-bag.png", (54, 145, 560, 470), "Default indexed preview")
    card(image, VARIANTS / "alpine-dry-bag.highVisibility.png", (666, 145, 560, 470), "highVisibility · indexed preset render")
    return image


def verification_frame():
    image, draw = canvas("Alpine Expedition · local verification", "Generated catalog data, material gate, tests, and local detail pages")
    audit = json.loads((BUNDLE / "index-integrity-status.json").read_text())
    pages = json.loads((BUNDLE / "catalog-pages-check.json").read_text())
    eslint = json.loads((BUNDLE / "catalog-eslint-status.json").read_text())
    tests = json.loads((BUNDLE / "catalog-test-status.json").read_text())
    rows = [
        ("Existing IDs", "50 · no additions or renames"),
        ("Material controls / presets", f"{audit['materialControls']} controls · {audit['presetEntries']} entries"),
        ("Hash / preview audit", f"{audit['sourceHashesMatched']} / 50 · {audit['previewPathsAndFilesMatched']} / 50"),
        ("Kit quality gate", audit["qualityGate"]),
        ("Kit ESLint", eslint["summary"]),
        ("Catalog integration", tests["summary"]),
        ("Local detail pages", f"{pages['pagesBuilt']} / 50 with matching preview copies"),
        ("Catalog-wide quality", "1,954 / 2,390 pass · 81.76% · 436 thin"),
    ]
    y = 125
    for label, value in rows:
        draw.rounded_rectangle((64, y, 1216, y + 54), radius=10, fill=PANEL, outline="#344651", width=1)
        draw.text((88, y + 15), label, fill=GOLD, font=font(15, BOLD))
        draw.text((558, y + 15), value, fill=GREEN if "pass" in value.lower() or "clean" in value.lower() else TEXT, font=font(15))
        y += 63
    return image


def main():
    required = ["index-integrity-status.json", "catalog-pages-check.json", "catalog-eslint-status.json", "catalog-test-status.json"]
    if not all((BUNDLE / name).is_file() for name in required):
        raise SystemExit("run index audit, local page check, ESLint, and integration first")
    variant = VARIANTS / "alpine-dry-bag.highVisibility.png"
    if not variant.is_file():
        raise SystemExit("render the indexed highVisibility variant first")
    FRAMES.mkdir(parents=True, exist_ok=True)
    frames = [cover_frame(), comparison_frame(), source_frame(), preset_frame(), verification_frame()]
    for index, frame in enumerate(frames, 1):
        frame.save(FRAMES / ("frame-" + str(index).zfill(2) + ".png"), optimize=True)
    output = BUNDLE / "alpine-expedition-quality-promotion.mp4"
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "1/4",
        "-i", str(FRAMES / "frame-%02d.png"), "-c:v", "libx264", "-r", "24",
        "-pix_fmt", "yuv420p", "-crf", "24", "-movflags", "+faststart", str(output),
    ], check=True)
    frames[0].save(BUNDLE / "poster.png", optimize=True)
    print("wrote " + str(output))


if __name__ == "__main__":
    main()
