#!/usr/bin/env python3
"""Render a short source-to-preview walkthrough for the quality promotion."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/recycling-facility"
PREVIEWS = KIT / "previews"
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, GREEN, BLUE = "#111923", "#1d2935", "#eef3f5", "#a6b6c0", "#86c89a", "#68b9c5"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"

SHOWCASES = [
    ("Containers and inbound", [
        "open-top-roll-off-skip", "liquid-waste-ibc-tank", "waste-inspection-platform", "weighbridge-kiosk",
        "weighbridge-deck", "vehicle-barrier-gate", "public-dropoff-canopy", "truck-wheel-wash",
    ]),
    ("Sorting and baling", [
        "inclined-belt-conveyor", "optical-sorter-arch", "near-infrared-sorter", "star-screen",
        "vertical-baler", "twin-shaft-shredder", "recovered-bale-wrapper", "paper-bale-transport-frame",
    ]),
    ("Glass, plastics and organics", [
        "glass-washer-trommel", "cullet-storage-silo", "bottle-cleaning-line", "plastic-wash-basin",
        "green-waste-shredder", "in-vessel-composter", "anaerobic-digester-tank", "biofilter-bed",
    ]),
    ("Residuals and site services", [
        "landfill-gas-wellhead", "stormwater-settling-basin", "geomembrane-welder", "litter-fence-panel",
        "dust-suppression-mist-cannon", "wheel-wash-reclaim-tank", "landfill-monitoring-pedestal", "residue-loadout-chute",
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
    d.text((76, 151), "RECYCLING FACILITY", fill=TEXT, font=font(48, BOLD))
    d.text((78, 238), "153 existing assets, promoted for color and form", fill=TEXT, font=font(25))
    d.text((78, 294), "2–4 material controls  ·  named appearance presets  ·  fresh previews", fill=MUTED, font=font(18))
    d.rounded_rectangle((72, 407, 1208, 557), radius=16, fill=PANEL, outline="#344651", width=2)
    d.text((104, 438), "Native .kcad.ts sources", fill=TEXT, font=font(24, BOLD))
    d.text((104, 487), "CC0 1.0   /   millimetres   /   Z up   /   editable scale and material colors", fill=GREEN, font=font(18))
    footer(d, "Local source-to-preview workflow · visualization props only · no equipment or site acceptance claim.")
    return im


def compare_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "01 / color before and after", "Same assets, clearer material roles", "The geometry identity stays in the source; named parts now carry their own colors.")
    examples = [
        ("Open-top roll-off skip", "open-top-roll-off-skip"),
        ("Optical sorter arch", "optical-sorter-arch"),
    ]
    for row, (label, asset_id) in enumerate(examples):
        y = 160 + row * 245
        d.rounded_rectangle((54, y, 1226, y + 220), radius=12, fill=PANEL, outline="#344651", width=1)
        d.text((76, y + 12), label, fill=TEXT, font=font(18, BOLD))
        before_path = BUNDLE / "before" / f"{asset_id}.png"
        after_path = PREVIEWS / f"{asset_id}.png"
        paste_fit(im, before_path, (120, y + 40, 300, 162))
        paste_fit(im, after_path, (456, y + 40, 300, 162))
        d.text((130, y + 27), "BEFORE · single color", fill=MUTED, font=font(12, BOLD))
        d.text((466, y + 27), "AFTER · material-separated", fill=GREEN, font=font(12, BOLD))
    footer(d, "Before images are retained from the original indexed preview; after images were rendered from the promoted source.")
    return im


def source_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "02 / source", "Material controls and named presets", "Optical sorter arch: frame, belt, camera pods and indicator are independently readable.")
    lines = (KIT / "optical-sorter-arch.kcad.ts").read_text().splitlines()
    selected = [line.strip() for line in lines if any(token in line for token in (
        "const paintedSteel", "const rubber", "const glass", "const safetyAmber", "weathered:", "highVisibility:",
        'p.part("belt-frame"', 'p.part("belt-surface"', 'p.part("camera-pod', 'p.part("indicator"',
    ))]
    y = 165
    for line in selected:
        value = line if len(line) <= 78 else line[:75] + "..."
        d.text((58, y), value, fill=TEXT if "p.part" in value else BLUE, font=font(14, MONO))
        y += 32
    d.rounded_rectangle((880, 155, 1210, 570), radius=16, fill=PANEL, outline="#344651", width=2)
    paste_fit(im, PREVIEWS / "optical-sorter-arch.png", (880, 170, 330, 330))
    d.text((918, 500), "painted steel · rubber · glass · amber", fill=GREEN, font=font(13, BOLD))
    d.text((918, 530), "weathered · highVisibility", fill=TEXT, font=font(14, MONO))
    footer(d, "The preview is regenerated from the indexed source at default parameters; the named presets remain editable in Studio.")
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
        d.text((x + 8, y + 211), "scale · material controls · presets", fill=GREEN, font=font(10, MONO))
    footer(d, "Local preview renders only · no production deployment, process rating or physical acceptance implied.")
    return im


def verification_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "04 / local verification", "Promotion complete for this kit", "The branch includes the generated catalog index and every refreshed preview path.")
    results = json.loads((BUNDLE / "promotion-audit.json").read_text())
    d.rounded_rectangle((54, 155, 1226, 565), radius=18, fill=PANEL, outline="#344651", width=2)
    rows = [
        ("Existing sources promoted", str(results["assetsPromoted"])),
        ("Material colors / presets", f"{results['materialKnobsMin']}–{results['materialKnobsMax']} controls · {results['presetEntries']} presets each"),
        ("Preview PNGs and index rows", f"{results['previewsRendered']} / {results['indexedRowsWithPreview']}"),
        ("Catalog quality gate", results["qualityGate"]),
        ("Kit ESLint", results["eslint"]),
        ("Catalog integration suite", results["integration"]),
    ]
    y = 184
    for label, value in rows:
        d.text((84, y), label, fill=GREEN, font=font(16, BOLD))
        d.text((560, y), value, fill=TEXT, font=font(16))
        y += 54
    d.text((84, 520), "Branch is not deployed · models are visualization props · hardware acceptance is not assessed", fill=MUTED, font=font(13))
    footer(d, "Local lint, catalog build, preview rendering and integration checks; live production behavior remains unverified.")
    return im


def main():
    index = json.loads((ROOT / "catalog/index.json").read_text())
    assets = [asset for asset in index["assets"] if asset["kit"] == "recycling-facility"]
    if len(assets) != 153 or not all((PREVIEWS / f"{asset['id']}.png").is_file() for asset in assets):
        raise SystemExit("expected all 153 indexed recycling-facility assets and previews before capture")
    required = ["promotion-audit.json", "catalog-eslint-status.json", "catalog-test-status.json"]
    if not all((BUNDLE / name).is_file() for name in required):
        raise SystemExit("run the quality audit, lint and catalog integration suite before capture")

    frames = [title_frame(), compare_frame(), source_frame()]
    frames.extend(showcase_frame(title, ids) for title, ids in SHOWCASES)
    frames.append(verification_frame())
    if len(frames) != 8:
        raise SystemExit("demo must use exactly eight readable frames")
    frame_dir = BUNDLE / "frames"
    frame_dir.mkdir(parents=True, exist_ok=True)
    for i, frame in enumerate(frames, 1):
        frame.save(frame_dir / f"frame-{i:02d}.png", optimize=True)
    output = BUNDLE / "recycling-facility-quality-promotion.mp4"
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "1/3",
        "-i", str(frame_dir / "frame-%02d.png"), "-c:v", "libx264", "-r", "24",
        "-pix_fmt", "yuv420p", "-crf", "25", "-movflags", "+faststart", str(output),
    ], check=True)
    frames[0].save(BUNDLE / "poster.png", optimize=True)
    print(f"wrote {output}")


if __name__ == "__main__":
    main()
