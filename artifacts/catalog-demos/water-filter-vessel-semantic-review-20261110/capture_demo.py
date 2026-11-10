#!/usr/bin/env python3
"""Build a short local demo from before/after previews and checked source variants."""

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
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
FRAME_DIR = BUNDLE / "frames"
OUT = BUNDLE / "pressure-sand-filter-vessel-semantic-review.mp4"


def font(size, path=FONT):
    return ImageFont.truetype(path, size)


def canvas():
    return Image.new("RGB", (WIDTH, HEIGHT), BG)


def footer(draw):
    draw.line((54, 678, WIDTH - 54, 678), fill="#35434e", width=1)
    draw.text((54, 688), "Local source replay and software renders · not deployed or pressure-performance verified", fill=MUTED, font=font(11))


def header(draw, section, title, detail):
    draw.text((54, 28), section.upper(), fill=TEAL, font=font(16, BOLD))
    draw.text((54, 58), title, fill=TEXT, font=font(31, BOLD))
    draw.text((54, 101), detail, fill=MUTED, font=font(15))


def image_frame(section, title, detail, image_path, label, accent=TEAL):
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, section, title, detail)
    draw.rounded_rectangle((170, 145, 1110, 620), radius=16, fill=PANEL, outline="#344651", width=1)
    draw.text((194, 164), label, fill=accent, font=font(17, BOLD))
    model = Image.open(image_path).convert("RGB")
    model.thumbnail((760, 395), Image.Resampling.LANCZOS)
    image.paste(model, (640 - model.width // 2, 198 + (395 - model.height) // 2))
    footer(draw)
    return image


def title_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    draw.text((68, 46), "kernelCAD  /  CATALOG SEMANTIC REVIEW", fill=TEAL, font=font(18, BOLD))
    draw.text((68, 108), "PRESSURE SAND FILTER VESSEL", fill=TEXT, font=font(39, BOLD))
    draw.text((70, 176), "One existing water-treatment asset gets correctly connected side ports.", fill=MUTED, font=font(18))
    draw.rounded_rectangle((68, 260, 1212, 554), radius=18, fill=PANEL, outline="#344651", width=1)
    rows = [
        ("ISSUE", "vertical, detached inlet/outlet stubs"),
        ("CORRECTION", "lower / upper horizontal shell connections"),
        ("GEOMETRY", "annular nozzles + visible flange lips"),
        ("SCOPE", "same asset ID, kit, palette and budget"),
    ]
    for i, (label, value) in enumerate(rows):
        y = 292 + i * 58
        draw.text((104, y), label, fill=TEAL, font=font(14, BOLD))
        draw.text((370, y), value, fill=TEXT, font=font(17, MONO))
    draw.text((70, 602), "Default mesh remains below the existing 2,200-triangle budget.", fill=ORANGE, font=font(17, BOLD))
    footer(draw)
    return image


def verification_frame(report):
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "04 / verify locally", "Preview and exported geometry checked", "The handoff includes the five-preview ledger, regenerated index, local checks and video inspection.")
    draw.rounded_rectangle((54, 155, 1226, 568), radius=16, fill=PANEL, outline="#344651", width=2)
    rows = [
        ("Changed asset", f"{report['asset']['id']} · {report['asset']['triangles']} / {report['asset']['budget']} triangles"),
        ("Water-treatment", f"{report['quality']['kitPassing']} / {report['quality']['kitTotal']} structural pass"),
        ("Catalog", f"{report['quality']['catalogPassing']} / {report['quality']['catalogTotal']} structural pass"),
        ("Index / preview", report['index']['result']),
        ("Regression / lint", report['checks']['targetedTest'] + " / " + report['checks']['eslint']),
        ("Catalog integration", report['checks']['integration']),
        ("Local page", report['checks']['localPage']),
    ]
    y = 178
    for label, value in rows:
        draw.text((86, y), label, fill=TEAL, font=font(14, BOLD))
        draw.text((365, y), value, fill=TEXT, font=font(14, MONO if label == "Changed asset" else FONT))
        y += 45
    draw.text((86, 511), "Generic low-poly visualization only; no vendor dimensions, pressure rating or physical acceptance.", fill=MUTED, font=font(13))
    footer(draw)
    return image


def main():
    report = json.loads((BUNDLE / "verification.json").read_text(encoding="utf-8"))
    if not report["pass"]:
        raise SystemExit("local verification has failures; refusing to create completion demo")
    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    frames = [
        title_frame(),
        image_frame("01 / before", "Unconnected vertical stubs", "The live preview's small metal stub floated beside the vessel wall.", BUNDLE / "before/pressure-sand-filter-vessel.png", "BEFORE · PUBLIC PREVIEW", ORANGE),
        image_frame("02 / after", "Lower inlet and upper outlet", "Both annular ports now cross the shell wall and finish in stainless flange lips.", BUNDLE / "after/pressure-sand-filter-vessel.png", "AFTER · LOCAL SOFTWARE PREVIEW"),
        image_frame("03 / inspect", "Side view and palette variant", "The high-visibility source preset is rendered from a side angle to expose nozzle length.", BUNDLE / "variants/highVisibility-side.png", "HIGH VISIBILITY · SIDE INSPECTION", ORANGE),
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
        "workflow": "live before preview + checked-in source -> updated catalog software render + existing weathered/highVisibility presets -> index refresh -> local checks",
        "video": str(OUT.relative_to(ROOT)),
        "canvas": {"width": WIDTH, "height": HEIGHT},
        "frames": len(frames),
        "durationSeconds": len(frames) * 3,
        "ffmpeg": "ffmpeg -framerate 1/3 -c:v libx264 -r 24 -pix_fmt yuv420p -crf 24 -movflags +faststart",
        "invocation": "python3 artifacts/catalog-demos/water-filter-vessel-semantic-review-20261110/capture_demo.py",
        "previewInvocation": "python3 artifacts/catalog-demos/water-filter-vessel-semantic-review-20261110/render_kit_previews.py",
        "indexInvocation": "npx tsx scripts/buildAssetCatalog.ts",
        "variantInvocation": "npx tsx artifacts/catalog-demos/water-filter-vessel-semantic-review-20261110/render_variants.ts",
        "provenance": "Local software renders of source-defined kernelCAD geometry and presets. The before image is the current public pre-fix preview; the after image is not deployed. No pressure-performance or physical acceptance is shown.",
    }
    (BUNDLE / "demo-settings.json").write_text(json.dumps(settings, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT} ({len(frames) * 3}s)")


if __name__ == "__main__":
    main()
