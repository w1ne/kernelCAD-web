#!/usr/bin/env python3
"""Capture the local city-street source, preset, preview and check workflow."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/city-street"
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, TEAL = "#101923", "#1d2935", "#eef3f5", "#a6b6c0", "#61c6bf"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
FRAME_DIR = BUNDLE / "frames"
OUT = BUNDLE / "city-street-quality-demo.mp4"
ASSETS = [
    ("crosswalk-tile", "fresh", "Transverse zebra bars and edge paint"),
    ("road-tile", "yellowCentre", "Dashed centre line and flush edge paint"),
    ("sidewalk-tile", "brick", "Raised concrete kerb and paving grid"),
    ("playground-slide", "park", "Guarded tower, ladder, roof and trough chute"),
]


def font(size, path=FONT):
    return ImageFont.truetype(path, size)


def canvas():
    return Image.new("RGB", (WIDTH, HEIGHT), BG)


def header(draw, section, title, detail):
    draw.text((54, 30), section.upper(), fill=TEAL, font=font(16, BOLD))
    draw.text((54, 62), title, fill=TEXT, font=font(32, BOLD))
    draw.text((54, 105), detail, fill=MUTED, font=font(16))


def footer(draw, detail="Local kernelCAD source and renders · deployment and physical acceptance are not shown"):
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
    draw.text((72, 144), "CITY STREET, WITH MATERIALS", fill=TEXT, font=font(42, BOLD))
    draw.text((76, 220), "Four existing pavement and playground assets · no IDs added", fill=TEXT, font=font(22))
    draw.rounded_rectangle((72, 310, 1208, 508), radius=18, fill=PANEL, outline="#344651", width=2)
    draw.text((108, 346), "13 named material controls · 8 appearance presets", fill=TEAL, font=font(27, BOLD))
    draw.text((108, 399), "Asphalt · paint · concrete · stone · brick · steel · HDPE · polyethylene", fill=TEXT, font=font(17))
    before, after = report["quality"]["before"], report["quality"]["after"]
    draw.text((108, 449), f"Catalog audit {before['passing']}/{before['total']} → {after['passing']}/{after['total']} passing", fill=MUTED, font=font(18))
    footer(draw)
    return image


def source_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    source_path = KIT / "crosswalk-tile.kcad.ts"
    lines = source_path.read_text(encoding="utf-8").splitlines()
    chosen = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("const asphalt = param(") or stripped.startswith("const stripePaint = param(") or stripped.startswith("const edgePaint = param("):
            chosen.append(stripped)
        elif stripped.startswith("worn:") or stripped.startswith("fresh:"):
            chosen.append(stripped)
        elif ".color(asphalt)" in stripped or ".color(stripePaint)" in stripped or ".color(edgePaint)" in stripped:
            chosen.append(stripped)
    header(draw, "01 / author", "Material names meet their actual geometry", "The source exposes asphalt and two kinds of road paint as separate adjustable controls.")
    draw.rounded_rectangle((54, 158, 718, 578), radius=14, fill=PANEL, outline="#344651", width=1)
    y = 185
    for line in chosen[:10]:
        color = TEAL if "param(" in line or line.startswith("fresh:") or line.startswith("worn:") else TEXT
        draw.text((72, y), line[:84], fill=color, font=font(12, MONO))
        y += 35
    draw.rounded_rectangle((750, 158, 1226, 578), radius=14, fill=PANEL, outline="#344651", width=1)
    paste_center(image, Image.open(KIT / "previews/crosswalk-tile.png"), (766, 174, 444, 322))
    draw.text((776, 514), "6 separate transverse bars over the road base", fill=TEXT, font=font(14))
    draw.text((776, 541), "Flush geometry · 228 triangles", fill=TEAL, font=font(13, BOLD))
    footer(draw)
    return image


def preset_frame(step, asset_id, preset, detail, variants):
    image = canvas()
    row = next(item for item in variants["variants"] if item["assetId"] == asset_id)
    title = asset_id.replace("-", " ").title()
    draw = ImageDraw.Draw(image)
    header(draw, f"{step:02d} / change the look", title, detail)
    draw.rounded_rectangle((54, 158, 610, 602), radius=14, fill=PANEL, outline="#344651", width=1)
    draw.rounded_rectangle((670, 158, 1226, 602), radius=14, fill=PANEL, outline="#344651", width=1)
    draw.text((78, 176), "DEFAULT", fill=MUTED, font=font(16, BOLD))
    draw.text((694, 176), f"PRESET: {preset}", fill=TEAL, font=font(16, BOLD))
    paste_center(image, Image.open(KIT / "previews" / f"{asset_id}.png"), (72, 206, 520, 314))
    paste_center(image, Image.open(BUNDLE / row["png"]), (688, 206, 520, 314))
    short_names = {"galvanizedSteel": "steel", "stainlessSteel": "stainless", "roofPolyethylene": "roofPE"}
    values = " · ".join(f"{short_names.get(name, name)} {value}" for name, value in row["values"].items())
    draw.text((78, 552), values, fill=TEXT, font=font(12, MONO))
    draw.text((78, 578), f"Exact source preset · {row['triangles']} triangles / {row['triangleBudget']} budget", fill=MUTED, font=font(12))
    footer(draw)
    return image


def verification_frame(report, checks):
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "06 / local checks", "The source, preview and index agree", "Local checks cover catalog geometry, quality, lint and generated asset pages.")
    draw.rounded_rectangle((54, 166, 1226, 558), radius=16, fill=PANEL, outline="#344651", width=2)
    quality = report["quality"]["after"]
    kit = report["kitQuality"]
    commands = checks["commands"]
    rows = [
        ("City-street quality", f"{kit['passing']} / {kit['total']} passing"),
        ("Whole catalog quality", f"{quality['passing']} / {quality['total']} passing ({quality['passRate']}) · {quality['thin']} thin remain"),
        ("Material controls and looks", f"{report['materialControlCount']} controls · {report['presetEntryCount']} named looks"),
        ("Rendered and indexed previews", f"{report['previewCount']} / {report['kitAssetCount']} city-street previews"),
        ("Lint and catalog integration", f"lint passed · {commands['catalogIntegration']['files']} files / {commands['catalogIntegration']['tests']} tests passed"),
        ("Generated local pages", f"{report['localCatalogPages']['workspacePages']} pages · {report['localCatalogPages']['assetsChecked']} checked · branch not deployed"),
    ]
    y = 192
    for label, value in rows:
        draw.text((88, y), label, fill=TEAL, font=font(16, BOLD))
        draw.text((530, y), value, fill=TEXT, font=font(14))
        y += 52
    draw.text((88, 510), "These are local source, export, preview and page checks.", fill=MUTED, font=font(14))
    footer(draw, "Local validation only · deployed behavior and physical acceptance are not represented")
    return image


def main():
    report = json.loads((BUNDLE / "verification.json").read_text(encoding="utf-8"))
    checks = json.loads((BUNDLE / "check-results.json").read_text(encoding="utf-8"))
    variants = json.loads((BUNDLE / "preset-variants.json").read_text(encoding="utf-8"))
    if len(list(KIT.glob("previews/*.png"))) < report["kitAssetCount"]:
        raise SystemExit("city-street preview set is incomplete")

    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    frames = [
        title_frame(report),
        source_frame(),
        *[preset_frame(step, asset_id, preset, detail, variants) for step, (asset_id, preset, detail) in enumerate(ASSETS, start=2)],
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
        "workflow": "four existing city-street .kcad.ts sources -> material-specific color controls and named presets -> indexed previews -> local catalog and page checks",
        "video": str(OUT.relative_to(ROOT)),
        "canvas": {"width": WIDTH, "height": HEIGHT},
        "frames": len(frames),
        "durationSeconds": len(frames) * 3,
        "ffmpeg": "ffmpeg -framerate 1/3 -c:v libx264 -r 24 -pix_fmt yuv420p -crf 24 -movflags +faststart",
        "invocation": "python3 artifacts/catalog-demos/city-street-quality-20261106/capture_city_street_demo.py",
        "presetInvocation": variants["invocation"],
        "previewInvocation": report["previewCommand"],
        "indexInvocation": report["indexCommand"],
        "checks": checks["commands"],
        "provenance": "Local renders from checked-in source and exact named presets, with generated catalog previews and local verification. No live Studio session or deployment is shown.",
    }
    (BUNDLE / "demo-settings.json").write_text(json.dumps(settings, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT} ({len(frames) * 3}s)")


if __name__ == "__main__":
    main()
