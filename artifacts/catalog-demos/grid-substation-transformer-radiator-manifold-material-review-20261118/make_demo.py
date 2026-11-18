#!/usr/bin/env python3
"""Build the short local preview and exported-GLB regression handoff video."""

from pathlib import Path
import subprocess
import tempfile

from PIL import Image, ImageDraw, ImageFont


BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
SLIDES = BUNDLE / "video-inputs"
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
    draw.text((58, 682), "kernelCAD catalog · local software preview and GLB regression",
              fill=MUTED, font=font(14))
    return image, draw


def fit(path: Path, size: tuple[int, int]) -> Image.Image:
    image = Image.open(path).convert("RGB")
    image.thumbnail(size, Image.Resampling.LANCZOS)
    return image


def paste_center(canvas: Image.Image, image: Image.Image, box: tuple[int, int, int, int]):
    x0, y0, x1, y1 = box
    image = image.copy()
    image.thumbnail((x1 - x0, y1 - y0), Image.Resampling.LANCZOS)
    canvas.paste(image, (x0 + (x1 - x0 - image.width) // 2,
                         y0 + (y1 - y0 - image.height) // 2))


def write_slides() -> list[Path]:
    SLIDES.mkdir(exist_ok=True)
    paths: list[Path] = []

    names = [
        "substation-main-power-transformer",
        "substation-oil-cooling-pump-skid",
        "substation-station-battery-rack",
        "substation-dead-tank-breaker",
        "substation-transformer-radiator-bank",
    ]
    cards = [(56, 138, 424, 385), (456, 138, 824, 385), (856, 138, 1224, 385),
             (256, 416, 624, 655), (656, 416, 1024, 655)]
    image, draw = base("Five grid-substation previews reviewed",
                       "Rendered catalog images checked for identity, visible equipment, and material roles")
    for name, (x0, y0, x1, y1) in zip(names, cards):
        draw.rounded_rectangle((x0, y0, x1, y1), radius=14, fill=(255, 255, 255),
                               outline=(207, 218, 226), width=2)
        preview = BUNDLE / "samples" / "previews" / f"{name}.png"
        paste_center(image, fit(preview, (x1 - x0 - 20, y1 - y0 - 55)),
                     (x0 + 10, y0 + 10, x1 - 10, y1 - 48))
        draw.text((x0 + 14, y1 - 36), name.replace("substation-", "").replace("-", " "),
                  fill=INK, font=font(15, True))
    paths.append(SLIDES / "slide-01-five-preview-audit.png")
    image.save(paths[-1])

    image, draw = base("Before · copper-colored oil manifolds",
                       "The two steel oil-side parts were mapped to the copper control")
    preview = fit(BUNDLE / "before" / "substation-transformer-radiator-bank.png", (510, 510))
    paste_center(image, preview, (350, 126, 930, 624))
    draw.text((68, 284), "Oil-side steel\nmanifolds", fill=(145, 88, 52), font=font(23, True), spacing=8)
    draw.text((966, 284), "Copper\ncontrol", fill=(145, 88, 52), font=font(23, True), spacing=8)
    paths.append(SLIDES / "slide-02-before.png")
    image.save(paths[-1])

    image, draw = base("Source edit · oil manifold material",
                       "Both named manifolds move to radiator steel; the unused copper control is removed")
    rows = [("inlet-manifold", "copper", "stainlessSteel"),
            ("outlet-manifold", "copper", "stainlessSteel")]
    y = 218
    for part, before, after in rows:
        draw.text((120, y), part, fill=INK, font=font(25, True))
        draw.text((610, y), before, fill=(145, 88, 52), font=font(23))
        draw.text((760, y), "→", fill=MUTED, font=font(25, True))
        draw.text((820, y), after, fill=(49, 93, 104), font=font(23, True))
        y += 86
    draw.rounded_rectangle((120, 438, 1160, 548), radius=12, fill=(255, 255, 255),
                           outline=(207, 218, 226), width=2)
    draw.text((150, 471), "Geometry, scale, triangle budget, and preset names retained", fill=INK,
              font=font(20, True))
    paths.append(SLIDES / "slide-03-source-change.png")
    image.save(paths[-1])

    image, draw = base("After · manifolds share the steel finish",
                       "The orange conductor cue is gone; the fin bank and its oil headers read as one steel assembly")
    preview = fit(ROOT / "catalog/kits/grid-substation/previews/substation-transformer-radiator-bank.png",
                  (510, 510))
    paste_center(image, preview, (350, 126, 930, 624))
    draw.text((76, 302), "Steel oil\nmanifolds", fill=(49, 93, 104), font=font(23, True), spacing=8)
    draw.text((956, 302), "200 triangles\n/ 1,800 budget", fill=INK, font=font(21, True), spacing=8)
    paths.append(SLIDES / "slide-04-after.png")
    image.save(paths[-1])

    image, draw = base("Exported GLB regression · passed",
                       "The focused test inspects named exported parts and their base colors")
    draw.rounded_rectangle((142, 166, 1138, 570), radius=20, fill=(255, 255, 255),
                           outline=(207, 218, 226), width=2)
    draw.text((198, 212), "1 test passed", fill=(34, 119, 80), font=font(42, True))
    draw.text((198, 288), "• inlet + outlet manifold → radiator steel", fill=INK, font=font(23))
    draw.text((198, 348), "• copper knob removed; both presets retained", fill=INK, font=font(23))
    draw.text((198, 408), "• 200 triangles / 1,800 triangle budget", fill=INK, font=font(23))
    draw.text((198, 490), "Local preview and software regression only", fill=MUTED, font=font(19))
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
