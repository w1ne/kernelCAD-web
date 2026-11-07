#!/usr/bin/env python3
"""Capture the local source-to-render workflow for three standard components."""

import json
import re
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, TEAL = "#101923", "#1d2935", "#eef3f5", "#a6b6c0", "#61c6bf"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
ASSETS = [
    {
        "id": "timing-belt-pulley",
        "title": "Timing belt pulley",
        "detail": "20-tooth crown · keyed bore · bolted flanges",
    },
    {
        "id": "door-hinge",
        "title": "Door hinge",
        "detail": "Upright leaves · alternating knuckles · 12 fasteners",
    },
    {
        "id": "din-rail-terminal-block",
        "title": "DIN rail terminal block",
        "detail": "Copper cages · slotted screws · clip foot",
    },
]
FRAME_DIR = BUNDLE / "frames"
OUT = BUNDLE / "standard-components-visible-details.mp4"


def font(size, path=FONT):
    return ImageFont.truetype(path, size)


def canvas():
    return Image.new("RGB", (WIDTH, HEIGHT), BG)


def header(draw, section, title, detail):
    draw.text((46, 24), section.upper(), fill=TEAL, font=font(15, BOLD))
    draw.text((46, 54), title, fill=TEXT, font=font(30, BOLD))
    draw.text((46, 96), detail, fill=MUTED, font=font(15))


def footer(draw, detail="Local source evaluation and renders · branch not deployed · no physical acceptance"):
    draw.line((46, 678, WIDTH - 46, 678), fill="#35434e", width=1)
    draw.text((46, 688), detail, fill=MUTED, font=font(12))


def fit(image, size):
    out = image.convert("RGB")
    out.thumbnail(size, Image.Resampling.LANCZOS)
    return out


def paste_center(target, image, box):
    x, y, w, h = box
    preview = fit(image, (w, h))
    target.paste(preview, (x + (w - preview.width) // 2, y + (h - preview.height) // 2))


def source_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "01 / source", "Three modelled details, three useful material zones", "Existing assets · new geometry stays in native kernelCAD .kcad.ts source")
    for i, asset in enumerate(ASSETS):
        x = 46 + i * 398
        source = (ROOT / f"catalog/kits/standard-components/{asset['id']}.kcad.ts").read_text()
        colors = re.findall(r"param\('([^']+)',\s*'(#[0-9a-fA-F]{6})'", source)
        d.rounded_rectangle((x, 152, x + 376, 610), radius=14, fill=PANEL, outline="#344651", width=1)
        d.text((x + 18, 168), asset["title"], fill=TEXT, font=font(18, BOLD))
        d.text((x + 18, 202), asset["detail"], fill=TEAL, font=font(12, BOLD))
        d.text((x + 18, 250), "MATERIAL CONTROLS", fill=MUTED, font=font(12, BOLD))
        y = 276
        for name, color in colors:
            d.rounded_rectangle((x + 18, y, x + 48, y + 22), radius=4, fill=color)
            d.text((x + 58, y + 1), name, fill=TEXT, font=font(14, MONO))
            y += 36
        d.line((x + 18, 394, x + 358, 394), fill="#35434e", width=1)
        d.text((x + 18, 415), "PRESETS", fill=MUTED, font=font(12, BOLD))
        d.text((x + 18, 444), "dark · brass · weathered", fill=TEXT, font=font(14, MONO))
        d.text((x + 18, 500), "Compact / standard / large", fill=MUTED, font=font(13))
        d.text((x + 18, 544), "Geometry and color stay editable", fill=TEXT, font=font(13))
    footer(d)
    return im


def before_after_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "02 / preview review", "Remove the three flat silhouettes", "Previous checked-in catalog previews at left · final local renders at right")
    for i, asset in enumerate(ASSETS):
        x = 46 + i * 398
        before = Image.open(BUNDLE / f"before/{asset['id']}.png")
        after = Image.open(ROOT / f"catalog/kits/standard-components/previews/{asset['id']}.png")
        d.rounded_rectangle((x, 152, x + 376, 610), radius=14, fill=PANEL, outline="#344651", width=1)
        d.text((x + 16, 166), asset["title"], fill=TEXT, font=font(17, BOLD))
        d.text((x + 16, 200), "Before · source defects", fill=MUTED, font=font(13))
        paste_center(im, before, (x + 12, 219, 352, 142))
        d.line((x + 16, 376, x + 360, 376), fill="#35434e", width=1)
        d.text((x + 16, 391), "After · recognizable parts and color", fill=TEAL, font=font(13, BOLD))
        paste_center(im, after, (x + 12, 415, 352, 172))
    footer(d)
    return im


def geometry_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "03 / object details", "Each preview reads from its defining parts", "Default catalog angles · colored zones follow separate modeled components")
    notes = [
        "Tooth crown · flange bolts · shaft key",
        "Steel leaves · brass pin · fasteners",
        "Polymer body · copper cages · steel clip",
    ]
    for i, asset in enumerate(ASSETS):
        x = 46 + i * 398
        d.rounded_rectangle((x, 152, x + 376, 610), radius=14, fill=PANEL, outline="#344651", width=1)
        d.text((x + 18, 168), asset["title"], fill=TEXT, font=font(17, BOLD))
        preview = Image.open(ROOT / f"catalog/kits/standard-components/previews/{asset['id']}.png")
        paste_center(im, preview, (x + 12, 198, 352, 320))
        d.text((x + 18, 540), notes[i], fill=TEAL, font=font(12, BOLD))
        row = json.loads((BUNDLE / "asset-check-results.json").read_text())[asset["id"]]
        d.text((x + 18, 567), f"{row['triangles']} triangles / {row['triangleBudget']} budget", fill=MUTED, font=font(12, MONO))
    footer(d)
    return im


def preset_frame(variants):
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "04 / material presets", "Named looks change each asset's material zones", "Default · dark · brass · weathered renders were generated from the actual source presets")
    by_id = {item["id"]: item for item in variants}
    styles = ["standard", "dark", "brass", "weathered"]
    for row, style in enumerate(styles):
        for col, asset in enumerate(ASSETS):
            x = 46 + col * 398
            y = 144 + row * 129
            d.rounded_rectangle((x, y, x + 376, y + 120), radius=10, fill=PANEL, outline="#344651", width=1)
            item = by_id[f"{asset['id']}-{style}"]
            paste_center(im, Image.open(ROOT / item["png"]), (x + 8, y + 8, 204, 104))
            d.text((x + 222, y + 25), asset["title"], fill=TEXT, font=font(12, BOLD))
            d.text((x + 222, y + 50), style.capitalize(), fill=TEAL, font=font(15, BOLD))
            d.text((x + 222, y + 78), "separate controls", fill=MUTED, font=font(11))
    footer(d)
    return im


def size_frame(variants):
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "05 / size parameter", "The pulley scales as one complete object", "Compact / standard / large size choices change the generated bounds; geometry stays toothed")
    by_id = {item["id"]: item for item in variants}
    choices = ["compact", "standard", "large"]
    for i, choice in enumerate(choices):
        x = 46 + i * 398
        d.rounded_rectangle((x, 152, x + 376, 610), radius=14, fill=PANEL, outline="#344651", width=1)
        item = by_id[f"timing-belt-pulley-{choice}"]
        d.text((x + 18, 168), choice.capitalize(), fill=TEAL, font=font(18, BOLD))
        paste_center(im, Image.open(ROOT / item["png"]), (x + 18, 202, 340, 314))
        dx, dy, dz = item["dimensionsMm"]
        d.text((x + 18, 550), f"{dx:g} × {dy:g} × {dz:g} mm", fill=TEXT, font=font(14, MONO))
        d.text((x + 18, 578), f"{item['triangles']} triangles", fill=MUTED, font=font(12))
    footer(d)
    return im


def verification_frame(report):
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "06 / local verification", "The edited sources, previews and index agree", "Checks cover the three meshes, all 50 kit previews, source hashes, lint, catalog pages and integration tests")
    d.rounded_rectangle((46, 152, WIDTH - 46, 610), radius=16, fill=PANEL, outline="#344651", width=2)
    rows = [
        ("Refined assets", "3 existing assets · no new IDs or kits"),
        ("Kit quality gate", f"{report['kitPassing']} / {report['kitTotal']} passing"),
        ("Whole catalog quality", f"{report['catalogPassing']} / {report['catalogTotal']} passing ({report['catalogPassRate']})"),
        ("Kit previews and index", f"{report['previewCount']} / 50 regenerated · source hashes match"),
        ("Lint and integration", f"{report['eslint']} · {report['integrationFiles']} files / {report['integrationTests']} tests"),
        ("Local catalog pages", report["localPage"]),
    ]
    y = 180
    for label, value in rows:
        d.text((78, y), label, fill=TEAL, font=font(16, BOLD))
        d.text((470, y), value, fill=TEXT, font=font(16))
        y += 55
    d.text((78, 532), "The MP4 documents local modeling, preset replay and preview generation.", fill=MUTED, font=font(14))
    footer(d, "Branch not deployed · no vendor-standard, manufacturing or physical acceptance is represented")
    return im


def main():
    verification = json.loads((BUNDLE / "verification.json").read_text())
    variants = json.loads((BUNDLE / "variant-renders.json").read_text())["renders"]
    if len(variants) != 18:
        raise SystemExit(f"expected 18 size/preset renders, got {len(variants)}")
    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    frames = [
        source_frame(), before_after_frame(), geometry_frame(),
        preset_frame(variants), size_frame(variants), verification_frame(verification),
    ]
    for i, frame in enumerate(frames, 1):
        frame.save(FRAME_DIR / f"frame-{i:02d}.png", optimize=True)
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "1/3",
        "-i", str(FRAME_DIR / "frame-%02d.png"), "-c:v", "libx264", "-r", "24",
        "-pix_fmt", "yuv420p", "-crf", "23", "-movflags", "+faststart", str(OUT),
    ], check=True)
    Image.open(FRAME_DIR / "frame-02.png").save(BUNDLE / "poster.png", optimize=True)
    settings_path = BUNDLE / "demo-settings.json"
    settings = json.loads(settings_path.read_text())
    settings.update({
        "video": "artifacts/catalog-demos/standard-components-visible-details-20261106/standard-components-visible-details.mp4",
        "captureInvocation": "python3 artifacts/catalog-demos/standard-components-visible-details-20261106/capture_visible_details_demo.py",
        "canvas": {"width": WIDTH, "height": HEIGHT},
        "frames": len(frames),
        "durationSeconds": len(frames) * 3,
        "ffmpeg": "ffmpeg -framerate 1/3 -c:v libx264 -r 24 -pix_fmt yuv420p -crf 23 -movflags +faststart",
        "provenance": "Frames use the checked-in .kcad.ts sources, source-declared material presets, generated kit previews and local verification evidence. Deployment and hardware acceptance are not shown.",
    })
    settings_path.write_text(json.dumps(settings, indent=2) + "\n")
    print(f"wrote {OUT} ({len(frames) * 3}s)")


if __name__ == "__main__":
    main()
