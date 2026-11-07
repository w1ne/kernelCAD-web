#!/usr/bin/env python3
"""Capture the nature source, named presets, rendered previews and local checks."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/nature"
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, TEAL = "#101923", "#1d2935", "#eef3f5", "#a6b6c0", "#61c6bf"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
FRAME_DIR = BUNDLE / "frames"
OUT = BUNDLE / "nature-quality-demo.mp4"
ASSETS = [
    ("cairn", ["dark", "sandstone"], "A balanced stack of irregular, layered stones"),
    ("pebble-cluster", ["beach", "red"], "A scattered bed of flattened river pebbles"),
    ("dead-tree", ["charred", "bleached"], "Forked trunk, branching limbs and pale cut wood"),
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
    draw.text((72, 144), "NATURE, WITH MATERIALS", fill=TEXT, font=font(42, BOLD))
    draw.text((76, 220), "Three existing assets · distinctive stones and exposed heartwood", fill=TEXT, font=font(21))
    draw.rounded_rectangle((72, 310, 1208, 508), radius=18, fill=PANEL, outline="#344651", width=2)
    draw.text((108, 346), "Stone · accent stone · bark · heartwood", fill=TEAL, font=font(27, BOLD))
    draw.text((108, 399), "Existing size/count controls · six rendered named looks", fill=TEXT, font=font(18))
    before, after = report["quality"]["before"], report["quality"]["after"]
    draw.text((108, 449), f"Catalog gate {before['passing']}/{before['total']} → {after['passing']}/{after['total']} passing", fill=MUTED, font=font(18))
    footer(draw)
    return image


def source_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "01 / author", "Material controls follow the modeled parts", "Stone colors distinguish each stone; heartwood colors the exposed ends of the tree's main branches.")
    draw.rounded_rectangle((54, 158, 742, 600), radius=14, fill=PANEL, outline="#344651", width=1)
    chosen = []
    for name in ["cairn", "pebble-cluster", "dead-tree"]:
        lines = (KIT / f"{name}.kcad.ts").read_text(encoding="utf-8").splitlines()
        for line in lines:
            stripped = line.strip()
            if "param('stoneColor'" in stripped or "param('accentColor'" in stripped or "param('heartwood'" in stripped:
                chosen.append(stripped)
            elif stripped.startswith("charred:") or stripped.startswith("bleached:"):
                chosen.append(stripped)
            elif "color(heartwood)" in stripped or "color(i % 3 === 1 ? accentColor" in stripped:
                chosen.append(stripped)
    y = 184
    for line in chosen[:11]:
        draw.text((72, y), line[:82], fill=TEAL if "param(" in line or "charred:" in line or "bleached:" in line else TEXT, font=font(12, MONO))
        y += 34
    draw.rounded_rectangle((770, 158, 1226, 600), radius=14, fill=PANEL, outline="#344651", width=1)
    paste_center(image, Image.open(KIT / "previews/dead-tree.png"), (786, 176, 424, 300))
    draw.text((800, 500), "Dead tree · 336 triangles", fill=TEAL, font=font(15, BOLD))
    draw.text((800, 530), "The cut faces use heartwood; the limbs retain bark.", fill=TEXT, font=font(13))
    footer(draw)
    return image


def asset_frame(step, asset_id, presets, detail, variants):
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, f"{step:02d} / choose a look", asset_id.replace("-", " ").title(), detail)
    names = ["default", *presets]
    card_width = 368
    gap = 24
    start_x = 54
    variant_lookup = {(row["assetId"], row["preset"]): row for row in variants["variants"]}
    for idx, name in enumerate(names):
        x = start_x + idx * (card_width + gap)
        draw.rounded_rectangle((x, 158, x + card_width, 612), radius=14, fill=PANEL, outline="#344651", width=1)
        draw.text((x + 18, 176), name.upper(), fill=TEAL if name != "default" else MUTED, font=font(15, BOLD))
        if name == "default":
            path = KIT / "previews" / f"{asset_id}.png"
            params = "indexed default"
        else:
            row = variant_lookup[(asset_id, name)]
            path = BUNDLE / row["png"]
            params = " · ".join(f"{key}={value}" for key, value in row["values"].items())
        paste_center(image, Image.open(path), (x + 18, 210, card_width - 36, 310))
        draw.text((x + 18, 544), params[:39], fill=TEXT, font=font(11, MONO))
        draw.text((x + 18, 570), "source preset · rendered locally", fill=MUTED, font=font(11))
    footer(draw)
    return image


def verification_frame(report, checks):
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "05 / local checks", "All nature assets have indexed previews", "The updated sources, rendered kit, generated index and local asset pages agree.")
    draw.rounded_rectangle((54, 166, 1226, 558), radius=16, fill=PANEL, outline="#344651", width=2)
    commands = checks["commands"]
    rows = [
        ("Nature quality", f"{report['kitQuality']['passing']} / {report['kitQuality']['total']} passing"),
        ("Whole catalog quality", f"{report['quality']['after']['passing']} / {report['quality']['after']['total']} passing ({report['quality']['after']['passRate']}) · {report['quality']['after']['thin']} thin remain"),
        ("Material and preset changes", "1 color knob added · 2 existing palette pairs updated"),
        ("Rendered and indexed previews", f"{report['previewCount']} / {report['kitAssetCount']} nature previews"),
        ("Lint and catalog integration", f"lint passed · {commands['catalogIntegration']['files']} files / {commands['catalogIntegration']['tests']} tests passed"),
        ("Generated local pages", f"{report['localCatalogPages']['workspacePages']} pages · 3 nature pages checked · branch not deployed"),
    ]
    y = 192
    for label, value in rows:
        draw.text((88, y), label, fill=TEAL, font=font(16, BOLD))
        draw.text((530, y), value, fill=TEXT, font=font(14))
        y += 52
    footer(draw, "Local render and validation only · deployed behavior and physical acceptance are not represented")
    return image


def main():
    report = json.loads((BUNDLE / "verification.json").read_text(encoding="utf-8"))
    checks = json.loads((BUNDLE / "check-results.json").read_text(encoding="utf-8"))
    variants = json.loads((BUNDLE / "preset-variants.json").read_text(encoding="utf-8"))
    if len(list(KIT.glob("previews/*.png"))) < report["kitAssetCount"]:
        raise SystemExit("nature preview set is incomplete")

    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    frames = [
        title_frame(report),
        source_frame(),
        *[asset_frame(step, asset_id, presets, detail, variants) for step, (asset_id, presets, detail) in enumerate(ASSETS, start=2)],
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
        "workflow": "three existing nature .kcad.ts sources -> named material controls and existing looks -> source-driven preset exports -> rendered previews -> local catalog and page checks",
        "video": str(OUT.relative_to(ROOT)),
        "canvas": {"width": WIDTH, "height": HEIGHT},
        "frames": len(frames),
        "durationSeconds": len(frames) * 3,
        "ffmpeg": "ffmpeg -framerate 1/3 -c:v libx264 -r 24 -pix_fmt yuv420p -crf 24 -movflags +faststart",
        "invocation": "python3 artifacts/catalog-demos/nature-quality-20261106/capture_nature_demo.py",
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
