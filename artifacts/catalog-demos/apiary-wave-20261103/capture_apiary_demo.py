#!/usr/bin/env python3
"""Create a short MP4 showing real apiary sources, previews and local checks."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog" / "kits" / "apiary"
PREVIEWS = KIT / "previews"
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, GOLD = "#111923", "#1d2935", "#eef3f5", "#a6b6c0", "#e5bc67"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"


def font(size, path=FONT):
    return ImageFont.truetype(path, size)


def canvas():
    return Image.new("RGB", (WIDTH, HEIGHT), BG)


def header(draw, kicker, title, detail):
    draw.text((54, 28), kicker.upper(), fill=GOLD, font=font(16, BOLD))
    draw.text((54, 57), title, fill=TEXT, font=font(31, BOLD))
    draw.text((54, 101), detail, fill=MUTED, font=font(16))


def footer(draw, detail):
    draw.line((54, 678, WIDTH - 54, 678), fill="#35434e", width=1)
    draw.text((54, 688), detail, fill=MUTED, font=font(12))


def title_frame():
    im = canvas()
    draw = ImageDraw.Draw(im)
    draw.text((72, 68), "kernelCAD  /  ASSET CATALOG", fill=GOLD, font=font(20, BOLD))
    draw.text((72, 148), "APIARY", fill=TEXT, font=font(62, BOLD))
    draw.text((76, 246), "50 editable hive-yard and honey-handling scene props", fill=TEXT, font=font(26))
    draw.text((76, 300), "Hive structures  ·  field tools  ·  feeding  ·  extraction  ·  yard fixtures", fill=MUTED, font=font(18))
    draw.rounded_rectangle((72, 410, 1208, 550), radius=16, fill=PANEL, outline="#344651", width=2)
    draw.text((100, 437), "Native .kcad.ts models with scale and color knobs", fill=TEXT, font=font(23, BOLD))
    draw.text((100, 490), "CC0 1.0   /   millimetres   /   Z up   /   base origin", fill=GOLD, font=font(19))
    footer(draw, "Original kernelCAD geometry · local catalog workflow")
    return im


def source_frame():
    im = canvas()
    draw = ImageDraw.Draw(im)
    header(draw, "01 / source", "A real parametric hive model", "Langstroth hive source plus its rendered catalog preview.")
    source = (KIT / "langstroth-hive.kcad.ts").read_text().splitlines()
    y = 144
    for line in source[:25]:
        value = line.strip()
        if len(value) > 69:
            value = value[:66] + "…"
        draw.text((56, y), value, fill=TEXT, font=font(12, MONO))
        y += 19
    draw.rounded_rectangle((790, 150, 1210, 570), radius=16, fill=PANEL, outline="#344651", width=2)
    preview = Image.open(PREVIEWS / "langstroth-hive.png").convert("RGB")
    preview.thumbnail((388, 315), Image.Resampling.LANCZOS)
    im.paste(preview, (801 + (388 - preview.width) // 2, 165 + (315 - preview.height) // 2))
    draw.text((825, 500), "scale  0.70 — 1.30", fill=GOLD, font=font(17, BOLD))
    draw.text((825, 531), "color  user-selectable", fill=TEXT, font=font(16))
    footer(draw, "Index and Studio integration checks compare declared knobs with loaded model parameters.")
    return im


def contact_frame(group_number, ids):
    im = canvas()
    draw = ImageDraw.Draw(im)
    header(draw, f"02 / generated previews · set {group_number}", "Apiary catalog preview set", "Default-parameter mesh previews rendered from the indexed .kcad.ts sources.")
    card_w, card_h, gap_x, gap_y, x0, y0 = 276, 235, 12, 8, 54, 155
    for i, asset_id in enumerate(ids):
        col, row = i % 4, i // 4
        x, y = x0 + col * (card_w + gap_x), y0 + row * (card_h + gap_y)
        draw.rounded_rectangle((x, y, x + card_w, y + card_h), radius=9, fill=PANEL, outline="#344651", width=1)
        preview = Image.open(PREVIEWS / f"{asset_id}.png").convert("RGB")
        preview.thumbnail((card_w - 16, 178), Image.Resampling.LANCZOS)
        im.paste(preview, (x + (card_w - preview.width) // 2, y + 4 + (178 - preview.height) // 2))
        label = asset_id.replace("-", " ").title()
        if len(label) > 31:
            label = label[:28] + "…"
        draw.text((x + 8, y + 190), label, fill=TEXT, font=font(12, BOLD))
        draw.text((x + 8, y + 211), "scale · color", fill=GOLD, font=font(10, MONO))
    footer(draw, "Original low-poly scene props; each preview comes from its actual indexed source.")
    return im


def verification_frame():
    im = canvas()
    draw = ImageDraw.Draw(im)
    header(draw, "03 / local verification", "Catalog audit and page generation", "Current sources, meshes, previews, index, lint, integration suite and local pages checked.")
    checks = json.loads((BUNDLE / "asset-check-results.json").read_text())
    pages = json.loads((BUNDLE / "catalog-pages-check.json").read_text())
    live = json.loads((BUNDLE / "live-website-check.json").read_text())
    package = json.loads((BUNDLE / "npm-pack-audit.json").read_text())
    rows = [
        ("Apiary sources and meshes", f"{checks['passed']} / {checks['total']} audited"),
        ("Triangles and materials", f"{checks['triangleRange'][0]}–{checks['triangleRange'][1]} triangles · one material each"),
        ("Indexed controls and previews", f"scale + color · 50 new PNGs · {checks['runningTotalPreviewFiles']} total PNGs"),
        ("Catalog integration suite", f"{checks['integration']['filesPassed']} files · {checks['integration']['testsPassed']} tests passed"),
        ("Local generated pages", f"{pages['kitPagesAndPreviews']} pages · {pages['assetsInIndex']} assets indexed"),
        ("npm package file list", f"{package['apiarySources']} sources + {package['apiaryPreviews']} previews · no product paths"),
    ]
    draw.rounded_rectangle((54, 165, 1226, 535), radius=18, fill=PANEL, outline="#344651", width=2)
    y = 185
    for label, value in rows:
        draw.text((84, y), label, fill=GOLD, font=font(15, BOLD))
        draw.text((540, y), value, fill=TEXT, font=font(14))
        y += 45
    draw.text((84, 475), f"Current production feed: {live['liveAssetCount']} assets; this branch is not deployed.", fill=MUTED, font=font(14))
    footer(draw, "Local replay and validation only · no deployed behavior, husbandry suitability or physical acceptance claim.")
    return im


def main():
    index = json.loads((ROOT / "catalog" / "index.json").read_text())
    assets = [asset for asset in index["assets"] if asset["kit"] == "apiary"]
    if len(assets) != 50 or not all((PREVIEWS / f"{asset['id']}.png").is_file() for asset in assets):
        raise SystemExit("expected all 50 apiary sources and rendered previews before capture")
    for name in ("asset-check-results.json", "catalog-pages-check.json", "catalog-test-output.txt", "live-website-check.json", "npm-pack-audit.json"):
        if not (BUNDLE / name).is_file():
            raise SystemExit(f"run the check that produces {name} before capture")

    groups = [assets[:8]] + [assets[start:start + 7] for start in range(8, len(assets), 7)]
    frames = [title_frame(), source_frame()]
    frames.extend(contact_frame(number, [asset["id"] for asset in group]) for number, group in enumerate(groups, 1))
    frames.append(verification_frame())
    if len(frames) != 10 or sum(len(group) for group in groups) != 50:
        raise SystemExit("demo must cover all 50 assets in exactly 10 frames")

    frame_dir = BUNDLE / "frames"
    frame_dir.mkdir(parents=True, exist_ok=True)
    for number, frame in enumerate(frames, 1):
        frame.save(frame_dir / f"frame-{number:02d}.png", optimize=True)
    output = BUNDLE / "apiary-kit.mp4"
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "1/3",
        "-i", str(frame_dir / "frame-%02d.png"), "-c:v", "libx264", "-r", "24",
        "-pix_fmt", "yuv420p", "-crf", "25", "-movflags", "+faststart", str(output),
    ], check=True)
    Image.open(frame_dir / "frame-01.png").save(BUNDLE / "poster.png", optimize=True)
    print(f"wrote {output}")


if __name__ == "__main__":
    main()
