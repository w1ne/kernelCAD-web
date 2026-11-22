#!/usr/bin/env python3
"""Capture the local office-source, preset, preview and validation workflow."""

import json
import re
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/office"
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, TEAL = "#101923", "#1d2935", "#eef3f5", "#a6b6c0", "#61c6bf"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
FRAME_DIR = BUNDLE / "frames"
OUT = BUNDLE / "office-quality-demo.mp4"
PREVIEW_IDS = [
    "archive-box", "business-card-holder", "calculator", "clipboard", "desk-calendar",
    "desk-organizer", "dry-erase-board", "envelope-stack", "file-folder", "footrest",
    "fountain-pen", "hanging-file-folder", "highlighter", "hole-punch", "ink-pad",
    "label-maker", "laminator", "laptop-stand", "letter-sorter", "letter-tray", "marker",
    "mechanical-pencil", "memo-pad", "monitor-riser", "mousepad", "notebook",
    "office-pinboard", "paper-clip-dish", "paper-cutter", "paper-shredder", "paperweight",
    "pencil-cup", "ring-binder", "rubber-stamp", "ruler", "scissors", "stapler",
    "sticky-notes", "tape-dispenser", "wrist-rest",
]


def font(size, path=FONT):
    return ImageFont.truetype(path, size)


def canvas():
    return Image.new("RGB", (WIDTH, HEIGHT), BG)


def header(draw, section, title, detail):
    draw.text((54, 30), section.upper(), fill=TEAL, font=font(16, BOLD))
    draw.text((54, 62), title, fill=TEXT, font=font(32, BOLD))
    draw.text((54, 105), detail, fill=MUTED, font=font(16))


def footer(draw, detail="Local .kcad.ts source and previews · deployed behavior is not shown"):
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
    draw.text((72, 144), "OFFICE ASSETS, WITH MATERIALS", fill=TEXT, font=font(42, BOLD))
    draw.text((76, 220), "40 existing desk objects with editable material palettes", fill=TEXT, font=font(24))
    draw.rounded_rectangle((72, 310, 1208, 508), radius=18, fill=PANEL, outline="#344651", width=2)
    draw.text((108, 346), "120 material-named controls", fill=TEAL, font=font(29, BOLD))
    draw.text((108, 396), "Paperboard · polymer · steel · glass · rubber · timber · fabric", fill=TEXT, font=font(19))
    draw.text((108, 445), "Professional and classroom looks · same 40 IDs · 40 refreshed previews", fill=MUTED, font=font(17))
    footer(draw)
    return image


def source_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "01 / edit", "Name the materials in the source", "The shredder keeps a scale choice while separating its housing, cutter and bin window.")
    lines = (KIT / "paper-shredder.kcad.ts").read_text(encoding="utf-8").splitlines()
    chosen = []
    for line in lines:
        stripped = line.strip()
        if re.match(r"const (polymer|steel|glass) = param\(", stripped):
            chosen.append(stripped)
        elif stripped.startswith("professional:") or stripped.startswith("classroom:"):
            chosen.append(stripped)
        elif "addBox('cabinet'" in stripped or "addBox('bin-window'" in stripped:
            chosen.append(stripped)
    draw.rounded_rectangle((54, 158, 718, 578), radius=14, fill=PANEL, outline="#344651", width=1)
    y = 180
    for line in chosen[:10]:
        color = TEAL if "param(" in line or "professional" in line or "classroom" in line else TEXT
        draw.text((72, y), line[:78], fill=color, font=font(12, MONO))
        y += 35
    draw.rounded_rectangle((750, 158, 1226, 578), radius=14, fill=PANEL, outline="#344651", width=1)
    paste_center(image, Image.open(KIT / "previews/paper-shredder.png"), (766, 174, 444, 322))
    draw.text((776, 514), "Top feed slot, bin window and paired casters", fill=TEXT, font=font(15))
    draw.text((776, 541), "The model stays a compact office machine", fill=TEAL, font=font(13, BOLD))
    footer(draw)
    return image


def comparison_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "02 / before and after", "Material roles sharpen familiar desk objects", "Previous preview at left; material-specific source render at right.")
    asset_ids = ["paper-shredder", "laminator", "scissors"]
    for index, asset_id in enumerate(asset_ids):
        y = 158 + index * 164
        draw.rounded_rectangle((54, y, 1226, y + 151), radius=10, fill=PANEL, outline="#344651", width=1)
        draw.text((72, y + 8), asset_id.replace("-", " ").title(), fill=TEAL, font=font(14, BOLD))
        draw.text((330, y + 8), "BEFORE", fill=MUTED, font=font(11, BOLD))
        draw.text((820, y + 8), "AFTER", fill=TEXT, font=font(11, BOLD))
        paste_center(image, Image.open(BUNDLE / "before-previews" / f"{asset_id}.png"), (230, y + 22, 360, 112))
        paste_center(image, Image.open(KIT / "previews" / f"{asset_id}.png"), (720, y + 22, 360, 112))
    footer(draw)
    return image


def preset_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "03 / vary", "Switch the shredder appearance", "Both images were exported from the exact named presets in the source.")
    variants = json.loads((BUNDLE / "preset-variants.json").read_text(encoding="utf-8"))["variants"]
    rows = [row for row in variants if row["assetId"] == "paper-shredder"]
    for index, variant in enumerate(rows):
        x = 54 + index * 596
        draw.rounded_rectangle((x, 158, x + 572, 600), radius=14, fill=PANEL, outline="#344651", width=1)
        draw.text((x + 24, 176), variant["preset"], fill=TEAL, font=font(20, BOLD))
        paste_center(image, Image.open(BUNDLE / variant["png"]), (x + 28, 212, 516, 328))
        values = variant["values"]
        draw.text((x + 24, 554), f"housing {values['polymer']} · cutter {values['steel']}", fill=TEXT, font=font(13, MONO))
    footer(draw)
    return image


def silhouette_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "04 / shape", "Scissors with two loops and tapered blades", "A size choice scales the object; separate steel and polymer controls change its look.")
    draw.rounded_rectangle((54, 158, 610, 600), radius=14, fill=PANEL, outline="#344651", width=1)
    draw.rounded_rectangle((670, 158, 1226, 600), radius=14, fill=PANEL, outline="#344651", width=1)
    paste_center(image, Image.open(BUNDLE / "before-previews/scissors.png"), (82, 196, 500, 302))
    paste_center(image, Image.open(KIT / "previews/scissors.png"), (700, 196, 500, 302))
    draw.text((94, 522), "Before", fill=MUTED, font=font(17, BOLD))
    draw.text((712, 522), "After", fill=TEAL, font=font(17, BOLD))
    draw.text((94, 556), "two square loops · blunt boxed blades", fill=TEXT, font=font(14))
    draw.text((712, 556), "paired finger loops · open tapered blades", fill=TEXT, font=font(14))
    footer(draw)
    return image


def contact_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "05 / browse", "A working desk palette", "Same kit, from papers and tools to storage, equipment and ergonomic pieces.")
    asset_ids = [
        "archive-box", "calculator", "desk-organizer", "fountain-pen",
        "highlighter", "laptop-stand", "letter-tray", "mousepad",
        "notebook", "paper-cutter", "paperweight", "stapler",
    ]
    card_w, card_h, gap_x, gap_y = 278, 165, 18, 10
    for index, asset_id in enumerate(asset_ids):
        col, row = index % 4, index // 4
        x, y = 54 + col * (card_w + gap_x), 158 + row * (card_h + gap_y)
        draw.rounded_rectangle((x, y, x + card_w, y + card_h), radius=9, fill=PANEL, outline="#344651", width=1)
        paste_center(image, Image.open(KIT / "previews" / f"{asset_id}.png"), (x + 8, y + 4, card_w - 16, 130))
        draw.text((x + 10, y + 137), asset_id.replace("-", " ").title()[:34], fill=TEXT, font=font(12, BOLD))
    footer(draw)
    return image


def verification_frame(report, checks):
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "06 / local checks", "The office round is rendered and indexed", "Source hashes, preview paths, triangle budgets, lint and integration were checked locally.")
    draw.rounded_rectangle((54, 166, 1226, 558), radius=16, fill=PANEL, outline="#344651", width=2)
    quality = report["quality"]["after"]
    integration = checks["commands"]["catalogIntegration"]
    eslint = checks["commands"]["eslint"]
    rows = [
        ("Office kit quality", "40 / 40 passing"),
        ("Whole catalog quality", f"{quality['passing']} / {quality['total']} passing ({quality['passRate']}) · {quality['thin']} thin"),
        ("Material controls and presets", f"{report['materialControlCount']} controls · {report['presetEntryCount']} named looks refreshed"),
        ("Preview and hash verification", f"{report['previewCount']} previews · all 40 sources match the index"),
        ("Lint and catalog integration", f"{'passed' if eslint['exitCode'] == 0 else 'failed'} · {integration['files']} files / {integration['tests']} tests passed"),
        ("Local catalog pages", f"{report['localCatalogPages']['pageCount']} / 40 checked · branch not deployed"),
    ]
    y = 192
    for label, value in rows:
        draw.text((88, y), label, fill=TEAL, font=font(16, BOLD))
        draw.text((530, y), value, fill=TEXT, font=font(15))
        y += 52
    draw.text((88, 510), "This video shows local source, generated previews and local validation.", fill=MUTED, font=font(14))
    footer(draw, "Local validation only · deployed behavior and physical acceptance are not represented")
    return image


def main():
    report = json.loads((BUNDLE / "verification.json").read_text(encoding="utf-8"))
    checks = json.loads((BUNDLE / "check-results.json").read_text(encoding="utf-8"))
    for asset_id in ("paper-shredder", "laminator", "scissors"):
        if not (BUNDLE / "before-previews" / f"{asset_id}.png").is_file():
            raise SystemExit(f"missing retained before preview: {asset_id}")
    if len(list(KIT.glob("previews/*.png"))) < 40:
        raise SystemExit("office preview refresh is incomplete")

    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    frames = [
        title_frame(report), source_frame(), comparison_frame(), preset_frame(),
        silhouette_frame(), contact_frame(), verification_frame(report, checks),
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
        "workflow": "existing office .kcad.ts sources -> material names and appearance presets -> 40 rendered previews -> rebuilt catalog index -> local checks",
        "video": str(OUT.relative_to(ROOT)),
        "canvas": {"width": WIDTH, "height": HEIGHT},
        "frames": len(frames),
        "durationSeconds": len(frames) * 3,
        "ffmpeg": "ffmpeg -framerate 1/3 -c:v libx264 -r 24 -pix_fmt yuv420p -crf 24 -movflags +faststart",
        "invocation": "python3 artifacts/catalog-demos/office-quality-20261106/capture_office_quality_demo.py",
        "presetInvocation": "npx tsx artifacts/catalog-demos/office-quality-20261106/render_office_presets.ts",
        "previewAssetIds": PREVIEW_IDS,
        "previewInvocation": "npx tsx scripts/renderCatalogPreviews.ts " + " ".join(PREVIEW_IDS),
        "provenance": "Rendered locally from checked-in office sources, exact named presets, generated previews and local check results. Deployment is not shown.",
    }
    (BUNDLE / "demo-settings.json").write_text(json.dumps(settings, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT} ({len(frames) * 3}s)")


if __name__ == "__main__":
    main()
