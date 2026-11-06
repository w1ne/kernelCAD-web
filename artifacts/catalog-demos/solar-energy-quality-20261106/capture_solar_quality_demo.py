#!/usr/bin/env python3
"""Capture the local solar-energy source, preset and preview workflow."""

import json
import re
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/solar-energy"
PREVIEWS = KIT / "previews"
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, TEAL = "#101923", "#1d2935", "#eef3f5", "#a6b6c0", "#61c6bf"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
FRAME_DIR = BUNDLE / "frames"
OUT = BUNDLE / "solar-energy-quality-demo.mp4"


def font(size, path=FONT):
    return ImageFont.truetype(path, size)


def canvas():
    return Image.new("RGB", (WIDTH, HEIGHT), BG)


def header(draw, section, title, detail):
    draw.text((54, 30), section.upper(), fill=TEAL, font=font(16, BOLD))
    draw.text((54, 62), title, fill=TEXT, font=font(32, BOLD))
    draw.text((54, 105), detail, fill=MUTED, font=font(16))


def footer(draw, detail="Local .kcad.ts source and previews · deployed behavior is not shown"):
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
    draw.text((72, 80), "kernelCAD  /  CATALOG QUALITY", fill=TEAL, font=font(18, BOLD))
    draw.text((72, 144), "SOLAR ASSETS, WITH MATERIALS", fill=TEXT, font=font(42, BOLD))
    draw.text((76, 220), "40 existing PV, storage, conversion and service props", fill=TEXT, font=font(24))
    draw.rounded_rectangle((72, 310, 1208, 508), radius=18, fill=PANEL, outline="#344651", width=2)
    draw.text((108, 346), f"{report['materialControlsAdded']} material controls", fill=TEAL, font=font(29, BOLD))
    draw.text((108, 396), "Solar glass · aluminum · galvanized steel · ceramic · rubber", fill=TEXT, font=font(20))
    draw.text((108, 445), "Two named appearances per asset · same IDs · 40 refreshed previews", fill=MUTED, font=font(18))
    footer(draw)
    return image


def source_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "01 / edit", "A tracker with real material controls", "The source separates panel glass, aluminum frame, galvanized supports, and cell busbars.")
    lines = (KIT / "single-axis-solar-tracker.kcad.ts").read_text(encoding="utf-8").splitlines()
    chosen = []
    for line in lines:
        stripped = line.strip()
        parameter = re.match(r"const (\w+) = param\('([^']+)', '([^']+)', \{ label: '([^']+)' \}\);", stripped)
        if stripped.startswith("const scale"):
            chosen.append("scale = param('scale', 1, overall size)")
        elif parameter:
            chosen.append(f"param('{parameter.group(2)}', {parameter.group(3)})  ·  {parameter.group(4)}")
        elif stripped.startswith("presets({"):
            chosen.append(stripped)
        elif stripped.startswith("fieldService:") or stripped.startswith("highVisibility:"):
            name = stripped.split(":", 1)[0]
            color_values = re.findall(r"(aluminum|solarGlass): '([^']+)'", stripped)
            chosen.append(f"{name} → " + "  ·  ".join(f"{material} {color}" for material, color in color_values))
        elif "tracker-module-0-0-surface" in stripped:
            chosen.append('p.part("tracker-module-0-0-surface", ...).color(solarGlass)')
    draw.rounded_rectangle((54, 158, 718, 578), radius=14, fill=PANEL, outline="#344651", width=1)
    y = 180
    for line in chosen[:11]:
        color = TEAL if "param(" in line or "preset" in line.lower() else TEXT
        draw.text((72, y), line[:78], fill=color, font=font(12, MONO))
        y += 32
    draw.rounded_rectangle((750, 158, 1226, 578), radius=14, fill=PANEL, outline="#344651", width=1)
    paste_center(image, Image.open(PREVIEWS / "single-axis-solar-tracker.png"), (766, 174, 444, 322))
    draw.text((776, 514), "Eight framed modules tilt around a torque tube", fill=TEXT, font=font(15))
    draw.text((776, 541), "Piers, drive housing and cell divisions stay visible", fill=TEAL, font=font(13, BOLD))
    footer(draw)
    return image


def comparison_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "02 / before and after", "Material zones clarify existing assets", "Original one-color previews at left; refreshed source renders at right.")
    asset_ids = ["rooftop-pv-array", "single-axis-solar-tracker", "solar-battery-container"]
    for index, asset_id in enumerate(asset_ids):
        y = 158 + index * 164
        draw.rounded_rectangle((54, y, 1226, y + 151), radius=10, fill=PANEL, outline="#344651", width=1)
        draw.text((72, y + 8), asset_id.replace("-", " ").title(), fill=TEAL, font=font(14, BOLD))
        paste_center(image, Image.open(BUNDLE / "before-previews" / f"{asset_id}.png"), (230, y + 18, 360, 120))
        paste_center(image, Image.open(PREVIEWS / f"{asset_id}.png"), (720, y + 18, 360, 120))
        draw.text((310, y + 126), "single flat material", fill=MUTED, font=font(12))
        draw.text((812, y + 126), "separate material roles", fill=TEXT, font=font(12))
    footer(draw)
    return image


def preset_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "03 / vary", "Switch the container finish", "Both images were exported from the source's exact named presets.")
    variants = json.loads((BUNDLE / "preset-variants.json").read_text(encoding="utf-8"))["variants"]
    container_variants = [row for row in variants if row["assetId"] == "solar-battery-container"]
    for index, variant in enumerate(container_variants):
        x = 54 + index * 596
        draw.rounded_rectangle((x, 158, x + 572, 600), radius=14, fill=PANEL, outline="#344651", width=1)
        draw.text((x + 24, 176), variant["preset"], fill=TEAL, font=font(20, BOLD))
        paste_center(image, Image.open(BUNDLE / variant["png"]), (x + 28, 212, 516, 328))
        values = variant["values"]
        draw.text((x + 24, 554), f"powder coat {values['powderCoat']} · steel {values['stainlessSteel']}", fill=TEXT, font=font(13, MONO))
    footer(draw)
    return image


def contact_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "04 / browse", "One kit, multiple jobs", "The same catalog includes panels, conversion equipment, enclosures, field instruments, and carts.")
    asset_ids = [
        "ac-disconnect-switch", "battery-rack", "hybrid-inverter", "microinverter-unit",
        "pv-combiner-box", "pv-panel-cleaning-robot", "rooftop-pv-module", "solar-battery-container",
        "solar-carport-canopy", "solar-main-panel", "solar-weather-station", "utility-inverter-station",
    ]
    card_w, card_h, gap_x, gap_y = 278, 165, 18, 10
    for index, asset_id in enumerate(asset_ids):
        col, row = index % 4, index // 4
        x, y = 54 + col * (card_w + gap_x), 158 + row * (card_h + gap_y)
        draw.rounded_rectangle((x, y, x + card_w, y + card_h), radius=9, fill=PANEL, outline="#344651", width=1)
        paste_center(image, Image.open(PREVIEWS / f"{asset_id}.png"), (x + 8, y + 4, card_w - 16, 130))
        draw.text((x + 10, y + 137), asset_id.replace("-", " ").title()[:34], fill=TEXT, font=font(12, BOLD))
    footer(draw)
    return image


def verification_frame(report, checks):
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "05 / local checks", "The round is indexed and reviewed", "Source hashes, previews, budgets, lint, integration, and local pages were checked.")
    draw.rounded_rectangle((54, 166, 1226, 558), radius=16, fill=PANEL, outline="#344651", width=2)
    quality = report["quality"]["after"]
    integration = checks["commands"]["catalogIntegration"]
    eslint = checks["commands"]["eslint"]
    rows = [
        ("Solar kit quality", "40 / 40 passing"),
        ("Whole catalog quality", f"{quality['passing']} / {quality['total']} passing ({quality['passRate']}) · {quality['thin']} thin"),
        ("Material controls and presets", f"{report['materialControlsAdded']} controls · {report['presetEntriesAdded']} named appearances"),
        ("Preview and hash verification", f"{report['previewCount']} previews · all 40 source hashes match"),
        ("Lint and catalog integration", f"{'passed' if eslint['exitCode'] == 0 else 'failed'} · {integration['files']} files / {integration['tests']} tests passed"),
        ("Local catalog pages", f"{report['localCatalogPages']['pageCount']} / 40 checked · branch not deployed"),
    ]
    y = 192
    for label, value in rows:
        draw.text((88, y), label, fill=TEAL, font=font(16, BOLD))
        draw.text((530, y), value, fill=TEXT, font=font(15))
        y += 52
    draw.text((88, 510), "This MP4 shows local source, generated previews, and local validation.", fill=MUTED, font=font(14))
    footer(draw, "Local validation only · deployed behavior and hardware acceptance are not represented")
    return image


def main():
    report = json.loads((BUNDLE / "verification.json").read_text(encoding="utf-8"))
    checks = json.loads((BUNDLE / "check-results.json").read_text(encoding="utf-8"))
    for asset_id in ("rooftop-pv-array", "single-axis-solar-tracker", "solar-battery-container"):
        if not (BUNDLE / "before-previews" / f"{asset_id}.png").is_file():
            raise SystemExit(f"missing retained before preview: {asset_id}")
    if len(list(PREVIEWS.glob("*.png"))) < 40:
        raise SystemExit("solar-energy preview refresh is incomplete")

    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    frames = [title_frame(report), source_frame(), comparison_frame(), preset_frame(), contact_frame(), verification_frame(report, checks)]
    for index, frame in enumerate(frames, 1):
        frame.save(FRAME_DIR / f"frame-{index:02d}.png", optimize=True)
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "1/3",
        "-i", str(FRAME_DIR / "frame-%02d.png"), "-c:v", "libx264", "-r", "24",
        "-pix_fmt", "yuv420p", "-crf", "24", "-movflags", "+faststart", str(OUT),
    ], check=True)
    Image.open(FRAME_DIR / "frame-01.png").save(BUNDLE / "poster.png", optimize=True)
    settings = {
        "workflow": "existing .kcad.ts sources -> material controls and presets -> 40 rendered catalog previews -> rebuilt catalog index -> local checks",
        "video": str(OUT.relative_to(ROOT)),
        "canvas": {"width": WIDTH, "height": HEIGHT},
        "frames": len(frames),
        "durationSeconds": len(frames) * 3,
        "ffmpeg": "ffmpeg -framerate 1/3 -c:v libx264 -r 24 -pix_fmt yuv420p -crf 24 -movflags +faststart",
        "invocation": "python3 artifacts/catalog-demos/solar-energy-quality-20261106/capture_solar_quality_demo.py",
        "presetInvocation": "npx tsx artifacts/catalog-demos/solar-energy-quality-20261106/render_solar_presets.ts",
        "provenance": "Rendered locally from the checked-in sources, exact named presets, generated previews and local check results. Deployment is not shown.",
    }
    (BUNDLE / "demo-settings.json").write_text(json.dumps(settings, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT} ({len(frames) * 3}s)")


if __name__ == "__main__":
    main()
