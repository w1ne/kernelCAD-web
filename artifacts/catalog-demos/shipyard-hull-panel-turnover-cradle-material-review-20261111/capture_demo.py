#!/usr/bin/env python3
"""Build a short, readable before/after material-review MP4 from real previews."""

from pathlib import Path
import subprocess

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
W, H = 1280, 720
BG = (239, 244, 248)
INK = (28, 42, 55)
MUTED = (82, 99, 112)
BLUE = (43, 90, 137)
GREEN = (45, 117, 79)
WHITE = (255, 255, 255)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def base(title: str, kicker: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(image)
    draw.text((54, 32), kicker.upper(), fill=BLUE, font=font(18, True))
    draw.text((54, 63), title, fill=INK, font=font(32, True))
    return image, draw


def fit_preview(path: Path, size: tuple[int, int] = (512, 512)) -> Image.Image:
    image = Image.open(path).convert("RGB")
    image.thumbnail(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", size, WHITE)
    canvas.paste(image, ((size[0] - image.width) // 2, (size[1] - image.height) // 2))
    return canvas


def footer(draw: ImageDraw.ImageDraw) -> None:
    draw.line((54, 674, W - 54, 674), fill=(196, 207, 216), width=1)
    draw.text((54, 686), "Local kernelCAD source render · no deployment or equipment acceptance claimed", fill=MUTED, font=font(15))


def main() -> None:
    before = HERE / "before/hull-panel-turnover-cradle.png"
    after = HERE / "after/hull-panel-turnover-cradle.png"
    frame_dir = HERE / "video-inputs"
    frame_dir.mkdir(exist_ok=True)

    # Slide 1: identify the material inconsistency in the actual prior preview.
    image, draw = base("Matching frames, different finishes", "Semantic preview review")
    image.paste(fit_preview(before), (384, 132))
    draw.rounded_rectangle((346, 124, 934, 656), radius=14, outline=(196, 207, 216), width=2)
    draw.rounded_rectangle((418, 584, 862, 632), radius=12, fill=WHITE)
    draw.text((442, 597), "Before · one frame painted, one steel", fill=INK, font=font(18, True))
    footer(draw)
    image.save(frame_dir / "01-before.png")

    # Slide 2: the re-render preserves geometry while matching the frame finish.
    image, draw = base("Both end frames now share yard paint", "Before / after")
    draw.text((194, 116), "BEFORE", fill=BLUE, font=font(18, True))
    draw.text((838, 116), "AFTER", fill=GREEN, font=font(18, True))
    image.paste(fit_preview(before), (70, 144))
    image.paste(fit_preview(after), (698, 144))
    draw.rounded_rectangle((64, 138, 588, 666), radius=12, outline=(196, 207, 216), width=2)
    draw.rounded_rectangle((692, 138, 1216, 666), radius=12, outline=(125, 181, 148), width=2)
    footer(draw)
    image.save(frame_dir / "02-before-after.png")

    # Slide 3: show the authored change and its local verification evidence.
    image, draw = base("A material assignment correction", "Native kernelCAD asset")
    draw.rounded_rectangle((58, 142, 1222, 320), radius=14, fill=(29, 39, 48))
    draw.text((88, 164), 'end-frame-0  →  yardPaint', fill=(185, 221, 255), font=font(25, True))
    draw.text((88, 218), 'end-frame-1  →  yardPaint', fill=(154, 220, 177), font=font(25, True))
    draw.text((88, 274), 'axle · saddle arms · stops · feet  →  structuralSteel', fill=(218, 224, 229), font=font(19))
    checks = [
        "GLB regression: both frame meshes use the yard-finish color",
        "420 triangles · 1,800 budget · source hash rebuilt in catalog index",
        "Shipyard ESLint and catalog integration suite pass",
        "Local generated detail page points to the updated preview",
    ]
    for index, line in enumerate(checks):
        y = 367 + index * 48
        draw.ellipse((78, y + 5, 102, y + 29), fill=GREEN)
        draw.text((85, y + 5), "✓", fill=WHITE, font=font(17, True))
        draw.text((120, y), line, fill=INK, font=font(19))
    footer(draw)
    image.save(frame_dir / "03-local-checks.png")

    concat = HERE / "demo-slides.txt"
    concat.write_text(
        "file 'video-inputs/01-before.png'\n"
        "duration 4\n"
        "file 'video-inputs/02-before-after.png'\n"
        "duration 5\n"
        "file 'video-inputs/03-local-checks.png'\n"
        "duration 5\n"
        "file 'video-inputs/03-local-checks.png'\n",
        encoding="utf-8",
    )
    subprocess.run([
        "ffmpeg", "-y", "-safe", "0", "-f", "concat", "-i", str(concat),
        "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "medium",
        "-crf", "20", "-movflags", "+faststart",
        str(HERE / "shipyard-hull-panel-turnover-cradle-material-review.mp4"),
    ], cwd=HERE, check=True)


if __name__ == "__main__":
    main()
