#!/usr/bin/env python3
"""Build a short source-to-preview walkthrough from apiary catalog evidence."""

from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/apiary"
PREVIEWS = KIT / "previews"
FRAMES = BUNDLE / "frames"
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, GREEN, BLUE = "#111923", "#1d2935", "#eef3f5", "#a6b6c0", "#86c89a", "#75bfd1"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"


def font(size: int, path: str = FONT) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def canvas() -> Image.Image:
    return Image.new("RGB", (WIDTH, HEIGHT), BG)


def header(draw: ImageDraw.ImageDraw, kicker: str, title: str, detail: str) -> None:
    draw.text((54, 27), kicker.upper(), fill=GREEN, font=font(16, BOLD))
    draw.text((54, 55), title, fill=TEXT, font=font(30, BOLD))
    draw.text((54, 99), detail, fill=MUTED, font=font(15))


def footer(draw: ImageDraw.ImageDraw, detail: str) -> None:
    draw.line((54, 678, WIDTH - 54, 678), fill="#35434e", width=1)
    draw.text((54, 689), detail, fill=MUTED, font=font(12))


def paste_fit(im: Image.Image, source: Path, bounds: tuple[int, int, int, int]) -> None:
    x, y, width, height = bounds
    preview = Image.open(source).convert("RGB")
    preview.thumbnail((width, height), Image.Resampling.LANCZOS)
    im.paste(preview, (x + (width - preview.width) // 2, y + (height - preview.height) // 2))


def save_frame(number: int, im: Image.Image) -> Path:
    path = FRAMES / f"frame-{number:02d}.png"
    im.save(path, optimize=True)
    return path


def title_frame() -> Image.Image:
    im = canvas()
    d = ImageDraw.Draw(im)
    d.text((72, 67), "kernelCAD  /  ASSET CATALOG", fill=GREEN, font=font(20, BOLD))
    d.text((75, 146), "APIARY ASSET QUALITY", fill=TEXT, font=font(46, BOLD))
    d.text((78, 228), "49 existing assets promoted for useful material controls", fill=TEXT, font=font(24))
    d.text((78, 282), "2–4 materials  ·  2 appearance presets  ·  50 refreshed previews", fill=MUTED, font=font(17))
    d.rounded_rectangle((72, 398, 1208, 552), radius=16, fill=PANEL, outline="#344651", width=2)
    d.text((105, 427), "121 new controls   /   98 new preset entries", fill=TEXT, font=font(24, BOLD))
    d.text((105, 477), "Same 50 IDs   ·   scale parameters and triangle budgets retained", fill=GREEN, font=font(17))
    footer(d, "Local source-to-preview workflow · generic visualization props · no field or hardware acceptance claim.")
    return im


def compare_frame() -> Image.Image:
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "01 / preview comparison", "Materials identify the object parts", "The same catalog IDs, rendered before and after the source update.")
    examples = [
        ("Langstroth hive", "langstroth-hive"),
        ("Bee smoker", "bee-smoker"),
        ("Manual honey extractor", "honey-extractor"),
    ]
    for row, (label, asset_id) in enumerate(examples):
        y = 147 + row * 171
        d.rounded_rectangle((54, y, 1226, y + 154), radius=12, fill=PANEL, outline="#344651", width=1)
        d.text((76, y + 8), label, fill=TEXT, font=font(16, BOLD))
        d.text((106, y + 32), "BASELINE", fill=MUTED, font=font(11, BOLD))
        d.text((414, y + 32), "MATERIAL CONTROLS", fill=GREEN, font=font(11, BOLD))
        paste_fit(im, BUNDLE / "before" / f"{asset_id}.png", (85, y + 47, 264, 100))
        paste_fit(im, PREVIEWS / f"{asset_id}.png", (398, y + 47, 264, 100))
        d.text((710, y + 69), asset_id, fill=BLUE, font=font(14, MONO))
    footer(d, "Updated previews were rendered from native .kcad.ts sources at their default parameters.")
    return im


def controls_frame() -> Image.Image:
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "02 / material controls", "Parameters follow the hive parts", "The Langstroth source separates timber, galvanized roof metal and enamel entrance trim.")
    source = (KIT / "langstroth-hive.kcad.ts").read_text().splitlines()
    wanted = (
        "const timber =",
        "const stainless =",
        "const enamel =",
        "freshApiary:",
        "weatheredYard:",
        'p.part("brood-box"',
        'p.part("honey-super"',
        'p.part("entrance-strip"',
        'p.part("roof-sheet"',
    )
    selected = [line.strip() for line in source if any(token in line for token in wanted)]
    d.rounded_rectangle((54, 151, 772, 581), radius=14, fill=PANEL, outline="#344651", width=1)
    y = 175
    for line in selected:
        d.text((74, y), line[:76], fill=BLUE if "param(" in line or "Apiary:" in line or "Yard:" in line else TEXT, font=font(13, MONO))
        y += 38
    d.rounded_rectangle((800, 151, 1226, 581), radius=14, fill=PANEL, outline="#344651", width=1)
    paste_fit(im, PREVIEWS / "langstroth-hive.png", (824, 177, 378, 348))
    d.text((833, 535), "timber · stainless · enamel", fill=GREEN, font=font(13, BOLD))
    footer(d, "Scale remains editable; each material knob colors its named assembly components.")
    return im


def gallery_frame() -> Image.Image:
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "03 / refreshed apiary previews", "A varied kit for hive and honey workflows", "Selected default views from the same 50 indexed asset IDs.")
    assets = [
        "apiary-sign", "apiary-waterer", "bee-smoker", "hive-scale",
        "langstroth-hive", "honey-extractor", "honey-jar", "beekeeper-veil-hood",
    ]
    card_w, card_h, gap_x, x0, y0 = 280, 220, 12, 54, 157
    for i, asset_id in enumerate(assets):
        col, row = i % 4, i // 4
        x, y = x0 + col * (card_w + gap_x), y0 + row * 238
        d.rounded_rectangle((x, y, x + card_w, y + card_h), radius=10, fill=PANEL, outline="#344651", width=1)
        paste_fit(im, PREVIEWS / f"{asset_id}.png", (x + 12, y + 12, card_w - 24, 168))
        d.text((x + 12, y + 184), asset_id.replace("-", " ")[:30], fill=TEXT, font=font(12, BOLD))
    footer(d, "Defaults distinguish timber, steel, wax, fabric, glass, honey, polymer and protective mesh.")
    return im


def presets_frame() -> Image.Image:
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "04 / named appearance presets", "One jar, two coordinated palettes", "Both renders replay the color values declared in the honey-jar source presets.")
    d.rounded_rectangle((54, 157, 622, 601), radius=14, fill=PANEL, outline="#344651", width=1)
    d.rounded_rectangle((658, 157, 1226, 601), radius=14, fill=PANEL, outline="#344651", width=1)
    d.text((82, 178), "goldenHarvest", fill=TEXT, font=font(22, BOLD))
    d.text((686, 178), "paleSpring", fill=TEXT, font=font(22, BOLD))
    paste_fit(im, BUNDLE / "presets/honey-jar-goldenHarvest.png", (88, 222, 500, 300))
    paste_fit(im, BUNDLE / "presets/honey-jar-paleSpring.png", (692, 222, 500, 300))
    d.text((87, 548), "Honey #e9aa35 · brass #c49a50", fill=BLUE, font=font(14, MONO))
    d.text((690, 548), "Honey #f3d184 · brass #bcaa77", fill=GREEN, font=font(14, MONO))
    footer(d, "Same source geometry and triangle budget; named preset colors replayed through the local catalog renderer.")
    return im


def result_frame() -> Image.Image:
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "05 / local verification", "The previews and index match the sources", "Kit quality, generated pages and source hashes were checked locally.")
    metrics = [
        ("50 / 50", "apiary assets pass quality gate"),
        ("2,003 / 2,390", "catalog assets pass · 83.81%"),
        ("50 / 50", "pages, previews and hashes checked"),
        ("4 files / 15 tests", "catalog integration suite passed"),
    ]
    for i, (value, label) in enumerate(metrics):
        col, row = i % 2, i // 2
        x, y = 58 + col * 588, 176 + row * 194
        d.rounded_rectangle((x, y, x + 544, y + 150), radius=14, fill=PANEL, outline="#344651", width=1)
        d.text((x + 28, y + 25), value, fill=GREEN, font=font(28, BOLD))
        d.text((x + 28, y + 83), label, fill=TEXT, font=font(16))
    footer(d, "Local checks only · branch not deployed · field suitability and hardware acceptance not evaluated.")
    return im


def main() -> None:
    FRAMES.mkdir(parents=True, exist_ok=True)
    frames = [title_frame(), compare_frame(), controls_frame(), gallery_frame(), presets_frame(), result_frame()]
    frame_paths = [save_frame(index, frame) for index, frame in enumerate(frames, start=1)]
    Image.open(frame_paths[0]).save(BUNDLE / "poster.png", optimize=True)

    concat = BUNDLE / "frames.ffconcat"
    entries = []
    for path in frame_paths:
        entries.extend((f"file '{path}'", "duration 3.4"))
    entries.append(f"file '{frame_paths[-1]}'")
    concat.write_text("ffconcat version 1.0\n" + "\n".join(entries) + "\n")
    video = BUNDLE / "apiary-quality-promotion.mp4"
    subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-f", "concat", "-safe", "0", "-i", str(concat),
            "-vf", "fps=24", "-c:v", "libx264", "-crf", "22", "-preset", "medium",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(video),
        ],
        check=True,
    )
    print(f"wrote {video} with {len(frame_paths)} storyboard frames")


if __name__ == "__main__":
    main()
