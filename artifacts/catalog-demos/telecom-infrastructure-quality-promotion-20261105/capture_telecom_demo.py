#!/usr/bin/env python3
"""Assemble the local telecom source-to-preview promotion into an MP4."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/telecom-infrastructure"
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
    d.text((76, 151), "TELECOM INFRASTRUCTURE", fill=TEXT, font=font(42, BOLD))
    d.text((78, 238), "56 existing models, upgraded in place", fill=TEXT, font=font(27))
    d.text((78, 295), "material controls  ·  site palettes  ·  clearer silhouettes", fill=MUTED, font=font(19))
    d.rounded_rectangle((72, 407, 1208, 557), radius=16, fill=PANEL, outline="#344651", width=2)
    d.text((104, 438), "Original IDs retained; no duplicate catalog rows", fill=TEXT, font=font(24, BOLD))
    d.text((104, 487), "CC0 1.0   /   kernelCAD source   /   millimetres   /   Z up", fill=GREEN, font=font(18))
    footer(d, "Local source authoring and software-rendered catalog previews · not RF, installation, or hardware acceptance evidence.")
    return im


def compare_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "01 / materials and shape", "The same assets now separate their real parts", "Original and refreshed default previews from three existing telecom models.")
    examples = [
        ("Microwave dish antenna", "microwave-dish-antenna"),
        ("Fiber distribution cabinet", "fiber-distribution-cabinet"),
        ("Fiber slack storage reel", "fiber-coil-reel"),
    ]
    for row, (label, asset_id) in enumerate(examples):
        y = 146 + row * 168
        d.rounded_rectangle((54, y, 1226, y + 152), radius=12, fill=PANEL, outline="#344651", width=1)
        d.text((76, y + 7), label, fill=TEXT, font=font(16, BOLD))
        paste_fit(im, BUNDLE / "before" / f"{asset_id}.png", (130, y + 27, 370, 118))
        paste_fit(im, PREVIEWS / f"{asset_id}.png", (730, y + 27, 370, 118))
        d.text((257, y + 132), "BEFORE", fill=MUTED, font=font(11, BOLD))
        d.text((857, y + 132), "AFTER", fill=GREEN, font=font(11, BOLD))
        d.line((640, y + 36, 640, y + 130), fill="#40515c", width=1)
    footer(d, "Round dish reflector, tinted powder coat, stainless hub and jacketed spool geometry come from the authored sources.")
    return im


def silhouettes_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "02 / preview readability", "Equipment cues are visible at catalog scale", "Lofted reflector, tapered mast, splayed tripod, reel and cable hoops.")
    ids = [
        "microwave-dish-antenna", "monopole-mast", "rooftop-tripod-mast",
        "fiber-coil-reel", "fiber-service-loop-rack", "microwave-backhaul-shelter",
    ]
    labels = ["Parabolic reflector", "Tapered monopole", "Splayed tripod", "Cable storage reel", "Open service hoops", "Equipment shelter"]
    card_w, card_h, gap_x, x0, y0 = 374, 227, 15, 54, 157
    for i, (asset_id, label) in enumerate(zip(ids, labels)):
        col, row = i % 3, i // 3
        x, y = x0 + col * (card_w + gap_x), y0 + row * (card_h + 13)
        d.rounded_rectangle((x, y, x + card_w, y + card_h), radius=9, fill=PANEL, outline="#344651", width=1)
        paste_fit(im, PREVIEWS / f"{asset_id}.png", (x + 5, y + 4, card_w - 10, 177))
        d.text((x + 12, y + 190), label, fill=TEXT, font=font(14, BOLD))
    footer(d, "These images are locally generated software renders of the committed .kcad.ts sources.")
    return im


def preset_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "03 / named appearance", "A preset changes material color values", "highVisibility is evaluated from the authored cabinet preset and software-rendered.")
    d.rounded_rectangle((54, 160, 1226, 594), radius=14, fill=PANEL, outline="#344651", width=1)
    paste_fit(im, PREVIEWS / "fiber-distribution-cabinet.png", (104, 190, 450, 330))
    paste_fit(im, BUNDLE / "variants/fiber-distribution-cabinet-highVisibility.png", (726, 190, 450, 330))
    d.text((252, 544), "DEFAULT", fill=MUTED, font=font(17, BOLD))
    d.text((814, 544), "highVisibility", fill=GREEN, font=font(17, BOLD))
    footer(d, "The preset changes powder coat and stainless steel colors; it does not change fit, RF behavior, or installation ratings.")
    return im


def source_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "04 / editable source", "Controls map to named material groups", "Each color parameter is assigned to matching structural, enclosure, polymer or cable parts.")
    source = (KIT / "fiber-distribution-cabinet.kcad.ts").read_text().splitlines()
    wanted = ("const powderCoat", "const stainlessSteel", "fieldSite:", "highVisibility:", "p.part(\"body\"", "p.part(\"hood\"", "p.part(\"door\"", "p.part(\"lock\"")
    selected = [line.strip() for line in source if any(token in line for token in wanted)]
    y = 178
    for line in selected[:10]:
        value = line if len(line) <= 100 else line[:97] + "..."
        d.text((58, y), value, fill=BLUE if "color(" in value or "param(" in value else TEXT, font=font(14, MONO))
        y += 34
    d.rounded_rectangle((907, 164, 1220, 548), radius=16, fill=PANEL, outline="#344651", width=2)
    paste_fit(im, PREVIEWS / "fiber-distribution-cabinet.png", (916, 172, 296, 296))
    d.text((945, 490), "scale + 2 materials", fill=GREEN, font=font(14, BOLD))
    d.text((945, 518), "fieldSite · highVisibility", fill=TEXT, font=font(12, MONO))
    footer(d, "Source comments describe each object and the component cues that define it.")
    return im


def verification_frame():
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "05 / local verification", "The full telecom kit is promoted", "Index freshness, preview coverage, catalog gate, lint, integration and local pages are recorded.")
    audit = json.loads((BUNDLE / "promotion-audit.json").read_text())
    eslint = json.loads((BUNDLE / "catalog-eslint-status.json").read_text())
    tests = json.loads((BUNDLE / "catalog-test-status.json").read_text())
    pages = json.loads((BUNDLE / "catalog-pages-check.json").read_text())
    d.rounded_rectangle((54, 155, 1226, 565), radius=18, fill=PANEL, outline="#344651", width=2)
    rows = [
        ("Existing assets promoted", str(audit["assetsPromoted"])),
        ("New catalog IDs", str(audit["newAssetsAdded"])),
        ("Material controls / asset", f"{audit['materialKnobsMin']}–{audit['materialKnobsMax']} · {audit['materialKnobsTotal']} total"),
        ("Named preset entries", str(audit["presetEntriesTotal"])),
        ("Previews rendered / indexed", f"{audit['previewsRendered']} / {audit['indexedRowsWithPreview']}"),
        ("Kit quality gate", audit["qualityGate"]),
        ("Catalog score", f"{audit['catalogAfter']['passing']}/{audit['catalogAfter']['total']} · {audit['catalogAfter']['passRatePercent']}% pass"),
        ("ESLint / integration", f"{eslint['status']} / {tests['status']}"),
        ("Local pages", f"{pages['pageAndPreviewPairs']} / {pages['generatedAssetPages']}"),
    ]
    y = 166
    for label, value in rows:
        d.text((84, y), label, fill=GREEN, font=font(13, BOLD))
        d.text((530, y), value, fill=TEXT, font=font(13))
        y += 40
    d.text((84, 540), "Feature branch is not deployed · no RF, installation, or hardware acceptance claimed", fill=MUTED, font=font(12))
    footer(d, "Local source, render, index and test evidence; deployed behavior remains unverified.")
    return im


def main():
    frames = [title_frame(), compare_frame(), silhouettes_frame(), preset_frame(), source_frame(), verification_frame()]
    frame_dir = BUNDLE / "frames"
    frame_dir.mkdir(parents=True, exist_ok=True)
    for i, frame in enumerate(frames, start=1):
        frame.save(frame_dir / f"frame-{i:02d}.png")
    frames[1].save(BUNDLE / "poster.png")
    output = BUNDLE / "telecom-infrastructure-quality-promotion.mp4"
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
