#!/usr/bin/env python3
"""Build a short, local preview and regression handoff video."""

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


def font(size: int, bold: bool = False):
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    path = Path("/usr/share/fonts/truetype/dejavu") / name
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def base(title: str, subtitle: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    draw.text((56, 38), title, fill=INK, font=font(34, True))
    draw.text((58, 88), subtitle, fill=MUTED, font=font(19))
    draw.rounded_rectangle((56, 667, WIDTH - 56, 672), radius=2, fill=ACCENT)
    draw.text((58, 682), "kernelCAD catalog · local preview and software regression",
              fill=MUTED, font=font(14))
    return image, draw


def fit(image_path: Path, size: tuple[int, int]) -> Image.Image:
    image = Image.open(image_path).convert("RGB")
    image.thumbnail(size, Image.Resampling.LANCZOS)
    return image


def paste_center(canvas: Image.Image, image: Image.Image, box: tuple[int, int, int, int]):
    x0, y0, x1, y1 = box
    image = fit_image_size(image, (x1 - x0, y1 - y0))
    canvas.paste(image, (x0 + (x1 - x0 - image.width) // 2,
                         y0 + (y1 - y0 - image.height) // 2))


def fit_image_size(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    image = image.copy()
    image.thumbnail(size, Image.Resampling.LANCZOS)
    return image


def write_slides() -> list[Path]:
    SLIDES.mkdir(exist_ok=True)
    paths: list[Path] = []

    # Slide 1: the five actual catalog previews that were checked.
    image, draw = base("Five industrial assets reviewed",
                       "Rendered catalog previews checked for identity, dimensions, visible features, and material roles")
    names = ["jib-crane", "electric-pallet-jack", "pipe-rack-bay",
             "steel-access-gate", "machine-guard-enclosure"]
    cards = [(56, 138, 424, 385), (456, 138, 824, 385), (856, 138, 1224, 385),
             (256, 416, 624, 655), (656, 416, 1024, 655)]
    for name, (x0, y0, x1, y1) in zip(names, cards):
        draw.rounded_rectangle((x0, y0, x1, y1), radius=14, fill=(255, 255, 255), outline=(207, 218, 226), width=2)
        preview = BUNDLE / "samples" / f"{name}.png"
        paste_center(image, fit(preview, (x1 - x0 - 20, y1 - y0 - 55)),
                     (x0 + 10, y0 + 10, x1 - 10, y1 - 48))
        draw.text((x0 + 14, y1 - 36), name.replace("-", " "), fill=INK, font=font(16, True))
    paths.append(SLIDES / "slide-01-five-preview-audit.png")
    image.save(paths[-1])

    # Slide 2: checked-in baseline before the material correction.
    image, draw = base("Before · split finish on one support frame",
                       "The crossbeams and baseplates read safety-yellow while columns and braces read structural steel")
    preview = fit(BUNDLE / "before" / "pipe-rack-bay.png", (510, 510))
    paste_center(image, preview, (350, 126, 930, 624))
    draw.text((70, 300), "Structural\ncolumns + braces", fill=INK, font=font(22, True), spacing=8)
    draw.text((960, 300), "Safety-yellow\ncrossbeams + bases", fill=(147, 99, 19), font=font(22, True), spacing=8)
    paths.append(SLIDES / "slide-02-before.png")
    image.save(paths[-1])

    # Slide 3: exact source assignments changed, and the intentionally retained accent.
    image, draw = base("Source edit · four frame parts",
                       "Only the material control changes; geometry, dimensions, and presets stay the same")
    rows = [
        ("crossbeam--1", "safetyPaint", "steel"),
        ("crossbeam-1", "safetyPaint", "steel"),
        ("baseplate--1", "safetyPaint", "steel"),
        ("baseplate-1", "safetyPaint", "steel"),
    ]
    y = 180
    for part, before, after in rows:
        draw.text((120, y), part, fill=INK, font=font(24, True))
        draw.text((570, y), before, fill=(147, 99, 19), font=font(23))
        draw.text((760, y), "→", fill=MUTED, font=font(25, True))
        draw.text((820, y), after, fill=(49, 93, 104), font=font(23, True))
        y += 76
    draw.rounded_rectangle((120, 514, 1160, 612), radius=12, fill=(255, 255, 255), outline=(207, 218, 226), width=2)
    draw.text((148, 538), "Retained: yellow center utility line and its flanges", fill=INK, font=font(20, True))
    paths.append(SLIDES / "slide-03-source-change.png")
    image.save(paths[-1])

    # Slide 4: regenerated kernelCAD catalog preview.
    image, draw = base("After · unified structural steel frame",
                       "The center utility run stays yellow so it remains visually distinct")
    preview = fit(ROOT / "catalog/kits/industrial-plant/previews/pipe-rack-bay.png", (520, 520))
    paste_center(image, preview, (350, 126, 930, 624))
    draw.text((82, 314), "Steel frame", fill=(49, 93, 104), font=font(24, True))
    draw.text((968, 314), "Yellow utility\nline retained", fill=(147, 99, 19), font=font(22, True), spacing=8)
    paths.append(SLIDES / "slide-04-after.png")
    image.save(paths[-1])

    # Slide 5: show the actual exported-GLB test result.
    image, draw = base("Exported GLB regression · passed",
                       "The test checks named mesh parts and their exported colors")
    draw.rounded_rectangle((142, 166, 1138, 570), radius=20, fill=(255, 255, 255), outline=(207, 218, 226), width=2)
    draw.text((198, 212), "1 test passed", fill=(34, 119, 80), font=font(42, True))
    draw.text((198, 284), "• crossbeams, baseplates, columns, and braces → steel", fill=INK, font=font(23))
    draw.text((198, 344), "• center utility line and flange → safety paint", fill=INK, font=font(23))
    draw.text((198, 404), "• 360 triangles / 1,400 triangle budget", fill=INK, font=font(23))
    draw.text((198, 492), "Local preview render and software regression only", fill=MUTED, font=font(19))
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
