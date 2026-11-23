#!/usr/bin/env python3
"""Create a short local source-to-preview demo for the two office tool refinements."""

import json
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
OUT = BUNDLE / "office-tools-silhouette.mp4"


def font(size, path=FONT):
    return ImageFont.truetype(path, size)


def canvas():
    return Image.new("RGB", (WIDTH, HEIGHT), BG)


def header(draw, section, title, detail):
    draw.text((54, 30), section.upper(), fill=TEAL, font=font(16, BOLD))
    draw.text((54, 62), title, fill=TEXT, font=font(31, BOLD))
    draw.text((54, 105), detail, fill=MUTED, font=font(15))


def footer(draw, detail="Local source and software renders · branch deployment and physical acceptance are not shown"):
    draw.line((54, 678, WIDTH - 54, 678), fill="#35434e", width=1)
    draw.text((54, 688), detail, fill=MUTED, font=font(12))


def fit(image, size):
    result = image.convert("RGB")
    result.thumbnail(size, Image.Resampling.LANCZOS)
    return result


def paste_center(target, image, box):
    x, y, w, h = box
    preview = fit(image, (w, h))
    target.paste(preview, (x + (w - preview.width) // 2, y + (h - preview.height) // 2))


def title_frame(report):
    image = canvas()
    draw = ImageDraw.Draw(image)
    draw.text((72, 74), "kernelCAD  /  CATALOG VISUAL FOLLOW-UP", fill=TEAL, font=font(18, BOLD))
    draw.text((72, 132), "OFFICE WRITING TOOLS", fill=TEXT, font=font(43, BOLD))
    draw.text((76, 199), "Rounded, tapered geometry makes the highlighter and pencil read as tools.", fill=TEXT, font=font(20))
    draw.rounded_rectangle((72, 278, 1208, 522), radius=18, fill=PANEL, outline="#344651", width=2)
    draw.text((108, 314), "Highlighter  ·  232 / 320 triangles", fill=TEAL, font=font(25, BOLD))
    draw.text((108, 365), "Mechanical pencil  ·  802 / 900 triangles", fill=TEAL, font=font(25, BOLD))
    draw.text((108, 427), "Two existing assets refined · no kit or ID added", fill=TEXT, font=font(17))
    footer(draw)
    return image


def before_after_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "01 / compare previews", "Replace flat slabs with tool silhouettes", "Both previews use the catalog renderer and the same three-quarter view.")
    panels = [
        (54, 160, "Highlighter · before", BUNDLE / "before/highlighter.png", "Box barrel and cap"),
        (650, 160, "Highlighter · after", KIT / "previews/highlighter.png", "Rounded cap, clip and chisel nib"),
        (54, 394, "Mechanical pencil · before", BUNDLE / "before/mechanical-pencil.png", "Flat shaft and rectangular nose"),
        (650, 394, "Mechanical pencil · after", KIT / "previews/mechanical-pencil.png", "Turned barrel, rubber grip, nose and lead"),
    ]
    for x, y, label, path, caption in panels:
        draw.rounded_rectangle((x, y, x + 576, y + 210), radius=13, fill=PANEL, outline="#344651", width=1)
        draw.text((x + 18, y + 12), label, fill=TEAL if "after" in label else MUTED, font=font(16, BOLD))
        paste_center(image, Image.open(path), (x + 16, y + 40, 544, 126))
        draw.text((x + 18, y + 177), caption, fill=TEXT, font=font(14))
    footer(draw)
    return image


def variants_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "02 / choose a palette", "Named presets recolor the actual parts", "Each render is rebuilt from the edited .kcad.ts source.")
    variants = json.loads((BUNDLE / "variant-renders.json").read_text(encoding="utf-8"))["variants"]
    boxes = [(54, 160), (650, 160), (54, 394), (650, 394)]
    for variant, (x, y) in zip(variants, boxes):
        draw.rounded_rectangle((x, y, x + 576, y + 210), radius=13, fill=PANEL, outline="#344651", width=1)
        draw.text((x + 18, y + 12), f"{variant['asset']} · {variant['preset']}", fill=TEAL, font=font(15, BOLD))
        paste_center(image, Image.open(BUNDLE / variant["png"]), (x + 16, y + 39, 544, 135))
        palette = " · ".join(f"{name} {value}" for name, value in variant["values"].items())
        draw.text((x + 18, y + 181), palette[:78], fill=TEXT, font=font(11, MONO))
    footer(draw)
    return image


def source_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "03 / source controls", "Keep shape and material choices editable", "The compact option scales the whole assembly; palettes target named materials.")
    draw.rounded_rectangle((54, 160, 624, 595), radius=14, fill=PANEL, outline="#344651", width=1)
    draw.rounded_rectangle((654, 160, 1226, 595), radius=14, fill=PANEL, outline="#344651", width=1)
    files = [
        (KIT / "highlighter.kcad.ts", 76, "highlighter", ["roundedBar", "felt-chisel-nib", "fluorescent-ink-face"]),
        (KIT / "mechanical-pencil.kcad.ts", 676, "mechanical pencil", ["turned", "elastomer-grip", "tapered-nose", "graphite-lead"]),
    ]
    for path, x, name, needles in files:
        draw.text((x, 179), name, fill=TEAL, font=font(18, BOLD))
        lines = path.read_text(encoding="utf-8").splitlines()
        selected = [line.strip() for line in lines if any(needle in line for needle in needles)]
        for i, line in enumerate(selected[:8]):
            draw.text((x, 224 + i * 36), line[:55], fill=TEXT, font=font(12, MONO))
        draw.text((x, 536), "Two named palettes · compact and standard", fill=MUTED, font=font(12))
    footer(draw)
    return image


def verification_frame(report):
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "04 / verify locally", "Both sources are rendered and indexed", "Local checks cover the generated source hashes, previews, pages, lint and catalog suite.")
    draw.rounded_rectangle((54, 160, 1226, 594), radius=16, fill=PANEL, outline="#344651", width=2)
    rows = [
        ("Office kit", f"{report['kitQuality']['passing']} / {report['kitQuality']['total']} quality-gate pass"),
        ("Whole catalog", f"{report['catalogQuality']['passing']} / {report['catalogQuality']['total']} pass ({report['catalogQuality']['passRate']})"),
        ("Office previews", f"{report['previewsRendered']} / {report['kitQuality']['total']} regenerated and indexed"),
        ("Changed asset pages", f"{report['localPagesChecked']} / 2 generated and checked locally"),
        ("ESLint / integration", f"passed · {report['catalogIntegration']['files']} files / {report['catalogIntegration']['tests']} tests"),
    ]
    y = 194
    for label, value in rows:
        draw.text((88, y), label, fill=TEAL, font=font(17, BOLD))
        draw.text((474, y), value, fill=TEXT, font=font(16))
        y += 58
    draw.text((88, 510), "This demo shows local source, software renders and local validation only.", fill=MUTED, font=font(14))
    footer(draw)
    return image


def main():
    report = json.loads((BUNDLE / "verification.json").read_text(encoding="utf-8"))
    frames = [title_frame(report), before_after_frame(), variants_frame(), source_frame(), verification_frame(report)]
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
        "workflow": "office source -> regenerated catalog previews -> source-driven professional/classroom preset renders -> rebuilt catalog index and local checks",
        "video": str(OUT.relative_to(ROOT)),
        "canvas": {"width": WIDTH, "height": HEIGHT},
        "frames": len(frames),
        "secondsPerFrame": 3,
        "durationSeconds": len(frames) * 3,
        "ffmpeg": "ffmpeg -framerate 1/3 -c:v libx264 -r 24 -pix_fmt yuv420p -crf 24 -movflags +faststart",
        "invocation": "python3 artifacts/catalog-demos/office-tools-silhouette-20261110/capture_demo.py",
        "presetInvocation": "npx tsx artifacts/catalog-demos/office-tools-silhouette-20261110/render_variants.ts",
        "previewInvocation": report["previewInvocation"],
        "indexInvocation": "npx tsx scripts/buildAssetCatalog.ts",
        "provenance": "Local software renders from checked-in kernelCAD source; no deployment or physical acceptance is shown.",
    }
    (BUNDLE / "demo-settings.json").write_text(json.dumps(settings, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(settings, indent=2))


if __name__ == "__main__":
    main()
