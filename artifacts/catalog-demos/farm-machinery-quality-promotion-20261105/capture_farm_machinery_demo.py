#!/usr/bin/env python3
"""Create a short, readable source-to-preview walkthrough for the promoted kit."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/farm-machinery"
PREVIEWS = KIT / "previews"
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, GREEN, BLUE = "#111923", "#1d2935", "#eef3f5", "#a6b6c0", "#86c89a", "#68b9c5"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"

SHOWCASES = [
    ("Tractors and harvesting", [
        "articulated-4wd-tractor", "row-crop-tractor", "combine-harvester", "orchard-tractor",
        "tracked-field-tractor", "high-clearance-sprayer-tractor", "cotton-picker", "forage-harvester",
    ]),
    ("Grain handling", [
        "farm-grain-auger", "portable-grain-conveyor", "grain-cart", "grain-dryer",
        "grain-bin-aeration-fan", "grain-header", "corn-header", "traveling-sprinkler-cart",
    ]),
    ("Field implements", [
        "field-cultivator", "precision-planter", "offset-disc-harrow", "moldboard-plow",
        "no-till-seeder", "land-leveling-scraper", "tractor-box-blade", "rear-landscape-rake",
    ]),
    ("Hay, forage and crop care", [
        "round-baler", "square-baler", "bale-wrapper", "wheel-hay-rake",
        "rotary-tedder", "forage-wagon", "sicklebar-mower", "sugar-beet-harvester",
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
    d.text((76, 151), "FARM MACHINERY", fill=TEXT, font=font(48, BOLD))
    d.text((78, 238), "60 existing assets, promoted for color and form", fill=TEXT, font=font(25))
    d.text((78, 294), "2–4 material controls  ·  named presets  ·  refreshed previews", fill=MUTED, font=font(18))
    d.rounded_rectangle((72, 407, 1208, 557), radius=16, fill=PANEL, outline="#344651", width=2)
    d.text((104, 438), "Native .kcad.ts sources", fill=TEXT, font=font(24, BOLD))
    d.text((104, 487), "CC0 1.0   /   millimetres   /   Z up   /   editable scale and material colors", fill=GREEN, font=font(18))
    footer(d, "Local source-to-preview workflow · visualization props only · no equipment acceptance claim.")
    return im


def compare_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "01 / color and assembly", "Same assets, clearer material roles", "Before and regenerated renders of the tractor and grain auger.")
    examples = [
        ("Articulated 4WD tractor", "articulated-4wd-tractor"),
        ("Farm grain auger", "farm-grain-auger"),
    ]
    for row, (label, asset_id) in enumerate(examples):
        y = 160 + row * 245
        d.rounded_rectangle((54, y, 1226, y + 220), radius=12, fill=PANEL, outline="#344651", width=1)
        d.text((76, y + 12), label, fill=TEXT, font=font(18, BOLD))
        paste_fit(im, BUNDLE / "before" / f"{asset_id}.png", (180, y + 58, 310, 150))
        paste_fit(im, PREVIEWS / f"{asset_id}.png", (790, y + 58, 310, 150))
        d.text((190, y + 38), "BEFORE · original preview", fill=MUTED, font=font(12, BOLD))
        d.text((800, y + 38), "AFTER · material-separated", fill=GREEN, font=font(12, BOLD))
    footer(d, "Before images are retained originals; after images were rendered from promoted sources.")
    return im


def source_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "02 / editable source", "Material controls and named presets", "Tractor: painted steel, rubber, cab glass and exposed steel are separate.")
    lines = (KIT / "articulated-4wd-tractor.kcad.ts").read_text().splitlines()
    selected = [line.strip() for line in lines if any(token in line for token in (
        "const paintedSteelColor", "const rubberColor", "const glassColor", "const steelColor",
        "weathered:", "highVisibility:", "engine-hood", "cab-glazing-front", "rear-wheel-1-hub",
    ))]
    y = 164
    for line in selected:
        value = line if len(line) <= 83 else line[:80] + "..."
        d.text((58, y), value, fill=TEXT if "add(" in value else BLUE, font=font(13, MONO))
        y += 34
    d.rounded_rectangle((905, 157, 1212, 565), radius=16, fill=PANEL, outline="#344651", width=2)
    paste_fit(im, PREVIEWS / "articulated-4wd-tractor.png", (905, 170, 307, 307))
    d.text((927, 492), "paint · rubber · glass · steel", fill=GREEN, font=font(13, BOLD))
    d.text((927, 523), "weathered · highVisibility", fill=TEXT, font=font(13, MONO))
    footer(d, "Default-parameter preview from indexed source; presets and material controls stay editable in Studio.")
    return im


def showcase_frame(title, ids):
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "03 / regenerated previews", title, "Default-parameter renders from promoted .kcad.ts sources.")
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
    footer(d, "Local preview renders only · no production deployment or physical performance implied.")
    return im


def verification_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "04 / local verification", "Promotion complete for this kit", "Generated index, previews, local pages and source checks are recorded in this bundle.")
    results = json.loads((BUNDLE / "promotion-audit.json").read_text())
    eslint = json.loads((BUNDLE / "catalog-eslint-status.json").read_text())
    tests = json.loads((BUNDLE / "catalog-test-status.json").read_text())
    page_result = json.loads((BUNDLE / "catalog-pages-check.json").read_text())
    knob_counts = [int(value) for value in results["materialColorControlsPerAsset"]]
    d.rounded_rectangle((54, 155, 1226, 565), radius=18, fill=PANEL, outline="#344651", width=2)
    rows = [
        ("Existing sources promoted", str(results["assetsPromoted"])),
        ("Material controls / presets", f"{min(knob_counts)}–{max(knob_counts)} colors / {results['namedPresetEntries']} named variants"),
        ("Rendered previews / indexed", f"{results['previewsRendered']} / {results['indexedRowsWithPreview']}"),
        ("Kit quality gate", results["qualityGate"]),
        ("Kit ESLint", eslint["status"]),
        ("Catalog integration suite", tests["status"]),
        ("Local pages", f"{page_result['pagesVerified']} / {page_result['indexedAssets']}"),
    ]
    y = 178
    for label, value in rows:
        d.text((84, y), label, fill=GREEN, font=font(15, BOLD))
        d.text((560, y), value, fill=TEXT, font=font(15))
        y += 48
    d.text((84, 520), "Branch is not deployed · visualization props · hardware acceptance not assessed", fill=MUTED, font=font(13))
    footer(d, "Local lint, catalog build, preview rendering and integration checks; public production behavior is unverified.")
    return im


def main():
    index = json.loads((ROOT / "catalog/index.json").read_text())
    assets = [asset for asset in index["assets"] if asset["kit"] == "farm-machinery"]
    if len(assets) != 60 or not all((PREVIEWS / f"{asset['id']}.png").is_file() for asset in assets):
        raise SystemExit("expected all 60 indexed farm-machinery assets and previews before capture")
    required = ["promotion-audit.json", "catalog-eslint-status.json", "catalog-test-status.json", "catalog-pages-check.json"]
    if not all((BUNDLE / name).is_file() for name in required):
        raise SystemExit("run the source, lint, integration, and local page audits before capture")

    frames = [title_frame(), compare_frame(), source_frame()]
    frames.extend(showcase_frame(title, ids) for title, ids in SHOWCASES)
    frames.append(verification_frame())
    if len(frames) != 8:
        raise SystemExit("demo must use exactly eight readable frames")
    frame_dir = BUNDLE / "frames"
    frame_dir.mkdir(parents=True, exist_ok=True)
    for i, frame in enumerate(frames, 1):
        frame.save(frame_dir / f"frame-{i:02d}.png", optimize=True)
    output = BUNDLE / "farm-machinery-quality-promotion.mp4"
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
    (BUNDLE / "video-inspection.json").write_text(json.dumps(json.loads(probe.stdout), indent=2) + "\n")
    print(f"wrote {output}")


if __name__ == "__main__":
    main()
