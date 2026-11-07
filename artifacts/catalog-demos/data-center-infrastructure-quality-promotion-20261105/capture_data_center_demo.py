#!/usr/bin/env python3
"""Create an 18-second local source-to-preview demo for the kit promotion."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/data-center-infrastructure"
PREVIEWS = KIT / "previews"
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, BLUE, GOLD = "#101820", "#1b2932", "#eef4f6", "#afbdc3", "#68c5d1", "#e6b53a"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
EXAMPLES = [
    ("enclosed-it-rack", "Enclosed IT rack"),
    ("air-cooled-chiller", "Air-cooled chiller"),
    ("rack-power-distribution-unit", "Rack power distribution unit"),
]


def font(size, face=FONT):
    return ImageFont.truetype(face, size)


def canvas():
    return Image.new("RGB", (WIDTH, HEIGHT), BG)


def header(draw, kicker, title, detail):
    draw.text((54, 28), kicker.upper(), fill=BLUE, font=font(16, BOLD))
    draw.text((54, 57), title, fill=TEXT, font=font(31, BOLD))
    draw.text((54, 101), detail, fill=MUTED, font=font(16))


def footer(draw, detail):
    draw.line((54, 678, WIDTH - 54, 678), fill="#354650", width=1)
    draw.text((54, 688), detail, fill=MUTED, font=font(11))


def paste_fit(image, source, bounds, crop_caption=False):
    x, y, width, height = bounds
    preview = Image.open(source).convert("RGB")
    if crop_caption:
        preview = preview.crop((0, 0, preview.width, int(preview.height * 0.9)))
    preview.thumbnail((width, height), Image.Resampling.LANCZOS)
    image.paste(preview, (x + (width - preview.width) // 2, y + (height - preview.height) // 2))


def baseline_preview(asset_id):
    settings = json.loads((BUNDLE / "settings.json").read_text())
    ref = settings["baselineCommit"]
    path = f"catalog/kits/data-center-infrastructure/previews/{asset_id}.png"
    result = subprocess.run(
        ["git", "show", f"{ref}:{path}"], cwd=ROOT, capture_output=True, check=True
    )
    output = BUNDLE / "before" / f"{asset_id}.png"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(result.stdout)
    return output


def title_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    audit = json.loads((BUNDLE / "promotion-audit.json").read_text())
    draw.text((72, 68), "kernelCAD  /  ASSET CATALOG", fill=BLUE, font=font(20, BOLD))
    draw.text((72, 145), "DATA-CENTER INFRASTRUCTURE", fill=TEXT, font=font(42, BOLD))
    draw.text((76, 230), "50 existing assets promoted in place", fill=TEXT, font=font(27))
    draw.text((78, 284), "Racks  ·  power  ·  cooling  ·  containment  ·  monitoring", fill=MUTED, font=font(18))
    draw.rounded_rectangle((72, 394, 1208, 548), radius=16, fill=PANEL, outline="#344a55", width=2)
    draw.text((100, 420), "2–4 material controls per asset  ·  100 named preset variants", fill=TEXT, font=font(22, BOLD))
    draw.text((100, 480), f"Catalog pass rate  {audit['catalogBefore']['passRatePercent']}%  →  {audit['catalogAfter']['passRatePercent']}%", fill=GOLD, font=font(22, BOLD))
    footer(draw, "Original CC0 visualization props · local source, preview and index workflow only.")
    return image


def compare_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "01 / before and after", "The same existing IDs, with visible material separation", "Default previews rendered from the original and promoted source snapshots.")
    for row, (asset_id, title) in enumerate(EXAMPLES):
        y = 150 + row * 164
        draw.rounded_rectangle((54, y, 1226, y + 148), radius=11, fill=PANEL, outline="#344a55", width=1)
        draw.text((76, y + 6), title, fill=TEXT, font=font(15, BOLD))
        paste_fit(image, baseline_preview(asset_id), (140, y + 24, 360, 93), crop_caption=True)
        paste_fit(image, PREVIEWS / f"{asset_id}.png", (732, y + 24, 360, 93), crop_caption=True)
        draw.text((279, y + 122), "BEFORE", fill=MUTED, font=font(10, BOLD))
        draw.text((869, y + 122), "AFTER", fill=GOLD, font=font(10, BOLD))
        draw.line((640, y + 32, 640, y + 123), fill="#40515c", width=1)
    footer(draw, "All three examples retain their catalog IDs; no assets were added or renamed.")
    return image


def source_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "02 / editable source", "Material knobs map to components", "Scale remains editable; the color controls name the materials in the rack.")
    lines = (KIT / "enclosed-it-rack.kcad.ts").read_text().splitlines()
    wanted = ("const scale", "const steel", "const rubber", "const polymer", "facilityStandard", "highVisibility", "base-plinth", "left-side-panel", "front-door", "door-handle")
    chosen = [line.strip() for line in lines if any(token in line for token in wanted)]
    y = 164
    for line in chosen[:15]:
        value = line if len(line) <= 90 else line[:87] + "..."
        draw.text((58, y), value, fill=GOLD if "color(" in value or "const " in value else TEXT, font=font(13, MONO))
        y += 28
    draw.rounded_rectangle((930, 170, 1218, 558), radius=14, fill=PANEL, outline="#344a55", width=1)
    paste_fit(image, PREVIEWS / "enclosed-it-rack.png", (940, 182, 268, 278))
    draw.text((953, 474), "painted steel · rubber · polymer", fill=BLUE, font=font(11, BOLD))
    draw.text((953, 507), "facilityStandard · highVisibility", fill=TEXT, font=font(11, MONO))
    footer(draw, "Source comments name the object and describe its distinguishing component cues.")
    return image


def preset_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "03 / named preset", "A preset changes the authored material palette", "The highVisibility variant is evaluated, exported as GLB and software-rendered.")
    draw.rounded_rectangle((54, 158, 1226, 586), radius=15, fill=PANEL, outline="#344a55", width=1)
    paste_fit(image, PREVIEWS / "enclosed-it-rack.png", (110, 182, 430, 330))
    paste_fit(image, BUNDLE / "variants/enclosed-it-rack-highVisibility.png", (740, 182, 430, 330))
    draw.text((260, 529), "facilityStandard", fill=MUTED, font=font(17, BOLD))
    draw.text((866, 529), "highVisibility", fill=GOLD, font=font(17, BOLD))
    footer(draw, "This is a color-preset render; it does not change fit, electrical behavior, cooling performance or safety.")
    return image


def silhouettes_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "04 / recognizable models", "Industrial forms keep object-specific parts", "Racks, switchgear, cooling machinery and generator equipment read at catalog scale.")
    examples = [
        ("enclosed-it-rack", "Rack enclosure"),
        ("switchgear-lineup", "Switchgear bays"),
        ("perimeter-precision-cooler", "Room cooler"),
        ("air-cooled-chiller", "Chiller and fan deck"),
        ("cooling-tower-cell", "Cooling tower"),
        ("rack-power-distribution-unit", "Rack PDU and outlets"),
    ]
    card_w, card_h, gap_x, gap_y, x0, y0 = 374, 222, 15, 10, 54, 151
    for i, (asset_id, label) in enumerate(examples):
        col, row = i % 3, i // 3
        x, y = x0 + col * (card_w + gap_x), y0 + row * (card_h + gap_y)
        draw.rounded_rectangle((x, y, x + card_w, y + card_h), radius=9, fill=PANEL, outline="#344a55", width=1)
        paste_fit(image, PREVIEWS / f"{asset_id}.png", (x + 5, y + 3, card_w - 10, 174))
        draw.text((x + 12, y + 187), label, fill=TEXT, font=font(14, BOLD))
    footer(draw, "Images are software renders of committed .kcad.ts geometry; no vendor model or operational claim.")
    return image


def verification_frame():
    image = canvas()
    draw = ImageDraw.Draw(image)
    header(draw, "05 / local verification", "All 50 assets pass the promotion checks", "The bundle records source hashes, rendered preview paths, lint, integration and local page checks.")
    audit = json.loads((BUNDLE / "promotion-audit.json").read_text())
    eslint = json.loads((BUNDLE / "catalog-eslint-status.json").read_text())
    tests = json.loads((BUNDLE / "catalog-test-status.json").read_text())
    pages = json.loads((BUNDLE / "catalog-pages-check.json").read_text())
    rows = [
        ("Existing assets promoted", str(audit["assetsPromoted"])),
        ("New IDs added", str(audit["assetsAdded"])),
        ("Material controls per asset", f"{audit['materialControls']['minPerAsset']}–{audit['materialControls']['maxPerAsset']} · {audit['materialControls']['totalAfter']} total"),
        ("Named preset variants", str(audit["presetVariantsAdded"])),
        ("Previews rendered / indexed", str(audit["previewsRenderedAndIndexed"])),
        ("Mesh triangle range", f"{audit['triangleRange'][0]}–{audit['triangleRange'][1]} / 2,200 budget"),
        ("Catalog quality gate", f"{audit['catalogAfter']['passing']}/{audit['catalogAfter']['total']} · {audit['catalogAfter']['passRatePercent']}% pass"),
        ("ESLint / integration", f"{eslint['status']} / {tests['status']}"),
        ("Local pages", f"{pages['pageAndPreviewPairs']} generated asset pages"),
    ]
    draw.rounded_rectangle((54, 151, 1226, 563), radius=16, fill=PANEL, outline="#344a55", width=1)
    y = 166
    for label, value in rows:
        draw.text((82, y), label, fill=BLUE, font=font(14, BOLD))
        draw.text((524, y), value, fill=TEXT, font=font(14))
        y += 39
    draw.text((82, 530), "Feature branch is not deployed; deployed behavior remains unverified.", fill=MUTED, font=font(12))
    footer(draw, "Local source/render/index/test evidence only · no facility design, safety or physical acceptance claimed.")
    return image


def main():
    required = [
        "promotion-audit.json", "catalog-eslint-status.json", "catalog-test-status.json",
        "catalog-pages-check.json", "variant-verification.json",
    ]
    if not all((BUNDLE / name).is_file() for name in required):
        raise SystemExit("finish the quality, lint, integration, local-page and preset checks first")
    if not all((PREVIEWS / f"{asset_id}.png").is_file() for asset_id, _label in EXAMPLES):
        raise SystemExit("render the selected kit previews first")
    frames = [title_frame(), compare_frame(), source_frame(), preset_frame(), silhouettes_frame(), verification_frame()]
    frame_dir = BUNDLE / "frames"
    frame_dir.mkdir(parents=True, exist_ok=True)
    for i, frame in enumerate(frames, start=1):
        frame.save(frame_dir / f"frame-{i:02d}.png", optimize=True)
    frames[1].save(BUNDLE / "poster.png", optimize=True)
    output = BUNDLE / "data-center-infrastructure-quality-promotion.mp4"
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-framerate", "1/3", "-start_number", "1", "-i", str(frame_dir / "frame-%02d.png"),
        "-vf", "fps=30", "-frames:v", str(len(frames) * 90), "-c:v", "libx264", "-crf", "20",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(output),
    ], check=True)
    probe = subprocess.run([
        "ffprobe", "-v", "error", "-show_entries", "format=duration,size:stream=width,height,codec_name,nb_frames",
        "-of", "json", str(output),
    ], check=True, capture_output=True, text=True)
    metadata = json.loads(probe.stdout)
    metadata.update({"frames": len(frames), "secondsPerFrame": 3, "audio": False})
    (BUNDLE / "video-metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    main()
