#!/usr/bin/env python3
"""Create a short preview-and-preset walkthrough from rendered fire-rescue assets."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/fire-rescue"
PREVIEWS = KIT / "previews"
VARIANTS = BUNDLE / "high-visibility-variants"
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, RED, GOLD, BLUE = "#111923", "#1d2935", "#eef3f5", "#a6b6c0", "#e06455", "#f2cf62", "#79c1cf"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"

SHOWCASE = [
    ("Municipal fire engine", "municipal-fire-engine"),
    ("Extension fire ladder", "extension-fire-ladder"),
    ("Fire hose nozzle", "fire-hose-nozzle"),
    ("Structural helmet", "structural-fire-helmet"),
]


def font(size, path=FONT):
    return ImageFont.truetype(path, size)


def canvas():
    return Image.new("RGB", (WIDTH, HEIGHT), BG)


def header(draw, kicker, title, detail):
    draw.text((54, 28), kicker.upper(), fill=GOLD, font=font(16, BOLD))
    draw.text((54, 57), title, fill=TEXT, font=font(31, BOLD))
    draw.text((54, 101), detail, fill=MUTED, font=font(16))


def footer(draw, detail):
    draw.line((54, 678, WIDTH - 54, 678), fill="#35434e", width=1)
    draw.text((54, 688), detail, fill=MUTED, font=font(12))


def paste_fit(im, source, bounds):
    x, y, width, height = bounds
    item = Image.open(source).convert("RGB")
    item.thumbnail((width, height), Image.Resampling.LANCZOS)
    im.paste(item, (x + (width - item.width) // 2, y + (height - item.height) // 2))


def cover_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    d.text((72, 68), "kernelCAD  /  ASSET CATALOG", fill=GOLD, font=font(20, BOLD))
    d.text((76, 145), "FIRE & RESCUE", fill=TEXT, font=font(50, BOLD))
    d.text((78, 228), "60 existing assets, promoted with distinct materials", fill=TEXT, font=font(24))
    d.text((78, 282), "Editable source controls  ·  named presets  ·  recognizable scene props", fill=MUTED, font=font(18))
    d.rounded_rectangle((72, 400, 1208, 558), radius=16, fill=PANEL, outline="#344651", width=2)
    d.text((104, 432), "Apparatus paint  /  cab finish  /  tire rubber  /  metalwork", fill=TEXT, font=font(22, BOLD))
    d.text((104, 486), "weathered  ·  highVisibility  ·  regenerated indexed previews", fill=GOLD, font=font(19, MONO))
    footer(d, "Local source and software-render workflow · illustrative geometry · no fireground or hardware acceptance claim.")
    return im


def before_after_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "01 / material separation", "Same fire engine, clearer parts", "The original source had a body and accent color; the promoted source separates visible materials.")
    d.rounded_rectangle((54, 160, 1226, 604), radius=14, fill=PANEL, outline="#344651", width=1)
    d.text((117, 178), "BEFORE · generic body and accent", fill=MUTED, font=font(16, BOLD))
    d.text((694, 178), "AFTER · named material controls", fill=GOLD, font=font(16, BOLD))
    paste_fit(im, BUNDLE / "before/municipal-fire-engine.png", (90, 214, 490, 350))
    paste_fit(im, PREVIEWS / "municipal-fire-engine.png", (668, 214, 490, 350))
    footer(d, "Before image retained from the original indexed preview; after image rendered from the promoted .kcad.ts source.")
    return im


def preset_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "02 / named palette variant", "Change the apparatus look", "The highVisibility render applies the indexed preset values to the source parameters.")
    d.rounded_rectangle((54, 160, 1226, 604), radius=14, fill=PANEL, outline="#344651", width=1)
    d.text((125, 180), "DEFAULT", fill=TEXT, font=font(16, BOLD))
    d.text((720, 180), "HIGH VISIBILITY", fill=GOLD, font=font(16, BOLD))
    paste_fit(im, PREVIEWS / "municipal-fire-engine.png", (90, 216, 500, 350))
    paste_fit(im, VARIANTS / "municipal-fire-engine.highVisibility.png", (670, 216, 500, 350))
    footer(d, "Both views are software renders of the same source geometry. The named preset changes material colors only.")
    return im


def turnout_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "03 / protective apparel palette", "Turnout coat details", "Raised torso profile, angled sleeves, reflective bands, pockets and closure hardware.")
    d.rounded_rectangle((54, 160, 1226, 604), radius=14, fill=PANEL, outline="#344651", width=1)
    d.text((125, 180), "DEFAULT · turnout fabric and reflective tape", fill=TEXT, font=font(15, BOLD))
    d.text((720, 180), "HIGH VISIBILITY · brighter fabric and trim", fill=GOLD, font=font(15, BOLD))
    paste_fit(im, PREVIEWS / "firefighter-turnout-coat.png", (90, 216, 500, 350))
    paste_fit(im, VARIANTS / "firefighter-turnout-coat.highVisibility.png", (670, 216, 500, 350))
    footer(d, "Illustrative PPE scene prop; the render is not protective-equipment certification or safety guidance.")
    return im


def source_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "04 / source controls", "Material names map to visible parts", "Municipal fire engine: body, cab, tires and metalwork remain independently editable.")
    lines = (KIT / "municipal-fire-engine.kcad.ts").read_text().splitlines()
    keep = [line.strip() for line in lines if any(token in line for token in (
        "bodyPaintColor = param", "cabPaintColor = param", "tireRubberColor = param",
        "metalworkColor = param", "weathered:", "highVisibility:",
        'add("apparatus-body"', 'add("crew-cab"', 'add("front-grille"',
    ))]
    d.rounded_rectangle((54, 155, 822, 596), radius=14, fill=PANEL, outline="#344651", width=1)
    y = 182
    for line in keep[:12]:
        d.text((78, y), line[:80], fill=BLUE if "param(" in line or "weathered" in line or "highVisibility" in line else TEXT, font=font(13, MONO))
        y += 31
    d.rounded_rectangle((856, 155, 1226, 596), radius=14, fill=PANEL, outline="#344651", width=1)
    paste_fit(im, PREVIEWS / "municipal-fire-engine.png", (874, 173, 334, 334))
    d.text((884, 532), "paint · cab · rubber · metal", fill=GOLD, font=font(14, BOLD))
    footer(d, "Native kernelCAD parameters and presets in the editable asset source.")
    return im


def gallery_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "05 / regenerated catalog previews", "A few objects from the kit", "The 60 assets span apparatus, hose and water delivery, ladders, tools and PPE.")
    card_w, card_h, gap, x0, y0 = 275, 420, 16, 54, 166
    for i, (title, asset_id) in enumerate(SHOWCASE):
        x = x0 + i * (card_w + gap)
        d.rounded_rectangle((x, y0, x + card_w, y0 + card_h), radius=10, fill=PANEL, outline="#344651", width=1)
        paste_fit(im, PREVIEWS / f"{asset_id}.png", (x + 7, y0 + 12, card_w - 14, 335))
        d.text((x + 12, y0 + 360), title, fill=TEXT, font=font(15, BOLD))
        d.text((x + 12, y0 + 389), "material controls · presets", fill=GOLD, font=font(12, MONO))
    footer(d, "Generated catalog previews display each source at its default values.")
    return im


def verification_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "06 / local verification", "Promotion complete for this kit", "Generated index, rendered previews, lint and the catalog integration suite.")
    results = json.loads((BUNDLE / "promotion-audit.json").read_text())
    d.rounded_rectangle((54, 155, 1226, 570), radius=18, fill=PANEL, outline="#344651", width=2)
    rows = [
        ("Existing assets promoted", str(results["assetsPromoted"])),
        ("Material controls / presets", f"{results['materialControlsMin']}–{results['materialControlsMax']} colors per asset · {results['presetEntries']} preset entries total"),
        ("Rendered previews / index rows", f"{results['previewsRendered']} / {results['indexedRowsWithPreview']}"),
        ("Catalog quality gate", results["qualityGate"]),
        ("Kit ESLint", results["eslint"]),
        ("Catalog integration suite", results["integration"]),
    ]
    y = 190
    for label, value in rows:
        d.text((84, y), label, fill=GOLD, font=font(16, BOLD))
        d.text((540, y), value, fill=TEXT, font=font(16))
        y += 52
    d.text((84, 528), "Branch content only · public deployment and equipment acceptance not established", fill=MUTED, font=font(13))
    footer(d, "Local source replay, software rendering, lint and catalog integration verification.")
    return im


def main():
    index = json.loads((ROOT / "catalog/index.json").read_text())
    assets = [asset for asset in index["assets"] if asset["kit"] == "fire-rescue"]
    if len(assets) != 60 or not all((PREVIEWS / f"{asset['id']}.png").is_file() for asset in assets):
        raise SystemExit("expected all 60 indexed fire-rescue assets and previews before capture")
    if not all((VARIANTS / f"{asset_id}.highVisibility.png").is_file() for asset_id in (
        "municipal-fire-engine", "firefighter-turnout-coat", "structural-fire-helmet"
    )):
        raise SystemExit("render the indexed highVisibility preset variants before capture")
    required = ["promotion-audit.json", "catalog-eslint-status.json", "catalog-test-status.json"]
    if not all((BUNDLE / name).is_file() for name in required):
        raise SystemExit("run the promotion audit, lint and catalog integration suite before capture")

    frames = [cover_frame(), before_after_frame(), preset_frame(), turnout_frame(), source_frame(), gallery_frame(), verification_frame()]
    frame_dir = BUNDLE / "frames"
    frame_dir.mkdir(parents=True, exist_ok=True)
    for i, frame in enumerate(frames, 1):
        frame.save(frame_dir / f"frame-{i:02d}.png", optimize=True)
    output = BUNDLE / "fire-rescue-quality-promotion.mp4"
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "1/3",
        "-i", str(frame_dir / "frame-%02d.png"), "-c:v", "libx264", "-r", "24",
        "-pix_fmt", "yuv420p", "-crf", "25", "-movflags", "+faststart", str(output),
    ], check=True)
    frames[0].save(BUNDLE / "poster.png", optimize=True)
    print(f"wrote {output}")


if __name__ == "__main__":
    main()
