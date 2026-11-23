#!/usr/bin/env python3
"""Build a short source-to-preview review video from retained catalog evidence."""

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
OUT = BUNDLE / "industrial-plant-roller-conveyor-line-semantic-review.mp4"
ASSETS = ["forklift-truck", "belt-conveyor", "air-compressor", "centrifugal-pump", "roller-conveyor-line"]


def font(size, bold=False):
    return ImageFont.truetype(BOLD if bold else FONT, size)


def canvas():
    return Image.new("RGB", (WIDTH, HEIGHT), BG)


def footer(draw):
    draw.line((54, 678, WIDTH - 54, 678), fill="#35434e", width=1)
    draw.text((54, 688), "Local source and software render · branch not deployed · no simulation or physical acceptance claimed", fill=MUTED, font=font(11))


def header(draw, section, title, detail):
    draw.text((54, 28), section.upper(), fill=TEAL, font=font(16, True))
    draw.text((54, 58), title, fill=TEXT, font=font(31, True))
    draw.text((54, 101), detail, fill=MUTED, font=font(15))


def paste_fit(target, path, rect, max_size):
    image = Image.open(path).convert("RGB")
    image.thumbnail(max_size, Image.Resampling.LANCZOS)
    x = rect[0] + (rect[2] - rect[0] - image.width) // 2
    y = rect[1] + (rect[3] - rect[1] - image.height) // 2
    target.paste(image, (x, y))


def title_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    draw.text((68, 46), "kernelCAD  /  INDUSTRIAL-PLANT VISUAL FOLLOW-UP", fill=TEAL, font=font(18, True))
    draw.text((68, 108), "ROLLER CONVEYOR LINE", fill=TEXT, font=font(42, True))
    draw.text((70, 176), "A five-preview audit found a roller bed that did not read as rollers.", fill=MUTED, font=font(19))
    draw.rounded_rectangle((68, 260, 1212, 564), radius=18, fill=PANEL, outline="#344651", width=1)
    lines = [
        ("SOURCE", "existing industrial-plant asset ID retained"),
        ("GEOMETRY", "open bed · eleven crosswise rollers · six supports"),
        ("CONTROLS", "structural steel · roller steel · safety paint"),
    ]
    for i, (label, value) in enumerate(lines):
        y = 304 + i * 78
        draw.text((104, y), label, fill=TEAL, font=font(15, True))
        draw.text((330, y), value, fill=TEXT, font=font(16))
    draw.text((70, 614), "One in-place asset correction · asset count unchanged", fill=ORANGE, font=font(18, True))
    footer(draw)
    return image


def compare_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "01 / audit finding", "The original bed could not carry a load on rollers", "The published source and preview matched the retained pre-edit snapshot.")
    draw.rounded_rectangle((54, 145, 1226, 620), radius=16, fill=PANEL, outline="#344651", width=1)
    draw.text((132, 163), "BEFORE · PUBLIC", fill=ORANGE, font=font(16, True))
    draw.text((699, 163), "AFTER · LOCAL", fill=TEAL, font=font(16, True))
    paste_fit(image, BUNDLE / "before/roller-conveyor-line.png", (88, 195, 600, 555), (480, 340))
    paste_fit(image, BUNDLE / "after/roller-conveyor-line.png", (642, 195, 1192, 555), (510, 350))
    draw.text((113, 572), "Solid deck · lengthwise yellow cylinder", fill=MUTED, font=font(14))
    draw.text((674, 572), "Open bed · repeated crosswise steel rollers", fill=MUTED, font=font(14))
    footer(draw)
    return image


def detail_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "02 / source and render", "The side rails now hold a real roller bed", "The existing scale and appearance presets remain available.")
    draw.rounded_rectangle((54, 145, 1226, 620), radius=16, fill=PANEL, outline="#344651", width=1)
    paste_fit(image, BUNDLE / "after/roller-conveyor-line.png", (82, 168, 650, 586), (540, 400))
    notes = [
        "Eleven steel rollers span the conveyor width.",
        "80 mm pitch repeats along its 920 mm length.",
        "Side rails and six legs connect into the frame.",
        "Roller steel is separate from safety paint.",
        "652 triangles / 1,400 budget.",
    ]
    y = 212
    for note in notes:
        draw.ellipse((694, y + 4, 706, y + 16), fill=TEAL)
        draw.text((722, y), note, fill=TEXT, font=font(17))
        y += 62
    footer(draw)
    return image


def audit_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "03 / five-preview ledger", "Four candidates stayed unchanged", "The audit kept one mismatch to fix and left four recognizable models alone.")
    draw.rounded_rectangle((54, 145, 1226, 620), radius=16, fill=PANEL, outline="#344651", width=1)
    labels = ["FORKLIFT", "BELT CONVEYOR", "AIR COMPRESSOR", "CENTRIFUGAL PUMP", "ROLLER LINE"]
    x0, tile_w = 76, 224
    for index, (asset, label) in enumerate(zip(ASSETS, labels)):
        x = x0 + index * 230
        draw.text((x, 162), label, fill=TEAL if index < 4 else ORANGE, font=font(12, True))
        paste_fit(image, BUNDLE / f"before/{asset}.png", (x, 188, x + tile_w, 432), (tile_w, 244))
    rows = [
        ("UNCHANGED", "Forklift · belt conveyor · air compressor · centrifugal pump", TEXT),
        ("FIXED", "Roller line: solid deck and lengthwise yellow cylinder", ORANGE),
        ("RESULT", "Open bed with transverse steel rollers", TEAL),
    ]
    y = 468
    for label, value, color in rows:
        draw.text((88, y), label, fill=color, font=font(13, True))
        draw.text((248, y), value, fill=TEXT, font=font(14))
        y += 39
    footer(draw)
    return image


def verification_frame(report):
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "04 / local verification", "Source, index and checks recorded", "These results describe this local branch; the published site has not changed.")
    draw.rounded_rectangle((54, 155, 1226, 560), radius=16, fill=PANEL, outline="#344651", width=2)
    checks = report["checks"]
    rows = [
        ("Asset regression", checks["focusedTest"]),
        ("Catalog integration", checks["integration"]),
        ("ESLint / kit quality", f'{checks["eslint"]} · {report["kitQuality"]["passing"]}/{report["kitQuality"]["total"]} pass'),
        ("Catalog index", checks["index"]),
        ("Catalog-wide legacy gate", f'{report["catalogQuality"]["passing"]}/{report["catalogQuality"]["total"]} ({report["catalogQuality"]["rate"]}); {report["catalogQuality"]["remainingThin"]} remain'),
        ("Asset IDs / count", "unchanged" if report["assetIdsAndCountsUnchanged"] else "changed"),
    ]
    y = 188
    for label, value in rows:
        draw.text((86, y), label, fill=TEAL, font=font(14, True))
        draw.text((420, y), value, fill=TEXT, font=font(14))
        y += 47
    draw.text((86, 500), "No deployment, simulation, manufacturing or physical acceptance is claimed.", fill=MUTED, font=font(13))
    footer(draw)
    return image


def main():
    report = json.loads((BUNDLE / "verification.json").read_text(encoding="utf-8"))
    if not report.get("targetChecksPass"):
        raise SystemExit("targeted local verification has failures; refusing to create completion demo")
    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    frames = [title_frame(), compare_frame(), detail_frame(), audit_frame(), verification_frame(report)]
    for index, frame in enumerate(frames, 1):
        frame.save(FRAME_DIR / f"frame-{index:02d}.png", optimize=True)
    frames[0].save(BUNDLE / "poster.png", optimize=True)
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "1/3",
        "-i", str(FRAME_DIR / "frame-%02d.png"), "-c:v", "libx264", "-r", "24",
        "-pix_fmt", "yuv420p", "-crf", "24", "-movflags", "+faststart", str(OUT),
    ], check=True)
    settings = {
        "workflow": "five rendered industrial-plant previews -> source fidelity correction -> target preview render -> regenerated catalog index -> local lint, quality, integration and page checks",
        "video": str(OUT.relative_to(ROOT)),
        "canvas": {"width": WIDTH, "height": HEIGHT},
        "frames": len(frames),
        "durationSeconds": len(frames) * 3,
        "ffmpeg": "ffmpeg -framerate 1/3 -c:v libx264 -r 24 -pix_fmt yuv420p -crf 24 -movflags +faststart",
        "invocation": "python3 artifacts/catalog-demos/industrial-plant-roller-conveyor-line-semantic-review-20261116/capture_demo.py",
        "previewInvocation": "npx tsx scripts/renderCatalogPreviews.ts roller-conveyor-line",
        "indexInvocation": "npx tsx scripts/buildAssetCatalog.ts",
        "inspectionInvocation": "python3 artifacts/catalog-demos/industrial-plant-roller-conveyor-line-semantic-review-20261116/inspect_video.py",
        "inspection": "video-review/inspection.json and video-review/contact-sheet.png",
        "provenance": "Local software renders of the checked-in kernelCAD source. The branch is not deployed; no engineering performance or physical acceptance is shown.",
    }
    (BUNDLE / "demo-settings.json").write_text(json.dumps(settings, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT} ({len(frames) * 3}s)")


if __name__ == "__main__":
    main()
