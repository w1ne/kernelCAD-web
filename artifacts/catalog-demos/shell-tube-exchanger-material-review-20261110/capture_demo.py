#!/usr/bin/env python3
"""Build a short local demo from before/after exchanger previews."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, TEAL, ORANGE = "#101923", "#1d2935", "#eef3f5", "#a6b6c0", "#61c6bf", "#e88b49"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FRAME_DIR = BUNDLE / "frames"
OUT = BUNDLE / "shell-tube-exchanger-material-review.mp4"


def font(size, path=FONT):
    return ImageFont.truetype(path, size)


def canvas():
    return Image.new("RGB", (WIDTH, HEIGHT), BG)


def footer(draw):
    draw.line((54, 678, WIDTH - 54, 678), fill="#35434e", width=1)
    draw.text((54, 688), "Local kernelCAD source render · not deployed or pressure-performance verified", fill=MUTED, font=font(11))


def header(draw, section, title, detail):
    draw.text((54, 28), section.upper(), fill=TEAL, font=font(16, BOLD))
    draw.text((54, 58), title, fill=TEXT, font=font(31, BOLD))
    draw.text((54, 101), detail, fill=MUTED, font=font(15))


def model_frame(section, title, detail, image_path, label, accent=TEAL):
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, section, title, detail)
    draw.rounded_rectangle((170, 145, 1110, 620), radius=16, fill=PANEL, outline="#344651", width=1)
    draw.text((194, 164), label, fill=accent, font=font(17, BOLD))
    model = Image.open(image_path).convert("RGB")
    model.thumbnail((820, 400), Image.Resampling.LANCZOS)
    image.paste(model, (640 - model.width // 2, 198 + (400 - model.height) // 2))
    footer(draw)
    return image


def comparison_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "02 / corrected palette", "Structural metal now reads as metal", "Ochre paint was removed from the exchanger's exposed metalwork.")
    for x, label, path, color in [
        (74, "BEFORE · DEFAULT SAFETY PAINT", BUNDLE / "before/shell-and-tube-exchanger.png", ORANGE),
        (654, "AFTER · NEUTRAL METALWORK", BUNDLE / "after/shell-and-tube-exchanger.png", TEAL),
    ]:
        draw.rounded_rectangle((x, 155, x + 552, 610), radius=14, fill=PANEL, outline="#344651", width=1)
        draw.text((x + 22, 174), label, fill=color, font=font(14, BOLD))
        model = Image.open(path).convert("RGB")
        model.thumbnail((510, 360), Image.Resampling.LANCZOS)
        image.paste(model, (x + 276 - model.width // 2, 215 + (360 - model.height) // 2))
    footer(draw)
    image.save(BUNDLE / "before-after.png", optimize=True)
    return image


def title_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    draw.text((68, 46), "kernelCAD  /  CATALOG SEMANTIC REVIEW", fill=TEAL, font=font(18, BOLD))
    draw.text((68, 108), "SHELL-AND-TUBE EXCHANGER", fill=TEXT, font=font(38, BOLD))
    draw.text((70, 176), "One palette mismatch corrected in the existing industrial-plant asset.", fill=MUTED, font=font(18))
    draw.rounded_rectangle((68, 260, 1212, 554), radius=18, fill=PANEL, outline="#344651", width=1)
    rows = [
        ("ISSUE", "metal parts rendered ochre / brass-like"),
        ("PARTS", "tube sheets, nozzles, saddles, shell band"),
        ("CHANGE", "separate neutral hardware metal control"),
        ("VARIANTS", "weathered and stainless presets"),
    ]
    for i, (label, value) in enumerate(rows):
        y = 292 + i * 58
        draw.text((104, y), label, fill=TEAL, font=font(14, BOLD))
        draw.text((370, y), value, fill=TEXT, font=font(17))
    draw.text((70, 602), "Generic visualization prop · existing 400 / 1,400 triangle budget", fill=ORANGE, font=font(17, BOLD))
    footer(draw)
    return image


def verification_frame(report):
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "04 / verify locally", "Material and catalog checks passed", "Evidence and reproduction steps are in the linked handoff bundle.")
    draw.rounded_rectangle((54, 155, 1226, 568), radius=16, fill=PANEL, outline="#344651", width=2)
    rows = [
        ("Changed asset", f"{report['asset']['id']} · {report['asset']['triangles']} / {report['asset']['budget']} tris"),
        ("Industrial-plant", f"{report['quality']['kitPassing']} / {report['quality']['kitTotal']} structural pass"),
        ("Catalog", f"{report['quality']['catalogPassing']} / {report['quality']['catalogTotal']} structural pass"),
        ("Index / previews", report['index']['result']),
        ("Regression / lint", report['checks']['targetedTest'] + " / " + report['checks']['eslint']),
        ("Catalog integration", report['checks']['integration']),
        ("Local detail page", report['checks']['localPage']),
    ]
    y = 178
    for label, value in rows:
        draw.text((86, y), label, fill=TEAL, font=font(14, BOLD))
        draw.text((365, y), value, fill=TEXT, font=font(14))
        y += 45
    draw.text((86, 511), "No vendor rating, pressure performance, deployment or physical acceptance is shown.", fill=MUTED, font=font(13))
    footer(draw)
    return image


def main():
    report = json.loads((BUNDLE / "verification.json").read_text(encoding="utf-8"))
    if not report["pass"]:
        raise SystemExit("local verification has failures; refusing to create completion demo")
    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    frames = [
        title_frame(),
        model_frame("01 / before", "Ochre on structural metal", "The default palette made metal fittings and supports look brass-like.", BUNDLE / "before/shell-and-tube-exchanger.png", "BEFORE · PRE-FIX LOCAL SNAPSHOT", ORANGE),
        comparison_frame(),
        model_frame("03 / palette variant", "Stainless preset", "The alternate palette keeps both shell and hardware in neutral metal tones.", BUNDLE / "variants/stainless.png", "STAINLESS · LOCAL SOFTWARE RENDER"),
        verification_frame(report),
    ]
    for index, frame in enumerate(frames, 1):
        frame.save(FRAME_DIR / f"frame-{index:02d}.png", optimize=True)
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "1/3",
        "-i", str(FRAME_DIR / "frame-%02d.png"), "-c:v", "libx264", "-r", "24",
        "-pix_fmt", "yuv420p", "-crf", "24", "-movflags", "+faststart", str(OUT),
    ], check=True)
    frames[0].save(BUNDLE / "poster.png", optimize=True)
    settings = {
        "workflow": "checked-in before source/preview -> corrected source -> default and stainless local renders -> generated index/page -> local checks",
        "video": str(OUT.relative_to(ROOT)),
        "canvas": {"width": WIDTH, "height": HEIGHT},
        "frames": len(frames),
        "durationSeconds": len(frames) * 3,
        "ffmpeg": "ffmpeg -framerate 1/3 -c:v libx264 -r 24 -pix_fmt yuv420p -crf 24 -movflags +faststart",
        "invocation": "python3 artifacts/catalog-demos/shell-tube-exchanger-material-review-20261110/capture_demo.py",
        "previewInvocation": "python3 artifacts/catalog-demos/shell-tube-exchanger-material-review-20261110/render_kit_previews.py",
        "indexInvocation": "npx tsx scripts/buildAssetCatalog.ts",
        "variantInvocation": "npx tsx artifacts/catalog-demos/shell-tube-exchanger-material-review-20261110/render_variants.ts",
        "provenance": "Local software renders of generic kernelCAD geometry/palette. Before is a committed pre-fix source snapshot; after is not deployed. No pressure-performance or physical acceptance is shown.",
    }
    (BUNDLE / "demo-settings.json").write_text(json.dumps(settings, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT} ({len(frames) * 3}s)")


if __name__ == "__main__":
    main()
