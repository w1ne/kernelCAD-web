#!/usr/bin/env python3
"""Create an inspected source-to-preview walkthrough for grid substation."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/grid-substation"
PREVIEWS = KIT / "previews"
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, GREEN, BLUE = "#111923", "#1d2935", "#eef3f5", "#a6b6c0", "#86c89a", "#68b9c5"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"

SHOWCASES = [
    ("Switching and high voltage", [
        "substation-overhead-line-gantry", "substation-three-pole-disconnector",
        "substation-dead-tank-breaker", "substation-surge-arrester",
        "substation-line-trap", "substation-busbar-expansion-joint",
    ]),
    ("Transformer and control", [
        "substation-main-power-transformer", "substation-bushing-turret",
        "substation-transformer-radiator-bank", "substation-transformer-cooling-fan",
        "substation-protection-control-kiosk", "substation-protection-relay-rack",
    ]),
    ("Cable routes and yard safety", [
        "substation-precast-cable-trench", "substation-cable-ladder-section",
        "substation-power-cable-reel", "substation-high-voltage-warning-sign",
        "substation-fire-monitor-post", "substation-maintenance-access-platform",
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
    d.text((76, 151), "GRID SUBSTATION", fill=TEXT, font=font(48, BOLD))
    d.text((78, 238), "80 existing assets promoted for color and form", fill=TEXT, font=font(25))
    d.text((78, 294), "2–4 material controls  ·  named finish presets  ·  refreshed previews", fill=MUTED, font=font(18))
    d.rounded_rectangle((72, 407, 1208, 557), radius=16, fill=PANEL, outline="#344651", width=2)
    d.text((104, 438), "Native .kcad.ts sources", fill=TEXT, font=font(24, BOLD))
    d.text((104, 487), "CC0 1.0   /   millimetres   /   Z up   /   editable scale and materials", fill=GREEN, font=font(18))
    footer(d, "Local source-to-preview workflow · visualization props · no electrical or field acceptance claim.")
    return im


def compare_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "01 / color before and after", "Same assets, clearer material roles", "Baseline previews from the prior source beside renders from the promoted source.")
    examples = [
        ("Main power transformer", "substation-main-power-transformer"),
        ("High voltage warning sign", "substation-high-voltage-warning-sign"),
    ]
    for row, (label, asset_id) in enumerate(examples):
        y = 160 + row * 245
        d.rounded_rectangle((54, y, 1226, y + 220), radius=12, fill=PANEL, outline="#344651", width=1)
        d.text((76, y + 12), label, fill=TEXT, font=font(18, BOLD))
        d.text((395, y + 14), "BEFORE · single color", fill=MUTED, font=font(12, BOLD))
        d.text((735, y + 14), "AFTER · material-separated", fill=GREEN, font=font(12, BOLD))
        paste_fit(im, BUNDLE / "before" / f"{asset_id}.png", (120, y + 40, 300, 162))
        paste_fit(im, PREVIEWS / f"{asset_id}.png", (456, y + 40, 300, 162))
    footer(d, "The original IDs and object roles remain; materials and geometry are authored in their native sources.")
    return im


def source_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "02 / source controls", "Color knobs follow component materials", "Main power transformer: enamel tank, steel cooler, porcelain bushings and rubber wheels.")
    path = KIT / "substation-main-power-transformer.kcad.ts"
    lines = path.read_text().splitlines()
    selected = [line.strip() for line in lines if any(token in line for token in (
        "const transformerEnamel", "const stainlessSteel", "const porcelain", "const rubber",
        "weathered:", "maintenance:", 'p.part("main-tank"', 'p.part("cooler-fin', 'p.part("bushing-',
    ))]
    y = 160
    for line in selected[:11]:
        value = line if len(line) <= 80 else line[:77] + "..."
        d.text((58, y), value, fill=TEXT if "p.part" in value else BLUE, font=font(13, MONO))
        y += 31
    d.rounded_rectangle((888, 154, 1218, 567), radius=16, fill=PANEL, outline="#344651", width=2)
    paste_fit(im, PREVIEWS / "substation-main-power-transformer.png", (890, 164, 326, 328))
    d.text((908, 506), "enamel · stainless · porcelain · rubber", fill=GREEN, font=font(12, BOLD))
    d.text((908, 533), "weathered · maintenance", fill=TEXT, font=font(13, MONO))
    footer(d, "Default-parameter render from the indexed source; presets remain editable in Studio.")
    return im


def showcase_frame(title, ids):
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "03 / refreshed previews", title, "Default-parameter renders from promoted .kcad.ts sources.")
    card_w, card_h, gap_x, x0, y0 = 378, 232, 16, 54, 162
    for i, asset_id in enumerate(ids):
        col, row = i % 3, i // 3
        x, y = x0 + col * (card_w + gap_x), y0 + row * (card_h + 12)
        d.rounded_rectangle((x, y, x + card_w, y + card_h), radius=9, fill=PANEL, outline="#344651", width=1)
        paste_fit(im, PREVIEWS / f"{asset_id}.png", (x + 5, y + 4, card_w - 10, 174))
        label = asset_id.removeprefix("substation-").replace("-", " ").title()
        if len(label) > 42:
            label = label[:39] + "..."
        d.text((x + 10, y + 184), label, fill=TEXT, font=font(13, BOLD))
        d.text((x + 10, y + 207), "scale · material controls · presets", fill=GREEN, font=font(10, MONO))
    footer(d, "Local preview renders only · no equipment rating, electrical safety or physical acceptance implied.")
    return im


def verification_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "04 / local verification", "Promotion complete for this kit", "Source, preview, generated index, lint, integration and local page checks.")
    audit = json.loads((BUNDLE / "promotion-audit.json").read_text())
    quality = json.loads((BUNDLE / "catalog-quality-status.json").read_text())
    lint = json.loads((BUNDLE / "catalog-eslint-status.json").read_text())
    tests = json.loads((BUNDLE / "catalog-test-status.json").read_text())
    pages = json.loads((BUNDLE / "catalog-pages-check.json").read_text())
    d.rounded_rectangle((54, 155, 1226, 565), radius=18, fill=PANEL, outline="#344651", width=2)
    rows = [
        ("Existing sources", str(audit["assetsPromoted"])),
        ("Material controls / named variants", f"{audit['materialColorKnobsPerAsset']['min']}–{audit['materialColorKnobsPerAsset']['max']} / asset · {audit['presetVariants']} total"),
        ("Rendered previews / index rows", f"{audit['previewsRendered']} / {audit['indexRowsWithPreview']}"),
        ("Triangle range", f"{audit['triangleRange']['min']}–{audit['triangleRange']['max']}"),
        ("Catalog quality gate", "passed" if quality["passed"] else "failed"),
        ("Kit ESLint", "passed" if lint["passed"] else "failed"),
        ("Catalog integration / local pages", f"{'passed' if tests['passed'] else 'failed'} / {pages['pageAndPreviewPairs']} pages"),
    ]
    y = 176
    for label, value in rows:
        d.text((84, y), label, fill=GREEN, font=font(16, BOLD))
        d.text((580, y), value, fill=TEXT, font=font(16))
        y += 47
    d.text((84, 520), "Public asset page returned 404 · check again after deployment", fill=MUTED, font=font(13))
    footer(d, "Local rendering and catalog checks; electrical and field acceptance are not assessed.")
    return im


def main():
    index = json.loads((ROOT / "catalog/index.json").read_text())
    assets = [asset for asset in index["assets"] if asset["kit"] == "grid-substation"]
    required = ["promotion-audit.json", "catalog-quality-status.json", "catalog-eslint-status.json", "catalog-test-status.json", "catalog-pages-check.json"]
    if len(assets) != 80 or any(not (PREVIEWS / f"{asset['id']}.png").is_file() for asset in assets):
        raise SystemExit("expected all 80 indexed grid-substation assets and previews before capture")
    if any(not (BUNDLE / name).is_file() for name in required):
        raise SystemExit("run the quality audit, lint, integration and local-page checks before capture")
    if any(not json.loads((BUNDLE / name).read_text()).get("passed") for name in required[1:]):
        raise SystemExit("all lint, integration and local-page checks must pass before capture")

    frames = [title_frame(), compare_frame(), source_frame()]
    frames.extend(showcase_frame(title, ids) for title, ids in SHOWCASES)
    frames.append(verification_frame())
    if len(frames) != 7:
        raise SystemExit("demo must use exactly seven readable frames")
    frame_dir = BUNDLE / "frames"
    frame_dir.mkdir(parents=True, exist_ok=True)
    for i, frame in enumerate(frames, 1):
        frame.save(frame_dir / f"frame-{i:02d}.png", optimize=True)
    poster = BUNDLE / "poster.png"
    frames[0].save(poster, optimize=True)
    video = BUNDLE / "grid-substation-quality-promotion.mp4"
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "1/3",
        "-i", str(frame_dir / "frame-%02d.png"), "-c:v", "libx264", "-r", "24",
        "-pix_fmt", "yuv420p", "-crf", "25", "-movflags", "+faststart", str(video),
    ], check=True)
    print(f"wrote {video}")


if __name__ == "__main__":
    main()
