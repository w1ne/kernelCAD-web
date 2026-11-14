#!/usr/bin/env python3
"""Build a readable source-to-preview demo from this local catalog round."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/space-exploration"
PREVIEWS = KIT / "previews"
WIDTH, HEIGHT = 1280, 720
BG, PANEL = "#111923", "#1d2935"
TEXT, MUTED, GREEN, BLUE, AMBER = "#eef3f5", "#a6b6c0", "#86c89a", "#75bfd1", "#e4b966"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"


def font(size, path=FONT):
    return ImageFont.truetype(path, size)


def canvas():
    return Image.new("RGB", (WIDTH, HEIGHT), BG)


def header(draw, kicker, title, detail):
    draw.text((54, 28), kicker.upper(), fill=GREEN, font=font(16, BOLD))
    draw.text((54, 57), title, fill=TEXT, font=font(31, BOLD))
    draw.text((54, 102), detail, fill=MUTED, font=font(16))


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
    d.text((78, 238), "36 existing assets gain a useful third material", fill=TEXT, font=font(25))
    d.text((78, 294), "Part-specific controls · two named palettes · no new IDs", fill=MUTED, font=font(18))
    d.rounded_rectangle((72, 407, 1208, 557), radius=16, fill=PANEL, outline="#344651", width=2)
    d.text((104, 438), "Source → rendered preview → generated index", fill=TEXT, font=font(24, BOLD))
    d.text((104, 487), "CC0 1.0   /   millimetres   /   Z up   /   editable scale and materials", fill=GREEN, font=font(17))
    footer(d, "Local source-to-preview workflow · stylized scene props · no flight or hardware acceptance claim.")
    return im


def compare_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "01 / material assignments", "Give each visible surface its own control", "The same asset IDs now expose material roles that map to actual components.")
    examples = [
        ("Field tool chest", "field-tool-chest", "paint · aluminum · polymer latch"),
        ("Oxygen cylinder rack", "oxygen-cylinder-rack", "paint · aluminum · brass valves"),
        ("Surface sensor post", "surface-sensor-post", "aluminum · glass · polymer insulators"),
    ]
    for row, (label, asset_id, controls) in enumerate(examples):
        y = 151 + row * 170
        d.rounded_rectangle((54, y, 1226, y + 150), radius=12, fill=PANEL, outline="#344651", width=1)
        d.text((76, y + 12), label, fill=TEXT, font=font(17, BOLD))
        d.text((760, y + 20), controls, fill=GREEN, font=font(13, MONO))
        d.text((115, y + 50), "BEFORE", fill=MUTED, font=font(12, BOLD))
        d.text((426, y + 50), "AFTER", fill=AMBER, font=font(12, BOLD))
        paste_fit(im, BUNDLE / "before" / f"{asset_id}.png", (95, y + 60, 300, 82))
        paste_fit(im, PREVIEWS / f"{asset_id}.png", (405, y + 60, 300, 82))
    footer(d, "Before images are the previous indexed previews; after images are generated from the updated source.")
    return im


def arm_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "02 / silhouette repair", "A supported arm with real joints", "The base, shoulder, forearm, wrist and paired gripper now form one readable outline.")
    d.rounded_rectangle((54, 154, 1226, 614), radius=14, fill=PANEL, outline="#344651", width=1)
    d.text((110, 171), "BEFORE · floating links", fill=MUTED, font=font(15, BOLD))
    d.text((688, 171), "AFTER · supported two-link arm", fill=GREEN, font=font(15, BOLD))
    paste_fit(im, BUNDLE / "before" / "robotic-arm-pedestal.png", (72, 202, 500, 375))
    paste_fit(im, PREVIEWS / "robotic-arm-pedestal.png", (654, 202, 500, 375))
    d.text((105, 576), "360 tris before", fill=MUTED, font=font(14, MONO))
    d.text((689, 576), "676 tris / 900 budget", fill=GREEN, font=font(14, MONO))
    footer(d, "The source keeps the existing ID and scale knob; this is visualization geometry, not a robot motion model.")
    return im


def source_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "03 / source controls", "Parameters change the parts they name", "Material controls remain in each asset source beside named variants and component assignments.")
    source = (KIT / "robotic-arm-pedestal.kcad.ts").read_text().splitlines()
    wanted = [line.strip() for line in source if any(token in line for token in (
        "const paint =", "const aluminum =", "const polymer =", "lunarDust:", "highVisibility:",
        'p.part("shoulder-pivot"', 'p.part("forearm"', 'p.part("gripper-finger-left"',
        'p.part("gripper-finger-right"',
    ))]
    d.rounded_rectangle((54, 153, 805, 598), radius=14, fill=PANEL, outline="#344651", width=1)
    y = 183
    for line in wanted:
        shown = line if len(line) <= 88 else line[:85] + "..."
        is_part = "p.part" in line
        d.text((78, y), shown, fill=TEXT if is_part else BLUE, font=font(13, MONO))
        y += 43
    d.rounded_rectangle((835, 153, 1226, 598), radius=14, fill=PANEL, outline="#344651", width=1)
    paste_fit(im, PREVIEWS / "robotic-arm-pedestal.png", (855, 174, 350, 320))
    d.text((863, 510), "paint · aluminum · polymer", fill=GREEN, font=font(13, BOLD))
    d.text((865, 539), "lunarDust · highVisibility", fill=TEXT, font=font(13, MONO))
    footer(d, "Every added control is used by an assigned part and is included in both named palettes.")
    return im


def gallery_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "04 / refreshed previews", "Distinct materials across mission equipment", "Default-parameter renders from the updated .kcad.ts sources.")
    ids = [
        "drill-core-tube-rack", "dust-protection-screen", "field-lamp", "oxygen-cylinder-rack",
        "regolith-sieve", "rover-seat", "surface-antenna-mast", "robotic-arm-pedestal",
    ]
    card_w, card_h, gap_x, x0, y0 = 280, 225, 12, 54, 164
    for i, asset_id in enumerate(ids):
        col, row = i % 4, i // 4
        x, y = x0 + col * (card_w + gap_x), y0 + row * (card_h + 10)
        d.rounded_rectangle((x, y, x + card_w, y + card_h), radius=9, fill=PANEL, outline="#344651", width=1)
        paste_fit(im, PREVIEWS / f"{asset_id}.png", (x + 4, y + 4, card_w - 8, 164))
        label = asset_id.replace("-", " ").title()
        d.text((x + 8, y + 177), label[:34], fill=TEXT, font=font(12, BOLD))
        d.text((x + 8, y + 201), "scale · materials · presets", fill=GREEN, font=font(10, MONO))
    footer(d, "Local preview renders only · not a mission simulation or flight-acceptance test.")
    return im


def verification_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "05 / local checks", "All existing assets kept and indexed", "The generated index carries updated source hashes and rendered preview paths.")
    results = json.loads((BUNDLE / "verification.json").read_text())
    d.rounded_rectangle((54, 155, 1226, 565), radius=18, fill=PANEL, outline="#344651", width=2)
    rows = [
        ("Existing assets refined", str(results["assetsRefined"])),
        ("Added material controls", str(results["materialControlsAdded"])),
        ("Previews / indexed rows", f"{results['previewsRendered']} / {results['indexedRowsWithPreview']}"),
        ("Catalog quality gate", results["catalogQualityGate"]),
        ("Kit ESLint", results["eslint"]),
        ("Catalog integration", results["integration"]),
    ]
    y = 184
    for label, value in rows:
        d.text((84, y), label, fill=GREEN, font=font(16, BOLD))
        d.text((560, y), value, fill=TEXT, font=font(16))
        y += 54
    d.text((84, 520), "Local branch only · not deployed · no physical or flight acceptance claimed", fill=MUTED, font=font(13))
    footer(d, "Local lint, quality gate, preview render, index build and integration checks.")
    return im


def scope_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    d.text((70, 70), "kernelCAD  /  SPACE EXPLORATION", fill=GREEN, font=font(18, BOLD))
    d.text((72, 142), "Editable scene props", fill=TEXT, font=font(38, BOLD))
    d.text((75, 222), "36 assets gained a component-specific material control.", fill=TEXT, font=font(21))
    d.text((75, 266), "The arm now connects from its rotating base to a paired gripper.", fill=TEXT, font=font(21))
    d.text((75, 310), "No IDs or kits were added.", fill=TEXT, font=font(21))
    d.rounded_rectangle((72, 405, 1208, 564), radius=16, fill=PANEL, outline="#344651", width=2)
    d.text((105, 438), "Verified locally", fill=GREEN, font=font(22, BOLD))
    d.text((105, 484), "Source · software render · generated index · local catalog pages", fill=TEXT, font=font(18))
    d.text((105, 526), "Deployment, mission fit, simulation and hardware acceptance are separate.", fill=MUTED, font=font(14))
    footer(d, "Source-first kernelCAD workflow · no third-party model or geometry copied.")
    return im


def main():
    index = json.loads((ROOT / "catalog/index.json").read_text())
    assets = [asset for asset in index["assets"] if asset["kit"] == "space-exploration"]
    if len(assets) != 52 or not all((PREVIEWS / f"{asset['id']}.png").is_file() for asset in assets):
        raise SystemExit("expected all 52 indexed space-exploration assets and previews before capture")
    if not (BUNDLE / "verification.json").is_file():
        raise SystemExit("run quality, lint, integration and local page checks before capture")

    frames = [title_frame(), compare_frame(), arm_frame(), source_frame(), gallery_frame(), verification_frame(), scope_frame()]
    frame_dir = BUNDLE / "frames"
    frame_dir.mkdir(parents=True, exist_ok=True)
    for i, frame in enumerate(frames, 1):
        frame.save(frame_dir / f"frame-{i:02d}.png", optimize=True)
    output = BUNDLE / "space-exploration-materials-refinement.mp4"
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "1/3",
        "-i", str(frame_dir / "frame-%02d.png"), "-c:v", "libx264", "-r", "24",
        "-pix_fmt", "yuv420p", "-crf", "25", "-movflags", "+faststart", str(output),
    ], check=True)
    frames[0].save(BUNDLE / "poster.png", optimize=True)
    print(f"wrote {output}")


if __name__ == "__main__":
    main()
