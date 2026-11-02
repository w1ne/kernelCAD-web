#!/usr/bin/env python3
"""Build a labelled preview reel from the generated kernelCAD garden previews."""

from pathlib import Path
import json
import subprocess
import textwrap

from PIL import Image, ImageDraw, ImageFont


REPO = Path.cwd().resolve()
BUNDLE = Path(__file__).resolve().parent
ASSET_DIR = REPO / "catalog/kits/garden"
PREVIEW_DIR = ASSET_DIR / "previews"
FRAME_DIR = BUNDLE / "frames"
WIDTH, HEIGHT = 1600, 920
FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD_PATH if bold else FONT_PATH, size)


def page(title: str, subtitle: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (WIDTH, HEIGHT), "#eef1e9")
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, WIDTH, 102), fill="#334739")
    draw.text((44, 20), title, font=font(34, True), fill="#ffffff")
    draw.text((46, 64), subtitle, font=font(17), fill="#dce5d8")
    return image, draw


def intro() -> Image.Image:
    image, draw = page("kernelCAD · Garden kit", "Local catalog preview reel · 2026-11-02")
    draw.text((90, 210), "40 original garden assets", font=font(60, True), fill="#27362b")
    draw.text((92, 305), "Greenhouses · planting fixtures · irrigation · wildlife · garden accents", font=font(27), fill="#43584a")
    draw.rounded_rectangle((92, 415, 1508, 665), radius=24, fill="#ffffff", outline="#c7d0c3", width=3)
    lines = [
        "40 individual parametric .kcad.ts sources",
        "40 / 40 local asset checks passed · one palette material per asset",
        "CC0-1.0 · millimetres · Z-up · base origin at z = 0",
    ]
    for i, line in enumerate(lines):
        draw.text((140, 462 + i * 62), line, font=font(25, i == 0), fill="#334739")
    draw.text((92, 795), "Models are authored from scratch in kernelCAD; the reel uses their generated catalog previews.", font=font(21), fill="#43584a")
    draw.text((92, 840), "Local source and preview evidence · no deployment or physical acceptance is claimed.", font=font(19), fill="#6a5644")
    return image


def contact_sheet(items: list[Path], page_number: int) -> Image.Image:
    image, draw = page(
        "Garden kit · generated asset previews",
        f"Assets {page_number * 10 + 1:02d}–{page_number * 10 + len(items):02d} of 40 · local kernelCAD catalog output",
    )
    card_w, card_h = 280, 350
    start_x, start_y, gap_x, gap_y = 40, 128, 24, 18
    for index, source in enumerate(items):
        col, row = index % 5, index // 5
        x = start_x + col * (card_w + gap_x)
        y = start_y + row * (card_h + gap_y)
        draw.rounded_rectangle((x, y, x + card_w, y + card_h), radius=12, fill="#ffffff", outline="#d5dbd1", width=2)
        preview = Image.open(source).convert("RGBA")
        preview.thumbnail((250, 250), Image.Resampling.LANCZOS)
        px = x + (card_w - preview.width) // 2
        py = y + 10 + (250 - preview.height) // 2
        image.alpha_composite(preview, (px, py)) if image.mode == "RGBA" else image.paste(preview, (px, py), preview)
        label = source.stem
        lines = textwrap.wrap(label, width=25)[:2]
        for line_index, line in enumerate(lines):
            draw.text((x + 12, y + 273 + line_index * 23), line, font=font(16, True), fill="#29372c")
    draw.text((42, 880), "Rendered geometry previews · each tile links to its matching .kcad.ts asset source.", font=font(17), fill="#43584a")
    return image


def outro() -> Image.Image:
    image, draw = page("kernelCAD · Garden kit", "Completion evidence for this local asset wave")
    draw.text((100, 200), "40 assets added", font=font(66, True), fill="#27362b")
    draw.text((104, 295), "40 / 40 asset checks passed", font=font(34, True), fill="#476a4d")
    draw.text((104, 360), "Catalog index rebuilt · preview PNGs generated · integration gate: PASS", font=font(26), fill="#43584a")
    draw.rounded_rectangle((100, 470, 1500, 690), radius=20, fill="#ffffff", outline="#c7d0c3", width=3)
    draw.text((145, 520), "Validation covers local source and generated catalog data.", font=font(25), fill="#334739")
    draw.text((145, 572), "The PR is not merged; public deployment has not been verified.", font=font(25), fill="#8a583a")
    draw.text((145, 624), "No hardware build or physical acceptance is claimed.", font=font(25), fill="#8a583a")
    draw.text((100, 800), "Native kernelCAD assets · original parametric geometry · CC0-1.0", font=font(24), fill="#43584a")
    return image


def main() -> None:
    BUNDLE.mkdir(parents=True, exist_ok=True)
    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    sources = sorted(ASSET_DIR.glob("*.kcad.ts"))
    if len(sources) != 40:
        raise SystemExit(f"expected 40 garden sources, found {len(sources)}")
    previews = [PREVIEW_DIR / f"{source.name.removesuffix('.kcad.ts')}.png" for source in sources]
    missing = [path for path in previews if not path.is_file()]
    if missing:
        raise SystemExit("missing generated previews: " + ", ".join(p.name for p in missing))

    frames = [intro()]
    for page_index in range(4):
        first = page_index * 10
        frames.append(contact_sheet(previews[first:first + 10], page_index))
    frames.append(outro())
    for index, frame in enumerate(frames):
        frame.convert("RGB").save(FRAME_DIR / f"frame-{index:02d}.png", optimize=True)

    settings = {
        "source": "catalog/kits/garden/*.kcad.ts",
        "input_images": "catalog/kits/garden/previews/*.png",
        "frame_count": len(frames),
        "frame_size_px": [WIDTH, HEIGHT],
        "duration_per_frame_seconds": 4,
        "video_duration_seconds": 24,
        "fps": 30,
        "codec": "H.264 / libx264, yuv420p",
        "captions": "Local source validation and generated previews only; no deployment or physical acceptance claimed.",
    }
    (BUNDLE / "demo-settings.json").write_text(json.dumps(settings, indent=2) + "\n")

    output = BUNDLE / "garden-kit-demo.mp4"
    command = [
        "ffmpeg", "-y", "-framerate", "1/4", "-i", str(FRAME_DIR / "frame-%02d.png"),
        "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", "30",
        "-movflags", "+faststart", str(output),
    ]
    print("$ " + " ".join(command))
    subprocess.run(command, check=True)
    print(f"wrote {output}")


if __name__ == "__main__":
    main()
