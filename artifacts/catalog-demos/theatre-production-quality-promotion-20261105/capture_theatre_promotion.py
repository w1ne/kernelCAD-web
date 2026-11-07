#!/usr/bin/env python3
"""Build a short MP4 from the real source, previews, preset render, and local checks."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/theatre-production"
PREVIEWS = KIT / "previews"
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, GREEN, BLUE = "#111923", "#1d2935", "#eef3f5", "#a6b6c0", "#86c89a", "#68b9c5"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"


def font(size, face=FONT):
    return ImageFont.truetype(face, size)


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
    d.text((76, 151), "THEATRE PRODUCTION", fill=TEXT, font=font(50, BOLD))
    d.text((78, 238), "52 existing assets promoted in place", fill=TEXT, font=font(28))
    d.text((78, 296), "material colors  ·  houseShow / touring presets  ·  refreshed previews", fill=MUTED, font=font(18))
    d.rounded_rectangle((72, 405, 1208, 558), radius=16, fill=PANEL, outline="#344651", width=2)
    d.text((104, 438), "Theatre cues stay separate: timber decks, steel frames, fabric, glass and hardware", fill=TEXT, font=font(21, BOLD))
    d.text((104, 493), "CC0 1.0   /   kernelCAD source   /   millimetres   /   Z up", fill=GREEN, font=font(18))
    footer(d, "Local authoring and software-rendered previews · no deployed or physical acceptance claim.")
    return im


def compare_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "01 / before and after", "The same catalog objects carry material contrast", "Existing IDs and silhouettes, now colored by their named components.")
    examples = [
        ("Modular stage deck", "modular-stage-deck"),
        ("Profile spotlight", "ellipsoidal-reflector-spotlight"),
        ("Touring road case", "touring-road-case"),
    ]
    for row, (label, asset_id) in enumerate(examples):
        y = 145 + row * 166
        d.rounded_rectangle((54, y, 1226, y + 151), radius=12, fill=PANEL, outline="#344651", width=1)
        d.text((76, y + 6), label, fill=TEXT, font=font(16, BOLD))
        paste_fit(im, BUNDLE / "before" / f"{asset_id}.png", (130, y + 26, 370, 116))
        paste_fit(im, PREVIEWS / f"{asset_id}.png", (730, y + 26, 370, 116))
        d.text((257, y + 130), "BEFORE", fill=MUTED, font=font(11, BOLD))
        d.text((857, y + 130), "AFTER", fill=GREEN, font=font(11, BOLD))
        d.line((640, y + 32, 640, y + 128), fill="#40515c", width=1)
    footer(d, "Before and after images are local software renders from the original and promoted .kcad.ts sources.")
    return im


def materials_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "02 / independent material controls", "A spotlight keeps its equipment parts distinct", "Powder-coated housing, aluminum barrel, pale lens and steel fittings.")
    d.rounded_rectangle((54, 150, 1226, 590), radius=14, fill=PANEL, outline="#344651", width=1)
    paste_fit(im, PREVIEWS / "ellipsoidal-reflector-spotlight.png", (90, 177, 470, 355))
    source = (KIT / "ellipsoidal-reflector-spotlight.kcad.ts").read_text().splitlines()
    wanted = ("const scale =", "const powderCoat", "const aluminum", "const glass", "const hardware", "houseShow:", "touring:", 'p.part("rear-housing"', 'p.part("lens"')
    selected = [line.strip() for line in source if any(token in line for token in wanted)]
    y = 183
    for line in selected[:12]:
        text = line if len(line) <= 78 else line[:75] + "..."
        d.text((596, y), text, fill=BLUE if "color(" in text or "param(" in text else TEXT, font=font(14, MONO))
        y += 31
    footer(d, "Controls address material groups in the model source; each preset supplies named color overrides.")
    return im


def preset_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "03 / resolved preset", "The authored touring palette changes the same fixture", "Rendered from the `touring` preset, exported as low-poly GLB and software-rendered.")
    d.rounded_rectangle((54, 155, 1226, 594), radius=14, fill=PANEL, outline="#344651", width=1)
    paste_fit(im, PREVIEWS / "ellipsoidal-reflector-spotlight.png", (96, 184, 460, 330))
    paste_fit(im, BUNDLE / "variants/ellipsoidal-reflector-spotlight-touring.png", (725, 184, 460, 330))
    d.text((245, 535), "DEFAULT", fill=MUTED, font=font(18, BOLD))
    d.text((850, 535), "TOURING", fill=GREEN, font=font(18, BOLD))
    footer(d, "This is a material appearance change; it does not change lighting output, rigging ratings or electrical behavior.")
    return im


def silhouette_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "04 / object readability", "Fixtures, carts and rigging retain their shape cues", "The refreshed preview set includes distinct enclosures, rollers, wheels, fabric and stage structure.")
    ids = ["motorized-chain-hoist", "riser-cart", "scenic-wagon", "cyclorama-drop", "lighting-control-console", "stage-power-distro"]
    labels = ["Chain hoist", "Riser cart", "Scenic wagon", "Cyclorama drop", "Lighting console", "Power distro"]
    card_w, card_h, gap_x, x0, y0 = 374, 222, 15, 54, 158
    for i, (asset_id, label) in enumerate(zip(ids, labels, strict=True)):
        col, row = i % 3, i // 3
        x, y = x0 + col * (card_w + gap_x), y0 + row * (card_h + 12)
        d.rounded_rectangle((x, y, x + card_w, y + card_h), radius=9, fill=PANEL, outline="#344651", width=1)
        paste_fit(im, PREVIEWS / f"{asset_id}.png", (x + 5, y + 4, card_w - 10, 169))
        d.text((x + 12, y + 185), label, fill=TEXT, font=font(14, BOLD))
    footer(d, "Existing geometry remains in place; material separation clarifies its parts in the catalog preview.")
    return im


def verification_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "05 / local verification", "Source, preview and catalog checks", "The handoff retains command output and status for every local check.")
    kit_quality = json.loads((BUNDLE / "kit-quality-status.json").read_text())
    lint = json.loads((BUNDLE / "catalog-eslint-status.json").read_text())
    tests = json.loads((BUNDLE / "catalog-test-status.json").read_text())
    index = json.loads((BUNDLE / "catalog-index-build-status.json").read_text())
    pages = json.loads((BUNDLE / "catalog-pages-check.json").read_text())
    audit = json.loads((BUNDLE / "promotion-audit.json").read_text())
    rows = [
        ("Existing assets promoted", str(audit["assetsPromoted"])),
        ("New catalog IDs", "0"),
        ("Material controls", "2–4 per asset · assigned by named part"),
        ("Named appearance presets", "houseShow and touring"),
        ("Kit quality gate", kit_quality["status"]),
        ("Preview and index", f"52 refreshed · index build {index['status']}"),
        ("ESLint / integration", f"{lint['status']} / {tests['status']}"),
        ("Local catalog pages", f"{pages['pageAndPreviewPairs']} / 52 pages and previews"),
    ]
    d.rounded_rectangle((54, 154, 1226, 565), radius=18, fill=PANEL, outline="#344651", width=2)
    y = 173
    for label, value in rows:
        d.text((84, y), label, fill=GREEN, font=font(14, BOLD))
        d.text((532, y), value, fill=TEXT, font=font(14))
        y += 43
    d.text((84, 535), "Feature branch is not deployed · no rigging, electrical or venue acceptance claimed", fill=MUTED, font=font(12))
    footer(d, "Local replay and validation only · deployed behavior and physical acceptance remain unverified.")
    return im


def main():
    frames = [title_frame(), compare_frame(), materials_frame(), preset_frame(), silhouette_frame(), verification_frame()]
    frame_dir = BUNDLE / "frames"
    frame_dir.mkdir(parents=True, exist_ok=True)
    for i, frame in enumerate(frames, start=1):
        frame.save(frame_dir / f"frame-{i:02d}.png")
    frames[1].save(BUNDLE / "poster.png")
    output = BUNDLE / "theatre-production-quality-promotion.mp4"
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
