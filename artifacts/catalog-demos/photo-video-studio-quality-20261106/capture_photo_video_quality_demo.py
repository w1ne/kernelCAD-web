#!/usr/bin/env python3
"""Capture the local photo/video asset source, presets and preview workflow."""

import json
import re
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/photo-video-studio"
PREVIEWS = KIT / "previews"
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, TEAL = "#101923", "#1d2935", "#eef3f5", "#a6b6c0", "#61c6bf"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
FRAME_DIR = BUNDLE / "frames"
OUT = BUNDLE / "photo-video-studio-quality-demo.mp4"


def font(size, path=FONT):
    return ImageFont.truetype(path, size)


def canvas():
    return Image.new("RGB", (WIDTH, HEIGHT), BG)


def header(draw, section, title, detail):
    draw.text((54, 30), section.upper(), fill=TEAL, font=font(16, BOLD))
    draw.text((54, 62), title, fill=TEXT, font=font(32, BOLD))
    draw.text((54, 105), detail, fill=MUTED, font=font(16))


def footer(draw, detail="Local .kcad.ts source and rendered previews · deployed behavior is not shown"):
    draw.line((54, 678, WIDTH - 54, 678), fill="#35434e", width=1)
    draw.text((54, 688), detail, fill=MUTED, font=font(12))


def fit(image, size):
    out = image.convert("RGB")
    out.thumbnail(size, Image.Resampling.LANCZOS)
    return out


def centered_paste(target, image, box):
    x, y, w, h = box
    preview = fit(image, (w, h))
    target.paste(preview, (x + (w - preview.width) // 2, y + (h - preview.height) // 2))


def title_frame(report):
    im = canvas()
    d = ImageDraw.Draw(im)
    d.text((72, 80), "kernelCAD  /  CATALOG QUALITY", fill=TEAL, font=font(18, BOLD))
    d.text((72, 144), "PHOTO & VIDEO, WITH MATERIALS", fill=TEXT, font=font(42, BOLD))
    d.text((76, 220), "40 existing camera, optics, support and lighting assets", fill=TEXT, font=font(24))
    d.rounded_rectangle((72, 310, 1208, 508), radius=18, fill=PANEL, outline="#344651", width=2)
    d.text((108, 346), f"{report['materialControls']} material controls", fill=TEAL, font=font(29, BOLD))
    d.text((108, 396), "Separate body, rubber, metal, glass and fabric surfaces", fill=TEXT, font=font(21))
    d.text((108, 445), "Two named looks per asset · same 40 IDs · 40 refreshed previews", fill=MUTED, font=font(18))
    footer(d)
    return im


def source_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "01 / edit", "A camera with useful material controls", "The DSLR keeps its optical silhouette and separates shell, grip, glass and hardware.")
    source = (KIT / "digital-slr-camera.kcad.ts").read_text().splitlines()
    chosen = []
    for line in source:
        stripped = line.strip()
        if stripped.startswith("const scale"):
            chosen.append("const scale = param('scale', 1)")
        elif "= param('" in stripped:
            match = re.search(r"const (\w+) = param\('(\w+)', ('[^']+'|[0-9.]+)", stripped)
            if match and match.group(1) != "scale":
                chosen.append(f"const {match.group(1)} = param('{match.group(2)}', {match.group(3)})")
    material_map = json.loads((BUNDLE / "material-map.json").read_text())["assets"]
    dslr = next(row for row in material_map if row["assetId"] == "digital-slr-camera")
    for preset in ("studioBlack", "fieldRental"):
        values = dslr["presets"][preset]
        chosen.append(f"{preset}: polymer {values['polymer']} · glass {values['glass']}")
    d.rounded_rectangle((54, 164, 686, 572), radius=14, fill=PANEL, outline="#344651", width=1)
    y = 186
    for line in chosen[:12]:
        d.text((76, y), line[:74], fill=TEXT if "param" in line else TEAL, font=font(12, MONO))
        y += 31
    d.rounded_rectangle((722, 164, 1226, 572), radius=14, fill=PANEL, outline="#344651", width=1)
    centered_paste(im, Image.open(PREVIEWS / "digital-slr-camera.png"), (742, 176, 464, 326))
    d.text((752, 514), "Polymer body · rubber grip · metal rings", fill=TEXT, font=font(15))
    d.text((752, 541), "Blue viewfinder and lens glass remain independently editable", fill=TEAL, font=font(13, BOLD))
    footer(d)
    return im


def comparison_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "02 / before and after", "Material separation across the kit", "Committed one-color preview at left; refreshed local render at right.")
    pairs = ["digital-slr-camera", "telephoto-lens", "softbox-light"]
    before = BUNDLE / "before-previews"
    y0 = 158
    for i, asset_id in enumerate(pairs):
        y = y0 + i * 166
        title = asset_id.replace("-", " ").title()
        d.rounded_rectangle((54, y, 1226, y + 151), radius=10, fill=PANEL, outline="#344651", width=1)
        d.text((72, y + 9), title, fill=TEAL, font=font(14, BOLD))
        centered_paste(im, Image.open(before / f"{asset_id}.png"), (220, y + 22, 390, 120))
        centered_paste(im, Image.open(PREVIEWS / f"{asset_id}.png"), (710, y + 22, 390, 120))
        d.text((320, y + 128), "single flat material", fill=MUTED, font=font(12))
        d.text((805, y + 128), "distinct material zones", fill=TEXT, font=font(12))
    footer(d)
    return im


def presets_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "03 / vary", "Switch the camera's finish", "Both images use exact values from the source's named presets.")
    variants = json.loads((BUNDLE / "preset-variants.json").read_text())["variants"]
    for i, variant in enumerate(variants):
        x = 54 + i * 596
        d.rounded_rectangle((x, 158, x + 572, 600), radius=14, fill=PANEL, outline="#344651", width=1)
        d.text((x + 24, 176), variant["id"], fill=TEAL, font=font(20, BOLD))
        centered_paste(im, Image.open(BUNDLE / variant["png"]), (x + 28, 212, 516, 328))
        values = variant["values"]
        colors = f"polymer {values['polymer']} · glass {values['glass']}"
        d.text((x + 24, 555), colors, fill=TEXT, font=font(13, MONO))
    footer(d)
    return im


def contact_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "04 / browse", "A more readable photo/video kit", "Previews cover camera bodies, optics, grip equipment, soft goods and studio lights.")
    asset_ids = [
        "action-camera", "camera-cage", "digital-slr-camera", "film-rangefinder-camera",
        "macro-lens", "telephoto-lens", "camera-tripod", "follow-focus-unit",
        "beauty-dish-light", "ring-light", "softbox-light", "umbrella-reflector",
    ]
    card_w, card_h, gap_x, gap_y = 278, 165, 18, 10
    for i, asset_id in enumerate(asset_ids):
        col, row = i % 4, i // 4
        x, y = 54 + col * (card_w + gap_x), 158 + row * (card_h + gap_y)
        d.rounded_rectangle((x, y, x + card_w, y + card_h), radius=9, fill=PANEL, outline="#344651", width=1)
        centered_paste(im, Image.open(PREVIEWS / f"{asset_id}.png"), (x + 8, y + 4, card_w - 16, 130))
        d.text((x + 10, y + 137), asset_id.replace("-", " ").title(), fill=TEXT, font=font(13, BOLD))
    footer(d)
    return im


def verification_frame(report):
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "05 / local checks", "The round is indexed and reviewed", "Source, preview, generated index, lint, integration and local pages were checked.")
    d.rounded_rectangle((54, 166, 1226, 558), radius=16, fill=PANEL, outline="#344651", width=2)
    lines = [
        ("Photo/video source quality", f"{report['kitPassing']} / 40 passing"),
        ("Full catalog quality", f"{report['catalogPassing']} / {report['catalogTotal']} passing ({report['catalogPassRate']})"),
        ("Material controls and presets", f"{report['materialControls']} controls · {report['presetEntries']} preset entries"),
        ("Rendered and indexed previews", f"{report['previewCount']} / 40 · source hashes match"),
        ("Lint and catalog integration", f"{report['eslint']} · {report['integrationFiles']} files / {report['integrationTests']} tests"),
    ]
    y = 198
    for label, value in lines:
        d.text((88, y), label, fill=TEAL, font=font(17, BOLD))
        d.text((520, y), value, fill=TEXT, font=font(17))
        y += 56
    d.text((88, 500), "This MP4 shows local catalog validation and preview generation.", fill=MUTED, font=font(15))
    d.text((88, 526), "The branch is not deployed; optical and hardware acceptance are not claimed.", fill=MUTED, font=font(14))
    footer(d, "Local validation only · deployed behavior and physical acceptance are not represented")
    return im


def main():
    report_path = BUNDLE / "verification.json"
    if not report_path.exists():
        raise SystemExit("write verification.json after catalog checks")
    report = json.loads(report_path.read_text())
    for asset_id in ("digital-slr-camera", "telephoto-lens", "softbox-light"):
        if not (BUNDLE / "before-previews" / f"{asset_id}.png").exists():
            raise SystemExit(f"missing retained before preview: {asset_id}")
    if len(list(PREVIEWS.glob("*.png"))) < 40:
        raise SystemExit("photo/video preview refresh is incomplete")
    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    frames = [title_frame(report), source_frame(), comparison_frame(), presets_frame(), contact_frame(), verification_frame(report)]
    for i, frame in enumerate(frames, 1):
        frame.save(FRAME_DIR / f"frame-{i:02d}.png", optimize=True)
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "1/3",
        "-i", str(FRAME_DIR / "frame-%02d.png"), "-c:v", "libx264", "-r", "24",
        "-pix_fmt", "yuv420p", "-crf", "24", "-movflags", "+faststart", str(OUT),
    ], check=True)
    Image.open(FRAME_DIR / "frame-01.png").save(BUNDLE / "poster.png", optimize=True)
    settings = {
        "workflow": "local .kcad.ts sources -> 40 catalog preview renders -> named source presets -> local audit and static-page checks",
        "video": str(OUT.relative_to(ROOT)),
        "canvas": {"width": WIDTH, "height": HEIGHT},
        "frames": len(frames),
        "durationSeconds": len(frames) * 3,
        "ffmpeg": "ffmpeg -framerate 1/3 -c:v libx264 -r 24 -pix_fmt yuv420p -crf 24 -movflags +faststart",
        "invocation": "python3 artifacts/catalog-demos/photo-video-studio-quality-20261106/capture_photo_video_quality_demo.py",
        "provenance": "Rendered locally from committed source, actual named presets, generated previews and local check results; deployment is not shown.",
    }
    (BUNDLE / "demo-settings.json").write_text(json.dumps(settings, indent=2) + "\n")
    print(f"wrote {OUT} ({len(frames) * 3}s)")


if __name__ == "__main__":
    main()
