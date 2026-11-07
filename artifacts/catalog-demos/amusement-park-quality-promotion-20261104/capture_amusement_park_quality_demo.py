#!/usr/bin/env python3
"""Build a short source-to-preview demo from the actual catalog assets."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/amusement-park"
PREVIEWS = KIT / "previews"
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, GREEN, BLUE = "#111923", "#1d2935", "#eef3f5", "#a6b6c0", "#86c89a", "#68b9c5"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"


def font(size, path=FONT):
    return ImageFont.truetype(path, size)


def canvas():
    return Image.new("RGB", (WIDTH, HEIGHT), BG)


def header(draw, kicker, title, detail):
    draw.text((54, 27), kicker.upper(), fill=GREEN, font=font(15, BOLD))
    draw.text((54, 56), title, fill=TEXT, font=font(30, BOLD))
    draw.text((54, 100), detail, fill=MUTED, font=font(15))


def footer(draw, detail):
    draw.line((54, 678, WIDTH - 54, 678), fill="#35434e", width=1)
    draw.text((54, 688), detail, fill=MUTED, font=font(11))


def paste_fit(im, source, box):
    x, y, width, height = box
    preview = Image.open(source).convert("RGB")
    preview.thumbnail((width, height), Image.Resampling.LANCZOS)
    im.paste(preview, (x + (width - preview.width) // 2, y + (height - preview.height) // 2))


def title_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    d.text((72, 68), "kernelCAD  /  ASSET CATALOG", fill=GREEN, font=font(20, BOLD))
    d.text((76, 151), "AMUSEMENT PARK", fill=TEXT, font=font(47, BOLD))
    d.text((78, 238), "70 existing props promoted for color and form", fill=TEXT, font=font(25))
    d.text((78, 294), "3–4 material controls  ·  festival / twilight presets  ·  refreshed previews", fill=MUTED, font=font(17))
    d.rounded_rectangle((72, 407, 1208, 557), radius=16, fill=PANEL, outline="#344651", width=2)
    d.text((104, 438), "Native .kcad.ts sources", fill=TEXT, font=font(24, BOLD))
    d.text((104, 487), "CC0 1.0   /   millimetres   /   Z up   /   1,800 triangles maximum", fill=GREEN, font=font(18))
    footer(d, "Local source-to-preview workflow · visualization props · no ride safety or hardware acceptance claim.")
    return im


def compare_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "01 / preview comparison", "Same assets, clearer material roles", "Baseline renders beside refreshed previews from the promoted source.")
    examples = [
        ("Observation wheel", "park-observation-wheel"),
        ("Bumper car", "bumper-car"),
        ("Popcorn warmer", "popcorn-warmer-kiosk"),
    ]
    for row, (label, asset_id) in enumerate(examples):
        y = 148 + row * 169
        d.rounded_rectangle((54, y, 1226, y + 155), radius=12, fill=PANEL, outline="#344651", width=1)
        d.text((76, y + 8), label, fill=TEXT, font=font(16, BOLD))
        d.text((360, y + 10), "BEFORE · one color", fill=MUTED, font=font(11, BOLD))
        d.text((784, y + 10), "AFTER · separated materials", fill=GREEN, font=font(11, BOLD))
        paste_fit(im, BUNDLE / "before" / f"{asset_id}.png", (185, y + 28, 320, 120))
        paste_fit(im, PREVIEWS / f"{asset_id}.png", (615, y + 28, 320, 120))
    footer(d, "Rendered default views. The refreshed wheel has a continuous ring; the food case is glazed and stocked.")
    return im


def source_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "02 / native controls", "Material knobs match the ride parts", "Bumper car: painted fiberglass body, stainless steel controls, rubber bumpers and tires, enamel seat.")
    source = (KIT / "bumper-car.kcad.ts").read_text(encoding="utf-8").splitlines()
    selected = [line.strip() for line in source if any(token in line for token in (
        "const fiberglass", "const stainlessSteel", "const rubber", "const enamel", "festival:", "twilight:",
        'positioned.color(rubber)', 'positioned.color(enamel)', 'positioned.color(stainlessSteel)',
    ))]
    y = 158
    for line in selected[:12]:
        value = line if len(line) <= 80 else line[:77] + "..."
        d.text((58, y), value, fill=TEXT if "positioned.color" in value else BLUE, font=font(13, MONO))
        y += 30
    d.rounded_rectangle((888, 153, 1218, 565), radius=16, fill=PANEL, outline="#344651", width=2)
    paste_fit(im, PREVIEWS / "bumper-car.png", (890, 162, 326, 329))
    d.text((907, 505), "fiberglass · stainless steel · rubber", fill=GREEN, font=font(12, BOLD))
    d.text((907, 530), "enamel · festival · twilight", fill=TEXT, font=font(12, MONO))
    footer(d, "The source exposes the controls and presets; the image is the renderer's default-parameter preview.")
    return im


def showcase_frame(title, ids, detail):
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "03 / refreshed previews", title, detail)
    card_w, card_h, gap_x, x0, y0 = 378, 230, 16, 54, 162
    for i, asset_id in enumerate(ids):
        col, row = i % 3, i // 3
        x, y = x0 + col * (card_w + gap_x), y0 + row * (card_h + 12)
        d.rounded_rectangle((x, y, x + card_w, y + card_h), radius=9, fill=PANEL, outline="#344651", width=1)
        paste_fit(im, PREVIEWS / f"{asset_id}.png", (x + 5, y + 4, card_w - 10, 174))
        label = asset_id.replace("-", " ").title()
        if len(label) > 42:
            label = label[:39] + "..."
        d.text((x + 10, y + 184), label, fill=TEXT, font=font(13, BOLD))
        d.text((x + 10, y + 207), "scale · material controls · presets", fill=GREEN, font=font(10, MONO))
    footer(d, "Source-generated software previews only · no live-site deployment or physical acceptance implied.")
    return im


def verification_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "04 / local verification", "Promotion complete for this kit", "Source hashes, rendered previews, catalog pages, lint and catalog integration.")
    audit = json.loads((BUNDLE / "promotion-audit.json").read_text(encoding="utf-8"))
    quality = json.loads((BUNDLE / "catalog-quality-status.json").read_text(encoding="utf-8"))
    lint = json.loads((BUNDLE / "catalog-eslint-status.json").read_text(encoding="utf-8"))
    tests = json.loads((BUNDLE / "catalog-test-status.json").read_text(encoding="utf-8"))
    pages = json.loads((BUNDLE / "catalog-pages-check.json").read_text(encoding="utf-8"))
    d.rounded_rectangle((54, 154, 1226, 565), radius=18, fill=PANEL, outline="#344651", width=2)
    rows = [
        ("Existing source IDs", f"{audit['assetsPromoted']} / {audit['expectedExistingAssets']}"),
        ("Material controls / presets", f"{audit['materialColorKnobsPerAsset']['min']}–{audit['materialColorKnobsPerAsset']['max']} / asset · {audit['presetVariants']} total"),
        ("Refreshed previews / current hashes", f"{audit['previewsRendered']} / {'passed' if audit['sourceHashesMatch'] else 'failed'}"),
        ("Triangle range", f"{audit['triangleRange']['min']}–{audit['triangleRange']['max']} / 1,800"),
        ("Catalog quality gate / kit ESLint", f"{'passed' if quality['passed'] else 'failed'} / {'passed' if lint['passed'] else 'failed'}"),
        ("Integration / local detail pages", f"{'passed' if tests['passed'] else 'failed'} / {pages['pageAndPreviewPairs']} pairs"),
    ]
    y = 178
    for label, value in rows:
        d.text((84, y), label, fill=GREEN, font=font(15, BOLD))
        d.text((585, y), value, fill=TEXT, font=font(15))
        y += 49
    d.text((84, 497), "Branch not deployed · live pages not claimed · ride safety / hardware not assessed", fill=MUTED, font=font(13))
    footer(d, "All checks shown are local source, software render and catalog verification.")
    return im


def main():
    index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
    assets = [asset for asset in index["assets"] if asset["kit"] == "amusement-park"]
    required = ["promotion-audit.json", "catalog-quality-status.json", "catalog-eslint-status.json", "catalog-test-status.json", "catalog-pages-check.json"]
    if len(assets) != 70 or any(not (PREVIEWS / f"{asset['id']}.png").is_file() for asset in assets):
        raise SystemExit("expected all 70 indexed amusement-park assets and refreshed previews before capture")
    if any(not (BUNDLE / name).is_file() for name in required):
        raise SystemExit("run the source audit, quality gate, lint, integration and local-page checks before capture")
    if any(not json.loads((BUNDLE / name).read_text(encoding="utf-8")).get("passed") for name in required[1:]):
        raise SystemExit("quality, lint, integration and local-page checks must pass before capture")

    frames = [
        title_frame(),
        compare_frame(),
        source_frame(),
        showcase_frame("Ride and boat silhouettes", ["park-observation-wheel", "bumper-car", "log-flume-boat", "pirate-ship-ride-car", "family-carousel", "junior-coaster-train-car"], "The continuous wheel rim, shaped car nose and tapered boat hulls come from native source geometry."),
        showcase_frame("A full guest-precinct kit", ["park-entry-arch", "family-carousel", "water-race-game-lane", "popcorn-warmer-kiosk", "park-stroller", "park-waste-sorting-station"], "Entry, attractions, midway, concessions, mobility and operations use distinct material palettes."),
        verification_frame(),
    ]
    frame_dir = BUNDLE / "frames"
    frame_dir.mkdir(parents=True, exist_ok=True)
    for i, frame in enumerate(frames, 1):
        frame.save(frame_dir / f"frame-{i:02d}.png", optimize=True)
    frames[0].save(BUNDLE / "poster.png", optimize=True)
    video = BUNDLE / "amusement-park-quality-promotion.mp4"
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "1/3",
        "-i", str(frame_dir / "frame-%02d.png"), "-c:v", "libx264", "-r", "24",
        "-pix_fmt", "yuv420p", "-crf", "25", "-movflags", "+faststart", str(video),
    ], check=True)
    print(f"wrote {video}")


if __name__ == "__main__":
    main()
