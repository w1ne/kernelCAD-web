#!/usr/bin/env python3
"""Capture the local source-to-preview music catalog promotion as a short MP4."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/music"
PREVIEWS = KIT / "previews"
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, TEAL = "#101923", "#1d2935", "#eef3f5", "#a6b6c0", "#61c6bf"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
FRAME_DIR = BUNDLE / "frames"
OUT = BUNDLE / "music-quality-demo.mp4"


def font(size, path=FONT):
    return ImageFont.truetype(path, size)


def canvas():
    return Image.new("RGB", (WIDTH, HEIGHT), BG)


def header(draw, section, title, detail):
    draw.text((54, 30), section.upper(), fill=TEAL, font=font(16, BOLD))
    draw.text((54, 62), title, fill=TEXT, font=font(32, BOLD))
    draw.text((54, 105), detail, fill=MUTED, font=font(16))


def footer(draw, detail="Local model source and rendered previews · deployed behavior is not shown"):
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
    d.text((72, 144), "MUSIC, WITH MATERIALS", fill=TEXT, font=font(50, BOLD))
    d.text((76, 220), "40 existing instruments, upgraded in place", fill=TEXT, font=font(25))
    d.rounded_rectangle((72, 310, 1208, 508), radius=18, fill=PANEL, outline="#344651", width=2)
    d.text((108, 346), f"{report['materialControls']} material controls", fill=TEAL, font=font(29, BOLD))
    d.text((108, 396), "Named finishes · concert and vintage presets", fill=TEXT, font=font(22))
    d.text((108, 445), "Same 40 IDs · 40 refreshed previews · no new kit", fill=MUTED, font=font(19))
    footer(d)
    return im


def source_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "01 / edit", "An instrument with useful controls", "Acoustic guitar separates soundboard, tonewood, fingerboard and strings.")
    source = (KIT / "acoustic-guitar.kcad.ts").read_text().splitlines()
    chosen = []
    for line in source:
        stripped = line.strip()
        if stripped.startswith("const scale") or "= param('" in stripped or stripped.startswith("presets(") or stripped.startswith("concert:") or stripped.startswith("vintage:") or stripped == "});":
            chosen.append(stripped)
    d.rounded_rectangle((54, 164, 686, 572), radius=14, fill=PANEL, outline="#344651", width=1)
    y = 186
    for line in chosen[:13]:
        d.text((76, y), line[:58], fill=TEXT if "param" in line else TEAL, font=font(14, MONO))
        y += 28
    d.rounded_rectangle((722, 164, 1226, 572), radius=14, fill=PANEL, outline="#344651", width=1)
    centered_paste(im, Image.open(PREVIEWS / "acoustic-guitar.png"), (742, 176, 464, 326))
    d.text((752, 514), "Spruce top · mahogany neck · ebony board · steel strings", fill=TEXT, font=font(13))
    d.text((752, 541), "Path-extruded waisted body · visible sound hole", fill=TEAL, font=font(14, BOLD))
    footer(d)
    return im


def comparison_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "02 / before and after", "Material separation and stronger bodies", "The left column is the committed preview before this promotion; right is the refreshed local render.")
    pairs = ["acoustic-guitar", "alto-saxophone", "violin"]
    before = BUNDLE / "before-previews"
    y0 = 158
    for i, asset_id in enumerate(pairs):
        y = y0 + i * 166
        title = asset_id.replace("-", " ").title()
        d.rounded_rectangle((54, y, 1226, y + 151), radius=10, fill=PANEL, outline="#344651", width=1)
        d.text((72, y + 9), title, fill=TEAL, font=font(14, BOLD))
        centered_paste(im, Image.open(before / f"{asset_id}.png"), (220, y + 22, 390, 120))
        centered_paste(im, Image.open(PREVIEWS / f"{asset_id}.png"), (710, y + 22, 390, 120))
        d.text((248, y + 128), "one flat material", fill=MUTED, font=font(12))
        d.text((808, y + 128), "named materials and details", fill=TEXT, font=font(12))
    footer(d)
    return im


def presets_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "03 / vary", "Switch the instrument's finish", "The two images are generated from the source's actual concert and vintage preset values.")
    variants = json.loads((BUNDLE / "preset-variants.json").read_text())["variants"]
    for i, variant in enumerate(variants):
        x = 54 + i * 596
        d.rounded_rectangle((x, 158, x + 572, 600), radius=14, fill=PANEL, outline="#344651", width=1)
        d.text((x + 24, 176), variant["id"].title(), fill=TEAL, font=font(20, BOLD))
        centered_paste(im, Image.open(variant["png"]), (x + 28, 212, 516, 328))
        d.text((x + 24, 555), f"spruce soundboard  {variant['values']['spruce']}", fill=TEXT, font=font(15, MONO))
    footer(d)
    return im


def contact_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "04 / browse", "A more readable music kit", "Rendered kit previews show distinct materials across fretted strings, winds, percussion and stage props.")
    asset_ids = [
        "accordion", "acoustic-guitar", "alto-saxophone", "banjo",
        "cello", "drum-kit", "french-horn", "marimba",
        "maracas", "music-stand", "timpani", "violin",
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
    header(d, "05 / local checks", "The round is indexed and reviewed", "Local source, preview, generated index, lint, integration tests and static pages were checked.")
    d.rounded_rectangle((54, 166, 1226, 558), radius=16, fill=PANEL, outline="#344651", width=2)
    lines = [
        ("Music source quality gate", f"{report['musicPassing']} / {report['musicTotal']} passing"),
        ("Full catalog quality", f"{report['catalogPassing']} / {report['catalogTotal']} passing ({report['catalogPassRate']})"),
        ("Material controls and presets", f"{report['materialControls']} controls · {report['presetEntries']} preset entries"),
        ("Rendered/indexed previews", f"{report['previewCount']} / 40 · index source hashes match"),
        ("Lint and catalog integration", f"{report['eslint']} · {report['integrationFiles']} files / {report['integrationTests']} tests"),
    ]
    y = 198
    for label, value in lines:
        d.text((88, y), label, fill=TEAL, font=font(17, BOLD))
        d.text((520, y), value, fill=TEXT, font=font(17))
        y += 56
    d.text((88, 500), "This MP4 shows local catalog validation and preview generation.", fill=MUTED, font=font(15))
    d.text((88, 526), "The feature branch is not deployed; no instrument or hardware acceptance is claimed.", fill=MUTED, font=font(14))
    footer(d, "Local validation only · no deployed behavior or instrument performance is represented")
    return im


def main():
    report_path = BUNDLE / "verification.json"
    if not report_path.exists():
        raise SystemExit("write verification.json after lint, integration and catalog checks")
    report = json.loads(report_path.read_text())
    for asset_id in ("acoustic-guitar", "alto-saxophone", "violin"):
        if not (BUNDLE / "before-previews" / f"{asset_id}.png").exists():
            raise SystemExit(f"missing retained before preview: {asset_id}")
    if len(list(PREVIEWS.glob("*.png"))) < 40:
        raise SystemExit("music preview refresh is incomplete")
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
        "workflow": "local .kcad.ts source -> catalog preview renders -> named source presets -> local audit result",
        "video": str(OUT.relative_to(ROOT)),
        "canvas": {"width": WIDTH, "height": HEIGHT},
        "frames": len(frames),
        "durationSeconds": len(frames) * 3,
        "ffmpeg": "ffmpeg -framerate 1/3 -c:v libx264 -r 24 -pix_fmt yuv420p -crf 24 -movflags +faststart",
        "invocation": "python3 artifacts/catalog-demos/music-quality-20261106/capture_music_quality_demo.py",
        "provenance": "Rendered locally from committed source and generated previews; deployment not shown.",
    }
    (BUNDLE / "demo-settings.json").write_text(json.dumps(settings, indent=2) + "\n")
    print(f"wrote {OUT} ({len(frames) * 3}s)")


if __name__ == "__main__":
    main()
