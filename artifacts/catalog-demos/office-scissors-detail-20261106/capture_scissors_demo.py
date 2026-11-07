#!/usr/bin/env python3
"""Capture the local source-to-preview scissors geometry repair."""

import json
import subprocess
import textwrap
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
OUT = BUNDLE / "office-scissors-detail.mp4"
OFFICE_PREVIEW_IDS = [
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


def footer(draw, detail="Local source and software renders · deployment and hardware acceptance are not shown"):
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
    draw.text((72, 82), "kernelCAD  /  CATALOG VISUAL FOLLOW-UP", fill=TEAL, font=font(18, BOLD))
    draw.text((72, 150), "CONNECTED OFFICE SCISSORS", fill=TEXT, font=font(42, BOLD))
    draw.text((76, 228), "Two polymer tangs now join the finger loops to the brass pivot.", fill=TEXT, font=font(22))
    draw.rounded_rectangle((72, 316, 1208, 522), radius=18, fill=PANEL, outline="#344651", width=2)
    draw.text((108, 354), "316 triangles  /  360 budget", fill=TEAL, font=font(27, BOLD))
    draw.text((108, 405), "Stainless-steel blades · polymer handles · brass pivot", fill=TEXT, font=font(19))
    draw.text((108, 454), "One existing office asset refined · no kit or ID added", fill=MUTED, font=font(17))
    footer(draw)
    return image


def source_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "01 / source", "Bridge the handle to the pivot", "The new polygonal tangs overlap the existing rings and blade shoulders.")
    source = (KIT / "scissors.kcad.ts").read_text(encoding="utf-8").splitlines()
    start = next(i for i, line in enumerate(source) if "const handleTang" in line)
    code = [line.rstrip() for line in source[start:start + 6]]
    code.extend(line.strip() for line in source if "handleTang('" in line)
    wrapped = []
    for line in code:
        wrapped.extend(textwrap.wrap(line, width=76, subsequent_indent="  ") or [""])
    draw.rounded_rectangle((54, 158, 748, 594), radius=14, fill=PANEL, outline="#344651", width=1)
    y = 180
    for line in wrapped[:13]:
        draw.text((72, y), line[:88], fill=TEAL if "handleTang" in line or "polymer" in line else TEXT, font=font(13, MONO))
        y += 27
    draw.rounded_rectangle((778, 158, 1226, 594), radius=14, fill=PANEL, outline="#344651", width=1)
    paste_center(image, Image.open(KIT / "previews/scissors.png"), (796, 182, 412, 302))
    draw.text((806, 516), "Steel blades · red polymer tangs", fill=TEXT, font=font(15))
    draw.text((806, 545), "The default view reads as one tool", fill=TEAL, font=font(14, BOLD))
    footer(draw)
    return image


def before_after_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "02 / inspect", "Compare the catalog-angle previews", "The old default had a visible gap between the blades and handle loops.")
    panels = [
        (54, "BEFORE", BUNDLE / "before/scissors.png", "Disconnected loops and blade shoulders"),
        (650, "AFTER", KIT / "previews/scissors.png", "Tangs join both loops to the pivot"),
    ]
    for x, label, path, caption in panels:
        draw.rounded_rectangle((x, 158, x + 576, 602), radius=14, fill=PANEL, outline="#344651", width=1)
        draw.text((x + 22, 176), label, fill=TEAL if label == "AFTER" else MUTED, font=font(18, BOLD))
        paste_center(image, Image.open(path), (x + 20, 210, 536, 300))
        draw.text((x + 22, 548), caption, fill=TEXT, font=font(15))
    footer(draw)
    return image


def variants_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "03 / vary", "Keep both named material palettes", "Each variant uses the same connected geometry with its source-defined colors.")
    variants = json.loads((BUNDLE / "preset-renders.json").read_text(encoding="utf-8"))["variants"]
    for index, variant in enumerate(variants):
        x = 54 + index * 596
        draw.rounded_rectangle((x, 158, x + 572, 600), radius=14, fill=PANEL, outline="#344651", width=1)
        draw.text((x + 24, 176), variant["preset"].title(), fill=TEAL, font=font(20, BOLD))
        paste_center(image, Image.open(BUNDLE / variant["png"]), (x + 22, 212, 528, 326))
        colors = variant["values"]
        draw.text((x + 22, 554), f"polymer {colors['polymer']} · brass {colors['brass']}", fill=TEXT, font=font(13, MONO))
    footer(draw)
    return image


def verification_frame(report):
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "04 / verify locally", "The updated source is rendered and indexed", "Source hash, preview path, triangle budget, lint and catalog integration are recorded.")
    draw.rounded_rectangle((54, 166, 1226, 558), radius=16, fill=PANEL, outline="#344651", width=2)
    kit = report["kitQuality"]
    catalog = report["catalogQuality"]
    commands = report["commands"]
    rows = [
        ("Office kit", f"{kit['passing']} / {kit['total']} quality-gate pass"),
        ("Whole catalog", f"{catalog['passing']} / {catalog['total']} pass ({catalog['passRate']})"),
        ("Office previews", f"{kit['previewsRendered']} / {kit['total']} regenerated and indexed"),
        ("Scissors mesh", f"{report['mesh']['triangles']} / {report['mesh']['budgetAfter']} triangles"),
        ("ESLint / integration", f"{'passed' if commands['eslint']['exitCode'] == 0 else 'failed'} · {commands['catalogIntegration']['files']} files / {commands['catalogIntegration']['tests']} tests"),
        ("Page and behavior", f"Local page {commands['localScissorsPage']['passed']} / {commands['localScissorsPage']['total']} checked · branch not deployed"),
    ]
    y = 192
    for label, value in rows:
        draw.text((88, y), label, fill=TEAL, font=font(16, BOLD))
        draw.text((484, y), value, fill=TEXT, font=font(15))
        y += 52
    draw.text((88, 510), "This video shows local source, software renders and local validation only.", fill=MUTED, font=font(14))
    footer(draw)
    return image


def main():
    report = json.loads((BUNDLE / "verification.json").read_text(encoding="utf-8"))
    if not (KIT / "previews/scissors.png").is_file():
        raise SystemExit("missing regenerated scissors preview")
    frames = [title_frame(report), source_frame(), before_after_frame(), variants_frame(), verification_frame(report)]
    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    for index, frame in enumerate(frames, 1):
        frame.save(FRAME_DIR / f"frame-{index:02d}.png", optimize=True)
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "1/3",
        "-i", str(FRAME_DIR / "frame-%02d.png"), "-c:v", "libx264", "-r", "24",
        "-pix_fmt", "yuv420p", "-crf", "24", "-movflags", "+faststart", str(OUT),
    ], check=True)
    Image.open(FRAME_DIR / "frame-01.png").save(BUNDLE / "poster.png", optimize=True)
    settings = {
        "workflow": "office/scissors.kcad.ts -> rendered catalog-angle preview -> exact professional/classroom preset renders -> rebuilt index and local checks",
        "video": str(OUT.relative_to(ROOT)),
        "canvas": {"width": WIDTH, "height": HEIGHT},
        "frames": len(frames),
        "durationSeconds": len(frames) * 3,
        "ffmpeg": "ffmpeg -framerate 1/3 -c:v libx264 -r 24 -pix_fmt yuv420p -crf 24 -movflags +faststart",
        "invocation": "python3 artifacts/catalog-demos/office-scissors-detail-20261106/capture_scissors_demo.py",
        "presetInvocation": "npx tsx artifacts/catalog-demos/office-scissors-detail-20261106/render_scissors_presets.ts",
        "previewAssetIds": OFFICE_PREVIEW_IDS,
        "previewInvocation": "npx tsx scripts/renderCatalogPreviews.ts " + " ".join(OFFICE_PREVIEW_IDS),
        "indexInvocation": "npx tsx scripts/buildAssetCatalog.ts",
        "provenance": "Generated locally from the checked-in kernelCAD source, catalog previews, named presets and recorded local checks. Deployment and physical acceptance are not shown.",
    }
    (BUNDLE / "demo-settings.json").write_text(json.dumps(settings, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT} ({len(frames) * 3}s)")


if __name__ == "__main__":
    main()
