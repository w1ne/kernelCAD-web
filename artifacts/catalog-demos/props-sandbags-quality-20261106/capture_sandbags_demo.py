#!/usr/bin/env python3
"""Capture source, material looks, layout choices and local checks in an MP4."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/props"
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, TEAL = "#101923", "#1d2935", "#eef3f5", "#a6b6c0", "#61c6bf"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
FRAME_DIR = BUNDLE / "frames"
OUT = BUNDLE / "sandbags-quality-demo.mp4"


def font(size, path=FONT):
    return ImageFont.truetype(path, size)


def canvas():
    return Image.new("RGB", (WIDTH, HEIGHT), BG)


def header(draw, section, title, detail):
    draw.text((54, 30), section.upper(), fill=TEAL, font=font(16, BOLD))
    draw.text((54, 62), title, fill=TEXT, font=font(32, BOLD))
    draw.text((54, 105), detail, fill=MUTED, font=font(16))


def footer(draw, detail="Source-driven local renders · no Studio session or deployment shown"):
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
    draw.text((64, 66), "kernelCAD  /  CATALOG QUALITY", fill=TEAL, font=font(18, BOLD))
    draw.text((64, 126), "SANDBAGS, WITH MATERIALS", fill=TEXT, font=font(38, BOLD))
    draw.text((68, 190), "One existing asset · three named material controls", fill=TEXT, font=font(20))
    draw.rounded_rectangle((64, 266, 670, 522), radius=18, fill=PANEL, outline="#344651", width=2)
    draw.text((96, 306), "Woven canvas · alternate canvas", fill=TEAL, font=font(21, BOLD))
    draw.text((96, 353), "Stitching thread · visible closure seams", fill=TEXT, font=font(18))
    draw.text((96, 411), "Straight or curved · 2 or 3 staggered courses", fill=MUTED, font=font(16))
    draw.text((96, 463), f"Catalog quality {report['quality']['before']['passing']}/{report['quality']['before']['total']} → {report['quality']['after']['passing']}/{report['quality']['after']['total']} passing", fill=TEXT, font=font(16))
    draw.rounded_rectangle((704, 176, 1216, 586), radius=14, fill=PANEL, outline="#344651", width=1)
    paste_center(image, Image.open(KIT / "previews/sandbags.png"), (724, 196, 472, 348))
    draw.text((746, 548), "Staggered pillowed bags · seam bands", fill=TEAL, font=font(15, BOLD))
    footer(draw)
    return image


def source_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "01 / author", "Controls match the modeled materials", "The source keeps its bag layout knobs and adds visible closure details.")
    draw.rounded_rectangle((54, 160, 696, 608), radius=14, fill=PANEL, outline="#344651", width=1)
    lines = [
        ("canvasColor", "Woven canvas · #b8a47a"),
        ("alternateCanvasColor", "Alternate canvas · #97835a"),
        ("stitchingThreadColor", "Stitching thread · #69583b"),
        ("presets", "military · white · floodControl"),
        ("layout", "straight / curved"),
        ("courses", "2 / 3 staggered courses"),
        ("geometry", "pillow lofts + 2 closure seams per bag"),
    ]
    y = 194
    for key, value in lines:
        draw.text((82, y), key, fill=TEAL, font=font(14, MONO))
        draw.text((328, y), value, fill=TEXT, font=font(14))
        y += 52
    draw.rounded_rectangle((724, 160, 1226, 608), radius=14, fill=PANEL, outline="#344651", width=1)
    paste_center(image, Image.open(KIT / "previews/sandbags.png"), (746, 180, 458, 326))
    draw.text((754, 524), "Default source preview · 748 triangles", fill=TEAL, font=font(15, BOLD))
    draw.text((754, 552), "Closures sit on the top shoulders of each bag.", fill=TEXT, font=font(13))
    footer(draw)
    return image


def preset_frame(variants):
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "02 / choose a look", "Named presets recolor the actual parts", "Canvas shades and seam thread stay independently editable.")
    rows = {row["key"]: row for row in variants["variants"]}
    cards = [
        ("Default", KIT / "previews/sandbags.png", "indexed source colors"),
        ("Military", BUNDLE / rows["military"]["png"], "olive canvas · dark thread"),
        ("White", BUNDLE / rows["white"]["png"], "pale canvas · gray thread"),
        ("Flood control", BUNDLE / rows["floodControl"]["png"], "sand canvas · brown thread"),
    ]
    card_width, gap, start_x = 272, 16, 54
    for index, (name, path, detail) in enumerate(cards):
        x = start_x + index * (card_width + gap)
        draw.rounded_rectangle((x, 164, x + card_width, 602), radius=14, fill=PANEL, outline="#344651", width=1)
        draw.text((x + 18, 184), name.upper(), fill=TEAL, font=font(14, BOLD))
        paste_center(image, Image.open(path), (x + 12, 220, card_width - 24, 258))
        draw.text((x + 18, 510), detail, fill=TEXT, font=font(12))
        draw.text((x + 18, 540), "source render · same bag geometry", fill=MUTED, font=font(11))
    footer(draw)
    return image


def layout_frame(variants):
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "03 / change the object", "Layout changes the real silhouette", "The curved option repositions and turns each staggered bag course.")
    curved = BUNDLE / next(row["png"] for row in variants["variants"] if row["key"] == "curved")
    cards = [
        ("STRAIGHT", KIT / "previews/sandbags.png", "default layout parameter"),
        ("CURVED", curved, "layout=curved · 3 courses · 4 bags"),
    ]
    for index, (name, path, detail) in enumerate(cards):
        x = 54 + index * 590
        draw.rounded_rectangle((x, 164, x + 558, 604), radius=14, fill=PANEL, outline="#344651", width=1)
        draw.text((x + 20, 184), name, fill=TEAL, font=font(15, BOLD))
        paste_center(image, Image.open(path), (x + 22, 218, 514, 286))
        draw.text((x + 24, 552), detail, fill=TEXT, font=font(13))
    footer(draw)
    return image


def verification_frame(report, checks):
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "04 / local checks", "The props kit and index agree", "The generated source hash, rendered previews and local pages were checked.")
    draw.rounded_rectangle((54, 164, 1226, 594), radius=16, fill=PANEL, outline="#344651", width=2)
    commands = checks["commands"]
    rows = [
        ("Props quality", f"{report['kitQuality']['passing']} / {report['kitQuality']['total']} passing"),
        ("Whole catalog quality", f"{report['quality']['after']['passing']} / {report['quality']['after']['total']} passing ({report['quality']['after']['passRate']})"),
        ("Asset controls", "3 material colors · 1 new preset · existing IDs retained"),
        ("Props previews", f"{report['previewCount']} / {report['kitAssetCount']} rendered"),
        ("Triangle budget", f"{report['triangleCount']} / {report['triangleBudget']}"),
        ("Lint and integration", f"lint passed · {commands['catalogIntegration']['files']} files / {commands['catalogIntegration']['tests']} tests passed"),
        ("Local pages", f"{report['localCatalogPages']['workspacePages']} generated · branch not deployed"),
    ]
    y = 190
    for label, value in rows:
        draw.text((88, y), label, fill=TEAL, font=font(15, BOLD))
        draw.text((458, y), value, fill=TEXT, font=font(14))
        y += 50
    footer(draw, "Local source, render and validation only · no deployment or flood-performance claim")
    return image


def main():
    report = json.loads((BUNDLE / "verification.json").read_text(encoding="utf-8"))
    checks = json.loads((BUNDLE / "check-results.json").read_text(encoding="utf-8"))
    commands = checks["commands"]
    variants = json.loads((BUNDLE / "preset-variants.json").read_text(encoding="utf-8"))
    if len(list(KIT.glob("previews/*.png"))) < report["kitAssetCount"]:
        raise SystemExit("props preview set is incomplete")

    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    frames = [title_frame(report), source_frame(), preset_frame(variants), layout_frame(variants), verification_frame(report, checks)]
    for index, frame in enumerate(frames, 1):
        frame.save(FRAME_DIR / f"frame-{index:02d}.png", optimize=True)
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "1/3",
        "-i", str(FRAME_DIR / "frame-%02d.png"), "-c:v", "libx264", "-r", "24",
        "-pix_fmt", "yuv420p", "-crf", "24", "-movflags", "+faststart", str(OUT),
    ], check=True)
    Image.open(FRAME_DIR / "frame-01.png").save(BUNDLE / "poster.png", optimize=True)
    settings = {
        "workflow": "existing props/sandbags source -> material controls and closure seams -> exact named preset renders plus curved layout -> rendered props previews -> local catalog and page checks",
        "video": str(OUT.relative_to(ROOT)),
        "canvas": {"width": WIDTH, "height": HEIGHT},
        "frames": len(frames),
        "durationSeconds": len(frames) * 3,
        "ffmpeg": "ffmpeg -framerate 1/3 -c:v libx264 -r 24 -pix_fmt yuv420p -crf 24 -movflags +faststart",
        "invocation": "python3 artifacts/catalog-demos/props-sandbags-quality-20261106/capture_sandbags_demo.py",
        "variantInvocation": variants["invocation"],
        "previewInvocation": report["previewCommand"],
        "indexInvocation": report["indexCommand"],
        "checks": commands,
        "provenance": "Source-driven local GLB renders of the checked-in default, exact presets and curved parameter choice. No live Studio session, deployed behavior or physical flood performance is shown.",
    }
    (BUNDLE / "demo-settings.json").write_text(json.dumps(settings, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT} ({len(frames) * 3}s)")


if __name__ == "__main__":
    main()
