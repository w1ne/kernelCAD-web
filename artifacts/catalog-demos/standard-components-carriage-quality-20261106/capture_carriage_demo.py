#!/usr/bin/env python3
"""Capture the local source-to-preview workflow for the guide-carriage update."""

import json
import subprocess
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
SOURCE = ROOT / "catalog/kits/standard-components/linear-guide-carriage.kcad.ts"
PREVIEW = ROOT / "catalog/kits/standard-components/previews/linear-guide-carriage.png"
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, TEAL = "#101923", "#1d2935", "#eef3f5", "#a6b6c0", "#61c6bf"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
FRAME_DIR = BUNDLE / "frames"
OUT = BUNDLE / "linear-guide-carriage-quality.mp4"


def font(size, path=FONT):
    return ImageFont.truetype(path, size)


def canvas():
    return Image.new("RGB", (WIDTH, HEIGHT), BG)


def header(draw, section, title, detail):
    draw.text((54, 30), section.upper(), fill=TEAL, font=font(16, BOLD))
    draw.text((54, 62), title, fill=TEXT, font=font(31, BOLD))
    draw.text((54, 105), detail, fill=MUTED, font=font(16))


def footer(draw, detail="Local source and renders · deployed behavior is not shown"):
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


def source_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "01 / source", "One carriage, three useful materials", "Steel body and pad · polymer wiper ends · brass lubrication fitting")
    source = SOURCE.read_text().splitlines()
    chosen = []
    for line in source:
        stripped = line.strip()
        if stripped.startswith("const size") or "= param('" in stripped or stripped.startswith("presets({") or stripped.startswith("dark:") or stripped.startswith("brass:") or stripped.startswith("weathered:"):
            chosen.append(stripped)
    d.rounded_rectangle((54, 164, 664, 584), radius=14, fill=PANEL, outline="#344651", width=1)
    y = 187
    for line in chosen[:14]:
        wrapped = textwrap.wrap(line, width=65, subsequent_indent="  ") or [line]
        for part in wrapped:
            d.text((76, y), part, fill=TEAL if "param" in line or line.startswith("presets") else TEXT, font=font(13, MONO))
            y += 22
    d.rounded_rectangle((700, 164, 1226, 584), radius=14, fill=PANEL, outline="#344651", width=1)
    paste_center(im, Image.open(PREVIEW), (718, 176, 490, 350))
    d.text((730, 540), "Four mounting wells · raised grease fitting", fill=TEXT, font=font(15))
    d.text((730, 565), "Open U-channel · paired polymer wipers", fill=TEAL, font=font(15, BOLD))
    footer(d)
    return im


def before_after_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "02 / preview review", "The catalog angle now shows the component details", "Existing preview at left · refreshed local source render at right")
    old = Image.open(BUNDLE / "before/linear-guide-carriage.png")
    new = Image.open(PREVIEW)
    for x, title, image in [(54, "Before · two grey blocks", old), (650, "After · wipers, wells, grease fitting", new)]:
        d.rounded_rectangle((x, 164, x + 576, 608), radius=14, fill=PANEL, outline="#344651", width=1)
        d.text((x + 22, 181), title, fill=TEAL, font=font(17, BOLD))
        paste_center(im, image, (x + 18, 214, 540, 380))
    footer(d)
    return im


def size_frame(variants):
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "03 / size choice", "Scale the complete carriage", "The compact / standard / large choice changes the model bounds; each render uses the same frame scale.")
    ids = ["compact-default", "standard-default", "large-default"]
    titles = {"compact-default": "Compact", "standard-default": "Standard", "large-default": "Large"}
    by_id = {item["id"]: item for item in variants}
    for i, asset_id in enumerate(ids):
        x = 54 + i * 394
        item = by_id[asset_id]
        d.rounded_rectangle((x, 164, x + 374, 608), radius=14, fill=PANEL, outline="#344651", width=1)
        d.text((x + 22, 181), titles[asset_id], fill=TEAL, font=font(18, BOLD))
        paste_center(im, Image.open(ROOT / item["png"]), (x + 18, 210, 338, 332))
        dx, dy, dz = item["dimensionsMm"]
        d.text((x + 22, 552), f"{dx:g} × {dy:g} × {dz:g} mm", fill=TEXT, font=font(15, MONO))
    footer(d)
    return im


def presets_frame(variants):
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "04 / presets", "Choose a finish for each visible material", "The named palettes update steel, polymer and brass independently while preserving the geometry.")
    ids = ["standard-default", "standard-dark", "standard-brass", "standard-weathered"]
    titles = ["Default", "Dark", "Brass", "Weathered"]
    by_id = {item["id"]: item for item in variants}
    for i, (asset_id, title) in enumerate(zip(ids, titles)):
        x = 54 + i * 296
        item = by_id[asset_id]
        d.rounded_rectangle((x, 164, x + 276, 608), radius=12, fill=PANEL, outline="#344651", width=1)
        d.text((x + 18, 181), title, fill=TEAL, font=font(17, BOLD))
        paste_center(im, Image.open(ROOT / item["png"]), (x + 10, 210, 256, 300))
        d.text((x + 18, 534), "Steel · polymer · brass", fill=TEXT, font=font(12))
    footer(d)
    return im


def verification_frame(report):
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "05 / local verification", "The source, previews and catalog index agree", "Local checks cover the edited mesh, generated preview path, source hash, lint and catalog integration.")
    d.rounded_rectangle((54, 164, 1226, 592), radius=16, fill=PANEL, outline="#344651", width=2)
    lines = [
        ("Carriage mesh", f"{report['triangleCount']} triangles / {report['triangleBudget']} budget"),
        ("Kit quality gate", f"{report['kitPassing']} / {report['kitTotal']} passing"),
        ("Whole catalog quality", f"{report['catalogPassing']} / {report['catalogTotal']} passing ({report['catalogPassRate']})"),
        ("Kit previews and index", f"{report['previewCount']} / 50 refreshed · source hashes match"),
        ("Lint and integration", f"{report['eslint']} · {report['integrationFiles']} files / {report['integrationTests']} tests"),
        ("Local catalog page", report["localPage"]),
    ]
    y = 193
    for label, value in lines:
        d.text((86, y), label, fill=TEAL, font=font(16, BOLD))
        d.text((495, y), value, fill=TEXT, font=font(16))
        y += 54
    d.text((86, 536), "This video shows local source evaluation and preview generation.", fill=MUTED, font=font(14))
    footer(d, "Branch not deployed · no physical or hardware acceptance is represented")
    return im


def main():
    report_path = BUNDLE / "verification.json"
    variants_path = BUNDLE / "variant-renders.json"
    if not report_path.exists() or not variants_path.exists():
        raise SystemExit("write verification.json and render variants before capturing the demo")
    report = json.loads(report_path.read_text())
    variants = json.loads(variants_path.read_text())["renders"]
    required = {"standard-default", "compact-default", "large-default", "standard-dark", "standard-brass", "standard-weathered"}
    if {item["id"] for item in variants} != required:
        raise SystemExit("the size and preset renders are incomplete")
    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    frames = [source_frame(), before_after_frame(), size_frame(variants), presets_frame(variants), verification_frame(report)]
    for i, frame in enumerate(frames, 1):
        frame.save(FRAME_DIR / f"frame-{i:02d}.png", optimize=True)
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "1/3",
        "-i", str(FRAME_DIR / "frame-%02d.png"), "-c:v", "libx264", "-r", "24",
        "-pix_fmt", "yuv420p", "-crf", "23", "-movflags", "+faststart", str(OUT),
    ], check=True)
    Image.open(FRAME_DIR / "frame-01.png").save(BUNDLE / "poster.png", optimize=True)
    settings = json.loads((BUNDLE / "demo-settings.json").read_text())
    settings.update({
        "video": "artifacts/catalog-demos/standard-components-carriage-quality-20261106/linear-guide-carriage-quality.mp4",
        "captureInvocation": "python3 artifacts/catalog-demos/standard-components-carriage-quality-20261106/capture_carriage_demo.py",
        "canvas": {"width": WIDTH, "height": HEIGHT},
        "frames": len(frames),
        "durationSeconds": len(frames) * 3,
        "ffmpeg": "ffmpeg -framerate 1/3 -c:v libx264 -r 24 -pix_fmt yuv420p -crf 23 -movflags +faststart",
        "provenance": "Generated from the checked-in .kcad.ts source, actual named preset values and local catalog preview. Deployment is not shown.",
    })
    (BUNDLE / "demo-settings.json").write_text(json.dumps(settings, indent=2) + "\n")
    print(f"wrote {OUT} ({len(frames) * 3}s)")


if __name__ == "__main__":
    main()
