#!/usr/bin/env python3
"""Create a concise source, preset, preview, and verification walkthrough."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/industrial-plant"
PREVIEWS = KIT / "previews"
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, GREEN, BLUE = "#111923", "#1d2935", "#eef3f5", "#a6b6c0", "#86c89a", "#68b9c5"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"

SHOWCASES = [
    ("Process equipment", [
        "vertical-storage-tank", "centrifugal-pump", "baghouse-dust-collector", "steam-header-manifold",
        "process-reactor-vessel", "cyclone-separator", "plate-heat-exchanger", "weigh-hopper",
    ]),
    ("Material handling and structures", [
        "belt-conveyor", "bucket-elevator", "roller-conveyor-line", "grating-walkway-module",
        "bridge-crane", "pipe-rack-bay", "industrial-stair-tower", "machine-guard-enclosure",
    ]),
    ("Vehicles and shop equipment", [
        "forklift-truck", "electric-pallet-jack", "scissor-lift-table", "gantry-crane",
        "mobile-tool-cart", "palletizer-robot-cell", "maintenance-platform", "vertical-cage-ladder",
    ]),
]


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


def paste_fit(im, source, box):
    x, y, width, height = box
    preview = Image.open(source).convert("RGB")
    preview.thumbnail((width, height), Image.Resampling.LANCZOS)
    im.paste(preview, (x + (width - preview.width) // 2, y + (height - preview.height) // 2))


def title_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    d.text((72, 68), "kernelCAD  /  ASSET CATALOG", fill=GREEN, font=font(20, BOLD))
    d.text((76, 151), "INDUSTRIAL PLANT", fill=TEXT, font=font(48, BOLD))
    d.text((78, 238), "60 existing models, upgraded in place", fill=TEXT, font=font(27))
    d.text((78, 295), "material controls  ·  named presets  ·  stronger silhouettes", fill=MUTED, font=font(19))
    d.rounded_rectangle((72, 407, 1208, 557), radius=16, fill=PANEL, outline="#344651", width=2)
    d.text((104, 438), "No new IDs or duplicate catalog rows", fill=TEXT, font=font(24, BOLD))
    d.text((104, 487), "CC0 1.0   /   kernelCAD source   /   millimetres   /   Z up", fill=GREEN, font=font(18))
    footer(d, "Local authoring and preview workflow · visualization props only · physical equipment acceptance not assessed.")
    return im


def compare_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "01 / silhouette", "Make the equipment read clearly", "A visible fan rotor, flared tower shell, and tapered hopper outlet sharpen the silhouettes.")
    examples = [
        ("Axial flow fan", "axial-flow-fan"),
        ("Evaporative cooling tower", "evaporative-cooling-tower"),
    ]
    for row, (label, asset_id) in enumerate(examples):
        y = 160 + row * 245
        d.rounded_rectangle((54, y, 1226, y + 220), radius=12, fill=PANEL, outline="#344651", width=1)
        d.text((76, y + 12), label, fill=TEXT, font=font(18, BOLD))
        paste_fit(im, BUNDLE / "before" / f"{asset_id}.png", (170, y + 54, 330, 155))
        paste_fit(im, PREVIEWS / f"{asset_id}.png", (790, y + 54, 330, 155))
        d.text((180, y + 34), "BEFORE · original preview", fill=MUTED, font=font(12, BOLD))
        d.text((800, y + 34), "AFTER · regenerated preview", fill=GREEN, font=font(12, BOLD))
    footer(d, "The catalog IDs and part names stay stable; the previews reflect current .kcad.ts sources.")
    return im


def preset_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "02 / named variant", "A preset changes the material color", "The highVisibility preset is evaluated from the authored source before rendering.")
    d.rounded_rectangle((54, 160, 1226, 577), radius=14, fill=PANEL, outline="#344651", width=1)
    paste_fit(im, PREVIEWS / "axial-flow-fan.png", (104, 196, 450, 320))
    paste_fit(im, BUNDLE / "variants/axial-flow-fan-highVisibility.png", (726, 196, 450, 320))
    d.text((230, 535), "DEFAULT", fill=MUTED, font=font(17, BOLD))
    d.text((815, 535), "highVisibility", fill=GREEN, font=font(17, BOLD))
    footer(d, "Variant render uses the declared highVisibility preset value; it is not a production page capture.")
    return im


def source_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "03 / editable source", "Material controls in .kcad.ts", "Steel, safety paint, and a recognizable five-blade rotor are authored directly.")
    lines = (KIT / "axial-flow-fan.kcad.ts").read_text().splitlines()
    selected = [line.strip() for line in lines if any(token in line for token in (
        "const steel =", "const safetyPaint =", "weathered:", "highVisibility:",
        "const fanShroud =", "const fanBladeProfile =", ".moveTo(56,", "for (let blade",
    ))]
    y = 170
    for line in selected:
        value = line if len(line) <= 91 else line[:88] + "..."
        d.text((58, y), value, fill=BLUE if "color(" in value else TEXT, font=font(13, MONO))
        y += 38
    d.rounded_rectangle((927, 162, 1220, 537), radius=16, fill=PANEL, outline="#344651", width=2)
    paste_fit(im, PREVIEWS / "axial-flow-fan.png", (930, 170, 286, 286))
    d.text((952, 474), "steel · safety paint", fill=GREEN, font=font(13, BOLD))
    d.text((952, 503), "weathered · highVisibility", fill=TEXT, font=font(12, MONO))
    footer(d, "Source and preview checks are local; publishing and physical equipment performance are separate.")
    return im


def showcase_frame(title, ids):
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "04 / regenerated previews", title, "Default-color renders from the promoted kernelCAD sources.")
    card_w, card_h, gap_x, x0, y0 = 282, 226, 12, 54, 164
    for i, asset_id in enumerate(ids):
        col, row = i % 4, i // 4
        x, y = x0 + col * (card_w + gap_x), y0 + row * (card_h + 12)
        d.rounded_rectangle((x, y, x + card_w, y + card_h), radius=9, fill=PANEL, outline="#344651", width=1)
        paste_fit(im, PREVIEWS / f"{asset_id}.png", (x + 4, y + 3, card_w - 8, 170))
        label = asset_id.replace("-", " ").title()
        if len(label) > 31:
            label = label[:28] + "..."
        d.text((x + 8, y + 185), label, fill=TEXT, font=font(12, BOLD))
        d.text((x + 8, y + 205), "steel · safety paint · presets", fill=GREEN, font=font(10, MONO))
    footer(d, "Rendered previews only · no production deployment or equipment acceptance implied.")
    return im


def verification_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "08 / local verification", "Promotion complete for this kit", "Generated index, previews, source checks, and local pages are recorded in this bundle.")
    results = json.loads((BUNDLE / "promotion-audit.json").read_text())
    eslint = json.loads((BUNDLE / "catalog-eslint-status.json").read_text())
    tests = json.loads((BUNDLE / "catalog-test-status.json").read_text())
    page_result = json.loads((BUNDLE / "catalog-pages-check.json").read_text())
    d.rounded_rectangle((54, 155, 1226, 565), radius=18, fill=PANEL, outline="#344651", width=2)
    rows = [
        ("Existing sources promoted", str(results["assetsPromoted"])),
        ("New catalog IDs", str(results["newAssetsAdded"])),
        ("Material color controls", f"{results['materialKnobsMin']}–{results['materialKnobsMax']} per asset · {results['materialKnobsTotal']} total"),
        ("Named presets", f"{results['presetEntriesTotal']} entries"),
        ("Rendered previews / indexed", f"{results['previewsRendered']} / {results['indexedRowsWithPreview']}"),
        ("Kit quality gate", results["qualityGate"]),
        ("ESLint / integration", f"{eslint['status']} / {tests['status']}"),
        ("Local catalog pages", f"{page_result['pageAndPreviewPairs']} / {page_result['kitPages']}"),
    ]
    y = 171
    for label, value in rows:
        d.text((84, y), label, fill=GREEN, font=font(14, BOLD))
        d.text((530, y), value, fill=TEXT, font=font(14))
        y += 46
    d.text((84, 540), "Branch is not deployed · visualization props · equipment ratings not assessed", fill=MUTED, font=font(13))
    footer(d, "Local lint, index build, preview rendering, and integration checks; deployed behavior is unverified.")
    return im


def main():
    index = json.loads((ROOT / "catalog/index.json").read_text())
    assets = [asset for asset in index["assets"] if asset["kit"] == "industrial-plant"]
    required_previews = [PREVIEWS / f"{asset['id']}.png" for asset in assets]
    if len(assets) != 60 or not all(path.is_file() for path in required_previews):
        raise SystemExit("expected all 60 indexed industrial-plant assets and previews")
    if not all((BUNDLE / "before" / f"{name}.png").is_file() for name in ("axial-flow-fan", "evaporative-cooling-tower")):
        raise SystemExit("original comparison previews are missing")
    if not (BUNDLE / "variants/axial-flow-fan-highVisibility.png").is_file():
        raise SystemExit("run render_industrial_variant.mts before capturing the video")
    required = ["promotion-audit.json", "catalog-eslint-status.json", "catalog-test-status.json", "catalog-pages-check.json"]
    if not all((BUNDLE / name).is_file() for name in required):
        raise SystemExit("run source, lint, integration, and local page audits before capture")

    frames = [title_frame(), compare_frame(), preset_frame(), source_frame()]
    frames.extend(showcase_frame(title, ids) for title, ids in SHOWCASES)
    frames.append(verification_frame())
    if len(frames) != 8:
        raise SystemExit("demo must use exactly eight readable frames")
    frame_dir = BUNDLE / "frames"
    frame_dir.mkdir(parents=True, exist_ok=True)
    for i, frame in enumerate(frames, 1):
        frame.save(frame_dir / f"frame-{i:02d}.png", optimize=True)
    output = BUNDLE / "industrial-plant-quality-promotion.mp4"
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "1/3",
        "-i", str(frame_dir / "frame-%02d.png"), "-c:v", "libx264", "-r", "24",
        "-pix_fmt", "yuv420p", "-crf", "25", "-movflags", "+faststart", str(output),
    ], check=True)
    frames[0].save(BUNDLE / "poster.png", optimize=True)
    probe = subprocess.run([
        "ffprobe", "-v", "error", "-show_entries", "format=duration,size:stream=width,height,avg_frame_rate,codec_name",
        "-of", "json", str(output),
    ], check=True, capture_output=True, text=True)
    (BUNDLE / "video-metadata.json").write_text(json.dumps(json.loads(probe.stdout), indent=2) + "\n")
    print(json.dumps(json.loads(probe.stdout), indent=2))


if __name__ == "__main__":
    main()
