#!/usr/bin/env python3
"""Create a short, source-to-preview demo for the cable gland and flange."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, TEAL = "#101923", "#1d2935", "#eef3f5", "#a6b6c0", "#61c6bf"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
FRAME_DIR = BUNDLE / "frames"
OUT = BUNDLE / "standard-components-cable-gland-flange.mp4"


def font(size, path=FONT):
    return ImageFont.truetype(path, size)


def canvas():
    return Image.new("RGB", (WIDTH, HEIGHT), BG)


def header(draw, section, title, detail):
    draw.text((54, 28), section.upper(), fill=TEAL, font=font(15, BOLD))
    draw.text((54, 57), title, fill=TEXT, font=font(29, BOLD))
    draw.text((54, 98), detail, fill=MUTED, font=font(14))


def footer(draw):
    draw.line((54, 678, WIDTH - 54, 678), fill="#35434e", width=1)
    draw.text((54, 688), "Local source, software renders and validation only · not deployed · no physical acceptance", fill=MUTED, font=font(11))


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
    draw.text((72, 72), "kernelCAD  /  CATALOG VISUAL FOLLOW-UP", fill=TEAL, font=font(17, BOLD))
    draw.text((72, 124), "STANDARD COMPONENTS", fill=TEXT, font=font(42, BOLD))
    draw.text((76, 190), "Real bore and cable choices, with visible seals and hardware.", fill=TEXT, font=font(19))
    draw.rounded_rectangle((72, 268, 1208, 530), radius=18, fill=PANEL, outline="#344651", width=2)
    draw.text((108, 304), "Cable gland  ·  812 / 900 triangles", fill=TEAL, font=font(24, BOLD))
    draw.text((108, 356), "Square mounting flange  ·  764 / 860 triangles", fill=TEAL, font=font(24, BOLD))
    draw.text((108, 430), "Two existing assets refined · 4 material controls each · no new IDs", fill=TEXT, font=font(16))
    footer(draw)
    return image


def before_after_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "01 / compare previews", "Add visible component details", "Same catalog renderer and three-quarter view; source geometry remains low-poly.")
    rows = [
        (150, "Cable gland", "before/cable-gland.png", "catalog/kits/standard-components/previews/cable-gland.png", "Stepped polymer body, steel cap, rubber seal and cable"),
        (390, "Square flange", "before/square-mounting-flange.png", "catalog/kits/standard-components/previews/square-mounting-flange.png", "Selectable bore, cast plate, neck seal and installed bolts"),
    ]
    for y, title, before, after, caption in rows:
        draw.rounded_rectangle((54, y, 1226, y + 218), radius=13, fill=PANEL, outline="#344651", width=1)
        draw.text((74, y + 12), title, fill=TEAL, font=font(16, BOLD))
        paste_center(image, Image.open(BUNDLE / before), (74, y + 40, 500, 145))
        paste_center(image, Image.open(ROOT / after), (650, y + 40, 500, 145))
        draw.text((74, y + 190), "Before", fill=MUTED, font=font(13))
        draw.text((650, y + 190), caption, fill=TEXT, font=font(13))
    footer(draw)
    return image


def choices_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "02 / change dimensions", "Choices change the openings", "Renders are rebuilt from source with alternate parameter defaults.")
    variants = [
        ("cable-4mm", "Cable gland · 4 mm cable"),
        ("cable-8mm", "Cable gland · 8 mm cable"),
        ("flange-10mm", "Flange · 10 mm bore"),
        ("flange-18mm", "Flange · 18 mm bore"),
    ]
    boxes = [(54, 152), (650, 152), (54, 400), (650, 400)]
    for (variant, title), (x, y) in zip(variants, boxes):
        draw.rounded_rectangle((x, y, x + 576, y + 220), radius=13, fill=PANEL, outline="#344651", width=1)
        draw.text((x + 18, y + 12), title, fill=TEAL, font=font(15, BOLD))
        paste_center(image, Image.open(BUNDLE / f"variants/{variant}.png"), (x + 16, y + 39, 544, 164))
    footer(draw)
    return image


def palette_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "03 / choose materials", "Palettes recolor separate parts", "High-visibility polymer and cable; brass flange and fasteners.")
    variants = [
        ("cable-4mm", "Cable gland · industrial"),
        ("cable-high-visibility", "Cable gland · high visibility"),
        ("flange-10mm", "Square flange · default"),
        ("flange-brass", "Square flange · brass"),
    ]
    boxes = [(54, 152), (650, 152), (54, 400), (650, 400)]
    for (variant, title), (x, y) in zip(variants, boxes):
        draw.rounded_rectangle((x, y, x + 576, y + 220), radius=13, fill=PANEL, outline="#344651", width=1)
        draw.text((x + 18, y + 12), title, fill=TEAL, font=font(15, BOLD))
        paste_center(image, Image.open(BUNDLE / f"variants/{variant}.png"), (x + 16, y + 39, 544, 164))
    footer(draw)
    return image


def housing_scale_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "04 / preserve fit dimensions", "Change housing size around the same opening", "The selected 8 mm cable and 18 mm bore remain fixed as the housings scale.")
    variants = [
        ("cable-compact-8mm", "Cable gland · compact · 8 mm"),
        ("cable-large-8mm", "Cable gland · large · 8 mm"),
        ("flange-compact-18mm", "Flange · compact · 18 mm"),
        ("flange-large-18mm", "Flange · large · 18 mm"),
    ]
    boxes = [(54, 152), (650, 152), (54, 400), (650, 400)]
    for (variant, title), (x, y) in zip(variants, boxes):
        draw.rounded_rectangle((x, y, x + 576, y + 220), radius=13, fill=PANEL, outline="#344651", width=1)
        draw.text((x + 18, y + 12), title, fill=TEAL, font=font(15, BOLD))
        paste_center(image, Image.open(BUNDLE / f"variants/{variant}.png"), (x + 16, y + 39, 544, 164))
    footer(draw)
    return image


def verification_frame(report):
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "04 / verify locally", "Preview, index, pages and checks", "Local branch evidence; this is not deployed site behavior.")
    draw.rounded_rectangle((54, 152, 1226, 606), radius=16, fill=PANEL, outline="#344651", width=2)
    rows = [
        ("Standard-components", f"{report['kitQuality']['passing']} / {report['kitQuality']['total']} quality pass"),
        ("Whole catalog", f"{report['catalogQuality']['passing']} / {report['catalogQuality']['total']} pass ({report['catalogQuality']['passRate']})"),
        ("Kit previews", f"{report['previewsRendered']} / {report['kitQuality']['total']} regenerated and indexed"),
        ("Changed local pages", f"{report['localPagesChecked']} / 2 checked with controls and presets"),
        ("ESLint / integration", f"passed · {report['catalogIntegration']['files']} files / {report['catalogIntegration']['tests']} tests"),
    ]
    y = 194
    for label, value in rows:
        draw.text((88, y), label, fill=TEAL, font=font(16, BOLD))
        draw.text((474, y), value, fill=TEXT, font=font(15))
        y += 60
    draw.text((88, 520), "No deployment or physical acceptance is shown.", fill=MUTED, font=font(14))
    footer(draw)
    return image


def main():
    report = json.loads((BUNDLE / "verification.json").read_text(encoding="utf-8"))
    frames = [title_frame(report), before_after_frame(), choices_frame(), housing_scale_frame(), palette_frame(), verification_frame(report)]
    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    for index, frame in enumerate(frames, 1):
        frame.save(FRAME_DIR / f"frame-{index:02d}.png", optimize=True)
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "1/3",
        "-i", str(FRAME_DIR / "frame-%02d.png"), "-c:v", "libx264", "-r", "24",
        "-pix_fmt", "yuv420p", "-crf", "24", "-movflags", "+faststart", str(OUT),
    ], check=True)
    Image.open(FRAME_DIR / "frame-01.png").save(BUNDLE / "poster.png", optimize=True)
    settings = json.loads((BUNDLE / "demo-settings.json").read_text(encoding="utf-8"))
    settings.update({
        "videoPath": str(OUT.relative_to(ROOT)),
        "durationSeconds": len(frames) * 3,
        "ffmpegInvocation": "ffmpeg -framerate 1/3 -c:v libx264 -r 24 -pix_fmt yuv420p -crf 24 -movflags +faststart",
        "captureInvocation": "python3 artifacts/catalog-demos/standard-components-cable-gland-flange-20261110/capture_demo.py",
        "provenance": "Local software renders from checked-in source and local verification outputs; no deployment or physical acceptance is shown.",
    })
    (BUNDLE / "demo-settings.json").write_text(json.dumps(settings, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"video": str(OUT.relative_to(ROOT)), "frames": len(frames), "durationSeconds": len(frames) * 3}, indent=2))


if __name__ == "__main__":
    main()
