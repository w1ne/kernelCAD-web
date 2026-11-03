#!/usr/bin/env python3
"""Capture a short local source-to-preview walkthrough of the theatre-production kit."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog" / "kits" / "theatre-production"
PREVIEWS = KIT / "previews"
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, GREEN = "#111923", "#1d2935", "#eef3f5", "#a6b6c0", "#86c89a"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"


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
    d.text((72, 148), "THEATRE PRODUCTION", fill=TEXT, font=font(52, BOLD))
    d.text((76, 246), "52 editable theatre production scene props", fill=TEXT, font=font(25))
    d.text((76, 300), "Staging  ·  scenery  ·  rigging  ·  lighting  ·  backstage", fill=MUTED, font=font(18))
    d.rounded_rectangle((72, 410, 1208, 550), radius=16, fill=PANEL, outline="#344651", width=2)
    d.text((100, 437), "Native .kcad.ts models with scale and color controls", fill=TEXT, font=font(23, BOLD))
    d.text((100, 490), "CC0 1.0   /   millimetres   /   Z up   /   base origin", fill=GREEN, font=font(19))
    footer(d, "Original kernelCAD geometry · local catalog workflow")
    return im


def source_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "01 / source", "A real parametric source model", "Modular stage deck: one material, indexed scale and color controls, and a generated preview.")
    lines = (KIT / "modular-stage-deck.kcad.ts").read_text().splitlines()
    y = 145
    for line in lines[:27]:
        value = line.strip()
        if len(value) > 69:
            value = value[:66] + "…"
        d.text((58, y), value, fill=TEXT, font=font(12, MONO))
        y += 19
    d.rounded_rectangle((790, 150, 1210, 570), radius=16, fill=PANEL, outline="#344651", width=2)
    preview = Image.open(PREVIEWS / "modular-stage-deck.png").convert("RGB")
    preview.thumbnail((388, 315), Image.Resampling.LANCZOS)
    im.paste(preview, (801 + (388 - preview.width) // 2, 165 + (315 - preview.height) // 2))
    d.text((825, 500), "scale  0.70 — 1.30", fill=GREEN, font=font(17, BOLD))
    d.text((825, 531), "color  user-selectable", fill=TEXT, font=font(16))
    footer(d, "The generated index lists both controls; the catalog integration suite checks the built meshes and Studio parameter lists.")
    return im


def contact_frame(group_number, ids):
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, f"02 / rendered previews · set {group_number}", f"Theatre production catalog preview set {group_number}", "Default-parameter images rendered locally from the indexed .kcad.ts sources.")
    card_w, card_h, gap_x, gap_y, x0, y0 = 276, 235, 12, 8, 54, 155
    for i, asset_id in enumerate(ids):
        col, row = i % 4, i // 4
        x, y = x0 + col * (card_w + gap_x), y0 + row * (card_h + gap_y)
        d.rounded_rectangle((x, y, x + card_w, y + card_h), radius=9, fill=PANEL, outline="#344651", width=1)
        preview = Image.open(PREVIEWS / f"{asset_id}.png").convert("RGB")
        preview.thumbnail((card_w - 16, 178), Image.Resampling.LANCZOS)
        im.paste(preview, (x + (card_w - preview.width) // 2, y + 4 + (178 - preview.height) // 2))
        title = asset_id.replace("-", " ").title()
        if len(title) > 31:
            title = title[:28] + "…"
        d.text((x + 8, y + 190), title, fill=TEXT, font=font(12, BOLD))
        d.text((x + 8, y + 211), "scale · color", fill=GREEN, font=font(10, MONO))
    footer(d, "Original low-poly scene props; each preview is linked from the generated catalog index.")
    return im


def verification_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "03 / local verification", "Catalog audit and local pages", "Checks cover this checkout; they do not imply deployed behavior or theatre safety.")
    preview = json.loads((BUNDLE / "preview-audit.json").read_text())
    pages = json.loads((BUNDLE / "catalog-pages-check.json").read_text())
    lint = json.loads((BUNDLE / "catalog-eslint.json").read_text())
    tests = json.loads((BUNDLE / "catalog-tests.json").read_text())
    values = [
        ("Theatre production sources and indexed meshes", "52 / 52 passed full catalog suite"),
        ("Mesh range and material", f"{tests['triangleRange'][0]}–{tests['triangleRange'][1]} triangles · one material each"),
        ("Indexed controls and floor base", "scale + color · all meshes start at z = 0"),
        ("Catalog suite", f"{tests['integration']['filesPassed']} files · {tests['integration']['testsPassed']} tests passed"),
        ("Preview audit and local pages", f"{preview['rowsWithPreview']} previews · {pages['pageAndPreviewPairs']} page/preview pairs"),
        ("Catalog lint", f"{lint['errorCount']} errors · {lint['warningCount']} warnings"),
    ]
    d.rounded_rectangle((54, 155, 1226, 555), radius=18, fill=PANEL, outline="#344651", width=2)
    y = 184
    for label, value in values:
        d.text((84, y), label, fill=GREEN, font=font(16, BOLD))
        d.text((540, y), value, fill=TEXT, font=font(16))
        y += 54
    live = json.loads((BUNDLE / "live-website-check.json").read_text())
    d.text((84, 520), f"Live baseline: {live['assetsTotal']} previewed assets; branch is not deployed.", fill=MUTED, font=font(14))
    footer(d, "Local replay and validation only · no deployed behavior, load ratings, compliance or physical acceptance claims.")
    return im


def main():
    index = json.loads((ROOT / "catalog" / "index.json").read_text())
    assets = [asset for asset in index["assets"] if asset["kit"] == "theatre-production"]
    if len(assets) != 52 or not all((PREVIEWS / f"{asset['id']}.png").is_file() for asset in assets):
        raise SystemExit("expected all 52 indexed theatre-production assets and previews before capture")
    required = ["preview-audit.json", "catalog-pages-check.json", "catalog-eslint.json", "catalog-tests.json", "live-website-check.json"]
    if not all((BUNDLE / name).is_file() for name in required):
        raise SystemExit("run the catalog lint, integration, preview, local-page and live baseline checks before capture")
    frames = [title_frame(), source_frame()]
    groups = [assets[i : i + 8] for i in range(0, len(assets), 8)]
    frames.extend(contact_frame(i, [asset["id"] for asset in group]) for i, group in enumerate(groups, 1))
    frames.append(verification_frame())
    if len(frames) != 10:
        raise SystemExit("demo must use exactly ten readable frames")
    frame_dir = BUNDLE / "frames"
    frame_dir.mkdir(parents=True, exist_ok=True)
    for i, frame in enumerate(frames, 1):
        frame.save(frame_dir / f"frame-{i:02d}.png", optimize=True)
    output = BUNDLE / "theatre-production-kit.mp4"
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "1/3", "-i", str(frame_dir / "frame-%02d.png"), "-c:v", "libx264", "-r", "24", "-pix_fmt", "yuv420p", "-crf", "25", "-movflags", "+faststart", str(output)], check=True)
    frames[0].save(BUNDLE / "poster.png", optimize=True)
    print(f"wrote {output}")


if __name__ == "__main__":
    main()
