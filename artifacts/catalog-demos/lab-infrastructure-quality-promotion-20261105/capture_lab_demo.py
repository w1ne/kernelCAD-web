#!/usr/bin/env python3
"""Capture the source-to-preview promotion workflow as a compact MP4."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/lab-infrastructure"
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


def paste_fit(im, source, box):
    x, y, width, height = box
    preview = Image.open(source).convert("RGB")
    preview.thumbnail((width, height), Image.Resampling.LANCZOS)
    im.paste(preview, (x + (width - preview.width) // 2, y + (height - preview.height) // 2))


def title_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    d.text((72, 68), "kernelCAD  /  ASSET CATALOG", fill=GREEN, font=font(20, BOLD))
    d.text((76, 151), "LAB INFRASTRUCTURE", fill=TEXT, font=font(46, BOLD))
    d.text((78, 238), "60 existing models, upgraded in place", fill=TEXT, font=font(27))
    d.text((78, 295), "material controls  ·  appearance presets  ·  clearer silhouettes", fill=MUTED, font=font(19))
    d.rounded_rectangle((72, 407, 1208, 557), radius=16, fill=PANEL, outline="#344651", width=2)
    d.text((104, 438), "No new IDs or duplicate catalog rows", fill=TEXT, font=font(24, BOLD))
    d.text((104, 487), "CC0 1.0   /   kernelCAD source   /   millimetres   /   Z up", fill=GREEN, font=font(18))
    footer(d, "Local source authoring and software-rendered catalog previews · not safety or equipment acceptance evidence.")
    return im


def compare_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "01 / color and structure", "The same source now separates real materials", "Original and refreshed software previews from three existing laboratory assets.")
    examples = [
        ("Laboratory fume hood", "laboratory-fume-hood"),
        ("Laboratory faucet set", "laboratory-faucet-set"),
        ("Ultra-low freezer", "ultra-low-temperature-freezer"),
    ]
    for row, (label, asset_id) in enumerate(examples):
        y = 150 + row * 166
        d.rounded_rectangle((54, y, 1226, y + 150), radius=12, fill=PANEL, outline="#344651", width=1)
        d.text((76, y + 8), label, fill=TEXT, font=font(16, BOLD))
        paste_fit(im, BUNDLE / "before" / f"{asset_id}.png", (135, y + 32, 390, 108))
        paste_fit(im, PREVIEWS / f"{asset_id}.png", (735, y + 32, 390, 108))
        d.text((190, y + 132), "BEFORE", fill=MUTED, font=font(11, BOLD))
        d.text((790, y + 132), "AFTER", fill=GREEN, font=font(11, BOLD))
        d.line((640, y + 40, 640, y + 130), fill="#40515c", width=1)
    footer(d, "The fume hood gains a tinted sash; freezer gaskets become narrow perimeter seals; the faucet uses round pipe geometry.")
    return im


def geometry_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "02 / recognisable details", "Shape cues stay visible in the preview", "Lofted hood, tubular extraction arm, isolation feet, and access glazing.")
    examples = [
        ("Tapered capture canopy", "canopy-extraction-hood"),
        ("Tube-arm snorkel", "articulated-extraction-snorkel"),
        ("Pass-through chamber", "cleanroom-pass-through-chamber"),
    ]
    for col, (label, asset_id) in enumerate(examples):
        x = 54 + col * 392
        d.rounded_rectangle((x, 165, x + 372, 591), radius=12, fill=PANEL, outline="#344651", width=1)
        paste_fit(im, PREVIEWS / f"{asset_id}.png", (x + 16, 195, 340, 330))
        d.text((x + 18, 548), label, fill=TEXT, font=font(15, BOLD))
    footer(d, "Geometry comes from the .kcad.ts sources; previews are local software renders.")
    return im


def preset_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "03 / named appearance", "A preset changes the rendered palette", "The highVisibility preset is evaluated from the authored fume-hood source.")
    d.rounded_rectangle((54, 160, 1226, 594), radius=14, fill=PANEL, outline="#344651", width=1)
    paste_fit(im, PREVIEWS / "laboratory-fume-hood.png", (105, 190, 450, 330))
    paste_fit(im, BUNDLE / "variants/laboratory-fume-hood-highVisibility.png", (726, 190, 450, 330))
    d.text((244, 544), "DEFAULT", fill=MUTED, font=font(17, BOLD))
    d.text((827, 544), "highVisibility", fill=GREEN, font=font(17, BOLD))
    footer(d, "Preset overrides: enamel, tinted-glass color, polymer controls and stainless steel. No optical transparency claim.")
    return im


def gallery_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "04 / catalog coverage", "One kit, 60 promoted assets", "A sample of work surfaces, fixtures, cleanroom modules and storage.")
    ids = [
        "wall-lab-bench", "laboratory-washup-station", "laboratory-safety-shower", "laboratory-wall-eyewash-station",
        "reagent-wall-shelf", "cryogenic-dewar-storage-rack", "cleanroom-single-door-module", "mobile-underbench-cabinet",
    ]
    card_w, card_h, gap_x, x0, y0 = 278, 225, 12, 54, 165
    for i, asset_id in enumerate(ids):
        col, row = i % 4, i // 4
        x, y = x0 + col * (card_w + gap_x), y0 + row * (card_h + 12)
        d.rounded_rectangle((x, y, x + card_w, y + card_h), radius=9, fill=PANEL, outline="#344651", width=1)
        paste_fit(im, PREVIEWS / f"{asset_id}.png", (x + 4, y + 3, card_w - 8, 174))
        label = asset_id.replace("-", " ").title()
        if len(label) > 31:
            label = label[:28] + "..."
        d.text((x + 8, y + 187), label, fill=TEXT, font=font(12, BOLD))
        d.text((x + 8, y + 205), "materials · presets", fill=GREEN, font=font(10, MONO))
    footer(d, "All 60 original IDs retained; all 60 previews regenerated and indexed.")
    return im


def source_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "05 / editable source", "Materials and geometry are in the model", "Names correspond to enamel, glass tint, polymer controls, steel and stainless steel.")
    source = (KIT / "laboratory-fume-hood.kcad.ts").read_text().splitlines()
    selected = [line.strip() for line in source if any(token in line for token in (
        "const enamel =", "const glass =", "const polymer =", "const stainless =",
        "cleanroom:", "highVisibility:", "sash-glazing", "work-surface", "control-button",
    ))]
    y = 171
    for line in selected[:11]:
        value = line if len(line) <= 100 else line[:97] + "..."
        d.text((58, y), value, fill=BLUE if "color(" in value else TEXT, font=font(13, MONO))
        y += 34
    d.rounded_rectangle((927, 162, 1220, 537), radius=16, fill=PANEL, outline="#344651", width=2)
    paste_fit(im, PREVIEWS / "laboratory-fume-hood.png", (930, 170, 286, 286))
    d.text((952, 474), "4 material controls", fill=GREEN, font=font(13, BOLD))
    d.text((952, 503), "cleanroom · highVisibility", fill=TEXT, font=font(12, MONO))
    footer(d, "Each asset exposes two to four material controls and named appearance presets.")
    return im


def verification_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "06 / local verification", "Promotion complete for this kit", "Index hashes, previews, quality gate, lint and integration results are bundled.")
    audit = json.loads((BUNDLE / "promotion-audit.json").read_text())
    eslint = json.loads((BUNDLE / "catalog-eslint-status.json").read_text())
    tests = json.loads((BUNDLE / "catalog-test-status.json").read_text())
    pages = json.loads((BUNDLE / "catalog-pages-check.json").read_text())
    d.rounded_rectangle((54, 155, 1226, 565), radius=18, fill=PANEL, outline="#344651", width=2)
    rows = [
        ("Existing sources promoted", str(audit["assetsPromoted"])),
        ("New catalog IDs", str(audit["newAssetsAdded"])),
        ("Material controls / asset", f"{audit['materialKnobsMin']}–{audit['materialKnobsMax']} · {audit['materialKnobsTotal']} total"),
        ("Named preset entries", str(audit["presetEntriesTotal"])),
        ("Previews rendered / indexed", f"{audit['previewsRendered']} / {audit['indexedRowsWithPreview']}"),
        ("Kit quality gate", audit["qualityGate"]),
        ("ESLint / integration", f"{eslint['status']} / {tests['status']}"),
        ("Local catalog pages", f"{pages['pageAndPreviewPairs']} / {pages['kitPages']}"),
    ]
    y = 171
    for label, value in rows:
        d.text((84, y), label, fill=GREEN, font=font(14, BOLD))
        d.text((530, y), value, fill=TEXT, font=font(14))
        y += 46
    d.text((84, 540), "Feature branch is not deployed · preview renders do not assess lab safety", fill=MUTED, font=font(13))
    footer(d, "Local source, render, index and test evidence; deployed behavior is not claimed.")
    return im


def main():
    frames = [title_frame(), compare_frame(), geometry_frame(), preset_frame(), gallery_frame(), source_frame(), verification_frame()]
    frame_dir = BUNDLE / "frames"
    frame_dir.mkdir(parents=True, exist_ok=True)
    for i, frame in enumerate(frames, start=1):
        frame.save(frame_dir / f"frame-{i:02d}.png")
    frames[1].save(BUNDLE / "poster.png")
    output = BUNDLE / "lab-infrastructure-quality-promotion.mp4"
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
