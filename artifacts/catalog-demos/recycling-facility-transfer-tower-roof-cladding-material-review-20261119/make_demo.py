#!/usr/bin/env python3
"""Build a short local preview and exported-GLB regression handoff video."""

from pathlib import Path
import subprocess
import tempfile

from PIL import Image, ImageDraw, ImageFont


BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
SLIDES = BUNDLE / "slides"
WIDTH, HEIGHT = 1280, 720
BG = (238, 244, 249)
INK = (30, 47, 61)
MUTED = (82, 101, 116)
ACCENT = (42, 102, 122)
NAMES = [
    "conveyor-transfer-tower",
    "conveyor-transfer-chute",
    "color-sorter-camera",
    "inclined-belt-conveyor",
    "magnet-cleanout-drum",
]


def font(size: int, bold: bool = False):
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    path = Path("/usr/share/fonts/truetype/dejavu") / name
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def base(title: str, subtitle: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    draw.text((56, 38), title, fill=INK, font=font(34, True))
    draw.text((58, 88), subtitle, fill=MUTED, font=font(18))
    draw.rounded_rectangle((56, 667, WIDTH - 56, 672), radius=2, fill=ACCENT)
    draw.text((58, 682), "kernelCAD catalog · local preview and software regression",
              fill=MUTED, font=font(14))
    return image, draw


def fit(path: Path, size: tuple[int, int]) -> Image.Image:
    image = Image.open(path).convert("RGB")
    image.thumbnail(size, Image.Resampling.LANCZOS)
    return image


def paste_center(canvas: Image.Image, image: Image.Image, box: tuple[int, int, int, int]):
    x0, y0, x1, y1 = box
    image.thumbnail((x1 - x0, y1 - y0), Image.Resampling.LANCZOS)
    canvas.paste(image, (x0 + (x1 - x0 - image.width) // 2,
                         y0 + (y1 - y0 - image.height) // 2))


def write_slides() -> list[Path]:
    SLIDES.mkdir(exist_ok=True)
    paths: list[Path] = []

    image, draw = base(
        "Five recycling equipment previews reviewed",
        "Identity, silhouette, catalog envelope, visible features, and material roles checked",
    )
    cards = [(56, 138, 424, 385), (456, 138, 824, 385), (856, 138, 1224, 385),
             (256, 416, 624, 655), (656, 416, 1024, 655)]
    for name, (x0, y0, x1, y1) in zip(NAMES, cards):
        draw.rounded_rectangle((x0, y0, x1, y1), radius=14, fill=(255, 255, 255),
                               outline=(207, 218, 226), width=2)
        preview = BUNDLE / "samples" / "previews" / f"{name}.png"
        paste_center(image, fit(preview, (x1 - x0 - 20, y1 - y0 - 55)),
                     (x0 + 10, y0 + 10, x1 - 10, y1 - 48))
        draw.text((x0 + 14, y1 - 36), name.replace("-", " "), fill=INK, font=font(15, True))
    paths.append(SLIDES / "slide-01-five-preview-audit.png")
    image.save(paths[-1])

    image, draw = base(
        "Before · roof sheet assigned to painted structure",
        "The tower and tail-house roof sheets are yellow while the wall cladding is gray",
    )
    paste_center(image, fit(BUNDLE / "before/conveyor-transfer-tower.png", (520, 520)),
                 (330, 126, 950, 630))
    draw.text((82, 290), "Yellow roof\nsheet", fill=(147, 99, 19), font=font(24, True), spacing=8)
    draw.text((965, 290), "Gray wall\ncladding", fill=(70, 94, 106), font=font(24, True), spacing=8)
    paths.append(SLIDES / "slide-02-before.png")
    image.save(paths[-1])

    image, draw = base(
        "Source edit · one material assignment",
        "The roof uses the existing cladding control; no geometry or user control changed",
    )
    rows = [
        ("tower + tail-house roof sheets", "structure", "cladding"),
        ("tower walls + ribs", "cladding", "cladding"),
        ("columns + access steel", "structure", "structure"),
        ("roof vent cap", "structure", "structure"),
    ]
    y = 178
    for part, before, after in rows:
        draw.text((120, y), part, fill=INK, font=font(23, True))
        draw.text((570, y), before, fill=(147, 99, 19), font=font(22))
        draw.text((760, y), "→", fill=MUTED, font=font(25, True))
        draw.text((820, y), after, fill=(49, 93, 104), font=font(22, True))
        y += 75
    draw.rounded_rectangle((120, 512, 1160, 612), radius=12, fill=(255, 255, 255),
                           outline=(207, 218, 226), width=2)
    draw.text((148, 538), "Geometry, dimensions, presets, and triangle budget retained",
              fill=INK, font=font(20, True))
    paths.append(SLIDES / "slide-03-source-change.png")
    image.save(paths[-1])

    image, draw = base(
        "After · roof sheet shares tower cladding",
        "Gray roof and wall enclosure; yellow columns, ladder, rails, and vent cap remain distinct",
    )
    paste_center(image, fit(ROOT / "catalog/kits/recycling-facility/previews/conveyor-transfer-tower.png",
                            (520, 520)), (330, 126, 950, 630))
    draw.text((76, 306), "Cladding", fill=(70, 94, 106), font=font(24, True))
    draw.text((966, 306), "Painted\nstructure", fill=(147, 99, 19), font=font(22, True), spacing=8)
    paths.append(SLIDES / "slide-04-after.png")
    image.save(paths[-1])

    image, draw = base(
        "Exported GLB regression · passed",
        "Checks named parts, material palettes, retained controls, envelope, and mesh budget",
    )
    draw.rounded_rectangle((142, 166, 1138, 570), radius=20, fill=(255, 255, 255),
                           outline=(207, 218, 226), width=2)
    draw.text((198, 212), "1 test passed", fill=(34, 119, 80), font=font(42, True))
    draw.text((198, 284), "• tower + tail-house roof sheets → cladding", fill=INK, font=font(23))
    draw.text((198, 344), "• columns + vent cap → painted structure", fill=INK, font=font(23))
    draw.text((198, 404), "• 2,054 triangles / 4,400 triangle budget", fill=INK, font=font(23))
    draw.text((198, 492), "Local preview render and GLB regression only", fill=MUTED, font=font(19))
    paths.append(SLIDES / "slide-05-verification.png")
    image.save(paths[-1])

    return paths


def main() -> None:
    paths = write_slides()
    video = BUNDLE / "review-demo.mp4"
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as listing:
        for path in paths:
            listing.write(f"file '{path.as_posix()}'\n")
            listing.write("duration 3\n")
        listing.write(f"file '{paths[-1].as_posix()}'\n")
        listing_path = Path(listing.name)
    try:
        subprocess.run([
            "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(listing_path),
            "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-crf", "22",
            "-preset", "medium", "-movflags", "+faststart", str(video),
        ], check=True)
    finally:
        listing_path.unlink(missing_ok=True)
    print(f"wrote {video}")


if __name__ == "__main__":
    main()
