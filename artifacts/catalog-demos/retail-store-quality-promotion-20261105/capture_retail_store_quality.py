#!/usr/bin/env python3
"""Create a short reviewed-source walkthrough from the retail-store evidence."""

from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/retail-store"
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
    d.text((75, 146), "RETAIL STORE QUALITY", fill=TEXT, font=font(46, BOLD))
    d.text((78, 228), "48 existing assets promoted in place", fill=TEXT, font=font(24))
    d.text((78, 282), "2–4 material controls  ·  2 appearance presets  ·  48 refreshed previews", fill=MUTED, font=font(17))
    d.rounded_rectangle((72, 398, 1208, 552), radius=16, fill=PANEL, outline="#344651", width=2)
    d.text((105, 427), "144 material controls   /   96 named preset entries", fill=TEXT, font=font(24, BOLD))
    d.text((105, 477), "Same 48 IDs   /   no catalog count increase", fill=GREEN, font=font(17))
    footer(d, "Local source-to-preview workflow · stylized store fixtures · no operating or physical acceptance claim.")
    return im


def compare_frame() -> Image.Image:
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "01 / before and after", "Parts and finishes make each fixture legible", "Same catalog IDs and camera; source materials and structural details changed.")
    examples = [("Checkout counter", "checkout-counter"), ("Drink cooler", "upright-drink-cooler"), ("Shopping cart", "shopping-cart")]
    for row, (label, asset_id) in enumerate(examples):
        y = 147 + row * 171
        d.rounded_rectangle((54, y, 1226, y + 154), radius=12, fill=PANEL, outline="#344651", width=1)
        d.text((76, y + 8), label, fill=TEXT, font=font(16, BOLD))
        d.text((106, y + 32), "BASELINE", fill=MUTED, font=font(11, BOLD))
        d.text((414, y + 32), "PROMOTED", fill=GREEN, font=font(11, BOLD))
        paste_fit(im, BUNDLE / "before" / f"{asset_id}.png", (85, y + 47, 264, 100))
        paste_fit(im, PREVIEWS / f"{asset_id}.png", (398, y + 47, 264, 100))
        d.text((710, y + 69), asset_id, fill=BLUE, font=font(14, MONO))
    footer(d, "All 48 previews were rendered from native .kcad.ts sources at default parameters.")
    return im


def controls_frame() -> Image.Image:
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "02 / source and parts", "The counter controls map to counter materials", "Laminate colors the work surfaces and customer fascia; powder coat colors the cabinet and display.")
    source = (KIT / "checkout-counter.kcad.ts").read_text().splitlines()
    wanted = (
        "const powderCoat =", "const laminate =", "const glass =", "cleanStore:", "nightRestock:",
        'p.part("customer-ledge"', 'p.part("front-fascia"', 'p.part("cashier-screen"',
    )
    selected = [line.strip() for line in source if any(token in line for token in wanted)]
    d.rounded_rectangle((54, 151, 772, 581), radius=14, fill=PANEL, outline="#344651", width=1)
    y = 175
    for line in selected:
        d.text((74, y), line[:79], fill=BLUE if "param(" in line or "Store:" in line or "Restock:" in line else TEXT, font=font(13, MONO))
        y += 42
    d.rounded_rectangle((800, 151, 1226, 581), radius=14, fill=PANEL, outline="#344651", width=1)
    paste_fit(im, PREVIEWS / "checkout-counter.png", (824, 177, 378, 348))
    d.text((833, 535), "powder coat · laminate · glass", fill=GREEN, font=font(13, BOLD))
    footer(d, "Scale remains editable; each material control colors its named model components.")
    return im


def gallery_frame() -> Image.Image:
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "03 / refreshed previews", "Fixtures span service, shopping and stock", "Selected default views from the same 48 indexed retail-store IDs.")
    assets = [
        "barcode-scanner", "bakery-display-case", "checkout-conveyor", "gondola-shelf",
        "produce-crate-stack", "shopping-basket", "shopping-cart", "upright-drink-cooler",
    ]
    card_w, card_h, gap_x, x0, y0 = 280, 220, 12, 54, 157
    for i, asset_id in enumerate(assets):
        col, row = i % 4, i // 4
        x, y = x0 + col * (card_w + gap_x), y0 + row * 238
        d.rounded_rectangle((x, y, x + card_w, y + card_h), radius=10, fill=PANEL, outline="#344651", width=1)
        paste_fit(im, PREVIEWS / f"{asset_id}.png", (x + 12, y + 12, card_w - 24, 168))
        d.text((x + 12, y + 184), asset_id.replace("-", " ")[:30], fill=TEXT, font=font(12, BOLD))
    footer(d, "Defaults separate metal, rubber, wood, glass, paper and molded-polymer parts.")
    return im


def presets_frame() -> Image.Image:
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "04 / named appearance presets", "One cart, two coordinated finishes", "Both renders replay the values in the shopping-cart source presets.")
    d.rounded_rectangle((54, 157, 622, 601), radius=14, fill=PANEL, outline="#344651", width=1)
    d.rounded_rectangle((658, 157, 1226, 601), radius=14, fill=PANEL, outline="#344651", width=1)
    d.text((82, 178), "cleanStore", fill=TEXT, font=font(22, BOLD))
    d.text((686, 178), "nightRestock", fill=TEXT, font=font(22, BOLD))
    paste_fit(im, BUNDLE / "presets/shopping-cart-cleanStore.png", (88, 222, 500, 300))
    paste_fit(im, BUNDLE / "presets/shopping-cart-nightRestock.png", (692, 222, 500, 300))
    d.text((87, 548), "steel #bfc8cb · polymer #d6e0d5", fill=BLUE, font=font(13, MONO))
    d.text((690, 548), "steel #66747a · polymer #45614e", fill=GREEN, font=font(13, MONO))
    footer(d, "Same source geometry and triangle budget; source-declared palette values replayed through the local renderer.")
    return im


def result_frame() -> Image.Image:
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "05 / local verification", "Sources, previews and index agree", "Quality, lint, integration and generated local pages were checked on this branch.")
    metrics = [
        ("48 / 48 · 100%", "retail-store assets pass quality gate"),
        ("2,051 / 2,390", "catalog assets pass · 85.82%"),
        ("48 / 48", "pages, previews and hashes checked"),
        ("4 files / 15 tests", "catalog integration suite passed"),
    ]
    for i, (value, label) in enumerate(metrics):
        col, row = i % 2, i // 2
        x, y = 58 + col * 588, 176 + row * 194
        d.rounded_rectangle((x, y, x + 544, y + 150), radius=14, fill=PANEL, outline="#344651", width=1)
        d.text((x + 28, y + 25), value, fill=GREEN, font=font(28, BOLD))
        d.text((x + 28, y + 83), label, fill=TEXT, font=font(16))
    footer(d, "Local checks only · branch not deployed · store operation, accessibility and physical acceptance not evaluated.")
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
    video = BUNDLE / "retail-store-quality-promotion.mp4"
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
