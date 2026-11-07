#!/usr/bin/env python3
"""Capture the local source, preview and verification workflow for this promotion."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/space-exploration"
PREVIEWS = KIT / "previews"
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, GREEN, BLUE = "#111923", "#1d2935", "#eef3f5", "#a6b6c0", "#86c89a", "#75bfd1"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"

SHOWCASES = [
    ("Rovers and mobility", [
        "lunar-rover-chassis", "rover-wheel-assembly", "rover-dust-shield", "rover-seat",
        "surface-utility-cart", "sample-trailer-cart", "rover-charging-dock", "transport-sled",
    ]),
    ("Spacecraft and power", [
        "orbital-communication-dish", "satellite-bus", "satellite-solar-wing", "surface-battery-bank",
        "power-distribution-unit", "relay-beacon", "surface-antenna-mast", "field-lamp",
    ]),
    ("Habitat and field science", [
        "lunar-habitat-module", "habitat-corridor-section", "inflatable-habitat-frame", "sample-drill-head",
        "regolith-sieve", "drill-core-tube-rack", "sample-cassette", "portable-science-console",
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


def paste_fit(im, source, bounds):
    x, y, width, height = bounds
    preview = Image.open(source).convert("RGB")
    preview.thumbnail((width, height), Image.Resampling.LANCZOS)
    im.paste(preview, (x + (width - preview.width) // 2, y + (height - preview.height) // 2))


def title_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    d.text((72, 68), "kernelCAD  /  ASSET CATALOG", fill=GREEN, font=font(20, BOLD))
    d.text((76, 151), "SPACE EXPLORATION", fill=TEXT, font=font(48, BOLD))
    d.text((78, 238), "52 existing assets, promoted for color and form", fill=TEXT, font=font(25))
    d.text((78, 294), "2–4 material controls  ·  lunarDust / highVisibility presets  ·  refreshed previews", fill=MUTED, font=font(17))
    d.rounded_rectangle((72, 407, 1208, 557), radius=16, fill=PANEL, outline="#344651", width=2)
    d.text((104, 438), "Native .kcad.ts sources", fill=TEXT, font=font(24, BOLD))
    d.text((104, 487), "CC0 1.0   /   millimetres   /   Z up   /   editable scale and material colors", fill=GREEN, font=font(18))
    footer(d, "Local source-to-preview workflow · stylized scene props · no flight or hardware acceptance claim.")
    return im


def compare_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "01 / before and after", "Same assets, clearer material roles", "The index keeps each ID; generated previews now show distinct surfaces and shapes.")
    examples = [
        ("Lunar rover chassis", "lunar-rover-chassis"),
        ("Orbital communication dish", "orbital-communication-dish"),
    ]
    for row, (label, asset_id) in enumerate(examples):
        y = 160 + row * 245
        d.rounded_rectangle((54, y, 1226, y + 220), radius=12, fill=PANEL, outline="#344651", width=1)
        d.text((76, y + 12), label, fill=TEXT, font=font(18, BOLD))
        d.text((130, y + 35), "BEFORE · single color", fill=MUTED, font=font(12, BOLD))
        d.text((466, y + 35), "AFTER · material-separated", fill=GREEN, font=font(12, BOLD))
        paste_fit(im, BUNDLE / "before" / f"{asset_id}.png", (120, y + 52, 300, 150))
        paste_fit(im, PREVIEWS / f"{asset_id}.png", (456, y + 52, 300, 150))
    footer(d, "Before images are the original indexed previews; after images are rendered from regenerated sources.")
    return im


def source_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "02 / source and preview", "A rover with useful material controls", "The source maps each control to a visible component and keeps the model scale editable.")
    lines = (KIT / "lunar-rover-chassis.kcad.ts").read_text().splitlines()
    selected = [line.strip() for line in lines if any(token in line for token in (
        "const paint =", "const aluminum =", "const rubber =", "const glass =", "lunarDust:",
        "highVisibility:", 'p.part("deck"', 'p.part("equipment-bay"',
        'p.part("instrument-cover"', 'p.part("wheel--1-0"', 'p.part("navigation-camera"',
    ))]
    y = 164
    for line in selected:
        value = line if len(line) <= 80 else line[:77] + "..."
        d.text((58, y), value, fill=TEXT if "p.part" in value else BLUE, font=font(14, MONO))
        y += 31
    d.rounded_rectangle((875, 155, 1210, 570), radius=16, fill=PANEL, outline="#344651", width=2)
    paste_fit(im, PREVIEWS / "lunar-rover-chassis.png", (880, 170, 325, 325))
    d.text((906, 500), "paint · aluminum · rubber · glass", fill=GREEN, font=font(13, BOLD))
    d.text((912, 530), "lunarDust · highVisibility", fill=TEXT, font=font(14, MONO))
    footer(d, "Preview uses default parameters; appearance presets remain available in the source.")
    return im


def showcase_frame(title, ids):
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "03 / regenerated previews", title, "Default-parameter renders from the promoted .kcad.ts sources.")
    card_w, card_h, gap_x, x0, y0 = 280, 235, 12, 54, 164
    for i, asset_id in enumerate(ids):
        col, row = i % 4, i // 4
        x, y = x0 + col * (card_w + gap_x), y0 + row * (card_h + 12)
        d.rounded_rectangle((x, y, x + card_w, y + card_h), radius=9, fill=PANEL, outline="#344651", width=1)
        paste_fit(im, PREVIEWS / f"{asset_id}.png", (x + 4, y + 4, card_w - 8, 176))
        label = asset_id.replace("-", " ").title()
        if len(label) > 34:
            label = label[:31] + "..."
        d.text((x + 8, y + 189), label, fill=TEXT, font=font(12, BOLD))
        d.text((x + 8, y + 211), "scale · materials · presets", fill=GREEN, font=font(10, MONO))
    footer(d, "Local preview renders only · no production deployment, mission rating or physical acceptance implied.")
    return im


def verification_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "04 / local verification", "Promotion complete for this kit", "The branch includes all existing IDs, refreshed previews and generated index rows.")
    results = json.loads((BUNDLE / "verification.json").read_text())
    d.rounded_rectangle((54, 155, 1226, 565), radius=18, fill=PANEL, outline="#344651", width=2)
    rows = [
        ("Existing assets promoted", str(results["assetsPromoted"])),
        ("Material controls and presets", f"{results['materialKnobsMin']}–{results['materialKnobsMax']} controls · {max(results['presetsPerAsset'])} presets each"),
        ("Previews and indexed rows", f"{results['previewsRendered']} / {results['indexedRowsWithPreview']}"),
        ("Kit quality gate", results["kitQualityGate"]),
        ("Kit ESLint", results["eslint"]),
        ("Catalog integration suite", results["integration"]),
    ]
    y = 184
    for label, value in rows:
        d.text((84, y), label, fill=GREEN, font=font(16, BOLD))
        d.text((560, y), value, fill=TEXT, font=font(16))
        y += 54
    d.text((84, 520), "Branch is not deployed · stylized visualization assets · hardware acceptance not assessed", fill=MUTED, font=font(13))
    footer(d, "Local lint, quality gate, index build, preview render and integration checks; public behavior remains unverified.")
    return im


def main():
    index = json.loads((ROOT / "catalog/index.json").read_text())
    assets = [asset for asset in index["assets"] if asset["kit"] == "space-exploration"]
    if len(assets) != 52 or not all((PREVIEWS / f"{asset['id']}.png").is_file() for asset in assets):
        raise SystemExit("expected all 52 indexed space-exploration assets and previews before capture")
    if not (BUNDLE / "verification.json").is_file():
        raise SystemExit("run the quality, lint and catalog integration checks before capture")

    frames = [title_frame(), compare_frame(), source_frame()]
    frames.extend(showcase_frame(title, ids) for title, ids in SHOWCASES)
    frames.append(verification_frame())
    if len(frames) != 7:
        raise SystemExit("demo must use exactly seven readable frames")
    frame_dir = BUNDLE / "frames"
    frame_dir.mkdir(parents=True, exist_ok=True)
    for i, frame in enumerate(frames, 1):
        frame.save(frame_dir / f"frame-{i:02d}.png", optimize=True)
    output = BUNDLE / "space-exploration-quality-promotion.mp4"
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "2/5",
        "-i", str(frame_dir / "frame-%02d.png"), "-c:v", "libx264", "-r", "24",
        "-pix_fmt", "yuv420p", "-crf", "25", "-movflags", "+faststart", str(output),
    ], check=True)
    frames[0].save(BUNDLE / "poster.png", optimize=True)
    print(f"wrote {output}")


if __name__ == "__main__":
    main()
