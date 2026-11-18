#!/usr/bin/env python3
"""Capture the real recycling-facility source-to-preview workflow and audit."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog" / "kits" / "recycling-facility"
PREVIEWS = KIT / "previews"
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, GREEN = "#111923", "#1d2935", "#eef3f5", "#a6b6c0", "#86c89a"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"

SHOWCASES = [
    ("Collection and site containers", ["open-top-roll-off-skip", "glass-cullet-skip", "e-waste-pallet-box", "battery-quarantine-drum", "textile-donation-cage", "leachate-sump-tank", "compactor-bag-frame", "waste-cart-tipping-frame"]),
    ("Inbound reception", ["weighbridge-deck", "weighbridge-kiosk", "vehicle-barrier-gate", "public-dropoff-canopy", "truck-wheel-wash", "waste-inspection-platform", "inbound-camera-mast", "public-scale-display"]),
    ("Sorting lines", ["infeed-hopper", "inclined-belt-conveyor", "overband-magnet-separator", "recycling-trommel-screen", "optical-sorter-arch", "air-classifier", "conveyor-transfer-tower", "picking-booth-module"]),
    ("Baling and size reduction", ["vertical-baler", "two-ram-baler", "recovered-bale-wrapper", "primary-shredder", "twin-shaft-shredder", "glass-crusher", "stationary-compactor", "baghouse-collector"]),
    ("Glass and plastics recovery", ["glass-washer-trommel", "cullet-storage-silo", "bottle-cleaning-line", "glass-screening-deck", "plastic-wash-basin", "float-sink-separator", "plastic-flake-dryer", "pelletizer-extruder"]),
    ("Organics processing", ["green-waste-shredder", "compost-trommel-screen", "in-vessel-composter", "anaerobic-digester-tank", "digestate-separator", "compost-curing-bay", "biofilter-bed", "biogas-flare-stack"]),
    ("Residuals and site monitoring", ["landfill-gas-wellhead", "gas-collection-riser", "landfill-liner-roll", "geomembrane-welder", "stormwater-settling-basin", "litter-fence-panel", "dust-suppression-mist-cannon", "landfill-monitoring-pedestal"]),
]


def font(size, path=FONT):
    return ImageFont.truetype(path, size)


def canvas():
    return Image.new("RGB", (WIDTH, HEIGHT), BG)


def header(draw, kicker, title, detail):
    draw.text((54, 28), kicker.upper(), fill=GREEN, font=font(16, BOLD))
    draw.text((54, 57), title, fill=TEXT, font=font(31, BOLD))
    draw.text((54, 101), detail, fill=MUTED, font=font(16))


def footer(draw, detail):
    draw.line((54, 678, WIDTH - 54, 678), fill="#35434e", width=1)
    draw.text((54, 688), detail, fill=MUTED, font=font(12))


def title_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    d.text((72, 68), "kernelCAD  /  ASSET CATALOG", fill=GREEN, font=font(20, BOLD))
    d.text((72, 148), "RECYCLING FACILITY", fill=TEXT, font=font(50, BOLD))
    d.text((76, 246), "153 editable materials-recovery scene props", fill=TEXT, font=font(24))
    d.text((76, 300), "Reception  ·  sorting  ·  recovery  ·  organics  ·  residuals", fill=MUTED, font=font(18))
    d.rounded_rectangle((72, 410, 1208, 550), radius=16, fill=PANEL, outline="#344651", width=2)
    d.text((100, 437), "Generated native .kcad.ts sources and linked preview images", fill=TEXT, font=font(22, BOLD))
    d.text((100, 490), "CC0 1.0   /   millimetres   /   Z up   /   scale + color controls", fill=GREEN, font=font(18))
    footer(d, "Original kernelCAD scene geometry · local catalog workflow")
    return im


def source_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "01 / source", "An editable source model", "Optical sorter arch: the indexed source contains the model parts, scale control and color control.")
    lines = (KIT / "optical-sorter-arch.kcad.ts").read_text().splitlines()
    y = 145
    for line in lines[:28]:
        value = line.strip()
        if len(value) > 75:
            value = value[:72] + "…"
        d.text((58, y), value, fill=TEXT, font=font(12, MONO))
        y += 19
    d.rounded_rectangle((790, 150, 1210, 570), radius=16, fill=PANEL, outline="#344651", width=2)
    preview = Image.open(PREVIEWS / "optical-sorter-arch.png").convert("RGB")
    preview.thumbnail((388, 315), Image.Resampling.LANCZOS)
    im.paste(preview, (801 + (388 - preview.width) // 2, 165 + (315 - preview.height) // 2))
    d.text((825, 500), "scale  0.70 — 1.30", fill=GREEN, font=font(17, BOLD))
    d.text((825, 531), "color  user-selectable", fill=TEXT, font=font(16))
    footer(d, "Preview rendered from the indexed source at default parameters; catalog tests check builds, budgets, materials and Studio knobs.")
    return im


def contact_frame(group_number, title, ids):
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, f"02 / rendered previews · set {group_number}", title, "Default-parameter previews generated locally from the indexed .kcad.ts sources.")
    card_w, card_h, gap_x, x0, y0 = 280, 238, 12, 54, 164
    for i, asset_id in enumerate(ids):
        col, row = i % 4, i // 4
        x, y = x0 + col * (card_w + gap_x), y0 + row * (card_h + 12)
        d.rounded_rectangle((x, y, x + card_w, y + card_h), radius=9, fill=PANEL, outline="#344651", width=1)
        preview = Image.open(PREVIEWS / f"{asset_id}.png").convert("RGB")
        preview.thumbnail((card_w - 16, 175), Image.Resampling.LANCZOS)
        im.paste(preview, (x + (card_w - preview.width) // 2, y + 4 + (175 - preview.height) // 2))
        label = asset_id.replace("-", " ").title()
        if len(label) > 32:
            label = label[:29] + "…"
        d.text((x + 8, y + 187), label, fill=TEXT, font=font(12, BOLD))
        d.text((x + 8, y + 212), "scale · color", fill=GREEN, font=font(10, MONO))
    footer(d, "Each image is the generated catalog preview for the named asset; all 2,000 index rows have preview paths.")
    return im


def verification_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "03 / local verification", "Catalog audit and local pages", "Checks cover this checkout; no production deployment or physical acceptance is claimed.")
    preview = json.loads((BUNDLE / "preview-audit.json").read_text())
    pages = json.loads((BUNDLE / "catalog-pages-check.json").read_text())
    lint = json.loads((BUNDLE / "catalog-eslint.json").read_text())
    tests = json.loads((BUNDLE / "catalog-tests.json").read_text())
    rows = [
        ("Indexed assets and rendered previews", f"{preview['assetsTotal']} / {preview['assetsTotal']}"),
        ("New kit sources", f"{preview['recyclingFacilityRows']} with previews"),
        ("Mesh range and material", f"{tests['triangleRange'][0]}–{tests['triangleRange'][1]} triangles · one each"),
        ("Integration suite", f"{tests['integration']['filesPassed']} files · {tests['integration']['testsPassed']} tests passed"),
        ("Local pages and previews", f"{pages['pageAndPreviewPairs']} paired pages"),
        ("Catalog lint", f"{lint['errorCount']} errors · {lint['warningCount']} warnings"),
    ]
    d.rounded_rectangle((54, 155, 1226, 555), radius=18, fill=PANEL, outline="#344651", width=2)
    y = 184
    for label, value in rows:
        d.text((84, y), label, fill=GREEN, font=font(16, BOLD))
        d.text((540, y), value, fill=TEXT, font=font(16))
        y += 54
    d.text((84, 520), "Branch not deployed · visualization assets only · no safety or process claims", fill=MUTED, font=font(14))
    footer(d, "Local replay and validation only · not a plant design, rated equipment model or environmental compliance check.")
    return im


def main():
    index = json.loads((ROOT / "catalog" / "index.json").read_text())
    assets = [asset for asset in index["assets"] if asset["kit"] == "recycling-facility"]
    if len(assets) != 153 or not all((PREVIEWS / f"{asset['id']}.png").is_file() for asset in assets):
        raise SystemExit("expected all 153 indexed recycling-facility assets and previews before capture")
    required = ["preview-audit.json", "catalog-pages-check.json", "catalog-eslint.json", "catalog-tests.json", "live-website-check.json"]
    if not all((BUNDLE / name).is_file() for name in required):
        raise SystemExit("run lint, catalog integration, preview, local-page and live-baseline checks before capture")
    frames = [title_frame(), source_frame()]
    frames.extend(contact_frame(i, title, ids) for i, (title, ids) in enumerate(SHOWCASES, 1))
    frames.append(verification_frame())
    if len(frames) != 10:
        raise SystemExit("demo must use exactly ten readable frames")
    frame_dir = BUNDLE / "frames"
    frame_dir.mkdir(parents=True, exist_ok=True)
    for i, frame in enumerate(frames, 1):
        frame.save(frame_dir / f"frame-{i:02d}.png", optimize=True)
    output = BUNDLE / "recycling-facility-kit.mp4"
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "1/3", "-i", str(frame_dir / "frame-%02d.png"), "-c:v", "libx264", "-r", "24", "-pix_fmt", "yuv420p", "-crf", "25", "-movflags", "+faststart", str(output)], check=True)
    frames[0].save(BUNDLE / "poster.png", optimize=True)
    print(f"wrote {output}")


if __name__ == "__main__":
    main()
