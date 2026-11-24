#!/usr/bin/env python3
"""Build a short review video for the hull survey grid frame sill-rail fix.

Inputs: the two retained renders under samples/previews. Output: video-inputs/
slide PNGs and review-demo.mp4. Local evidence only; the video claims no
simulation, deployment or hardware result.
"""

from pathlib import Path
import subprocess

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent
WIDTH, HEIGHT = 1280, 720
BG = (246, 248, 250)
INK = (27, 42, 54)
MUTED = (87, 105, 119)
ACCENT = (191, 119, 20)
LINE = (215, 222, 227)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT, size)


def slide(title: str, subtitle: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    draw.text((64, 40), title, fill=INK, font=font(34, True))
    draw.text((66, 90), subtitle, fill=MUTED, font=font(18))
    draw.line((64, 130, WIDTH - 64, 130), fill=LINE, width=2)
    return image, draw


def contain(path: Path, size: tuple[int, int]) -> Image.Image:
    return ImageOps.contain(Image.open(path).convert("RGB"), size, Image.Resampling.LANCZOS)


def card(image: Image.Image, draw: ImageDraw.ImageDraw, path: Path, box: tuple[int, int, int, int],
         caption: str, outline: tuple[int, int, int]) -> None:
    x0, y0, x1, y1 = box
    draw.rounded_rectangle(box, radius=14, fill="white", outline=outline, width=3)
    rendered = contain(path, (x1 - x0 - 40, y1 - y0 - 70))
    image.paste(rendered, (x0 + (x1 - x0 - rendered.width) // 2, y0 + 18))
    draw.text((x0 + 18, y1 - 46), caption, fill=INK, font=font(17, True))


def build() -> list[Path]:
    inputs = []
    before = ROOT / "samples" / "previews" / "before-hull-survey-grid-frame.png"
    after = ROOT / "samples" / "previews" / "after-hull-survey-grid-frame.png"

    image, draw = slide("Before: the sill-rail pair did not match",
                        "shipyard/hull-survey-grid-frame · rendered catalog preview · 308 tris")
    card(image, draw, before, (64, 160, 640, 660),
         "frame-rail-0 painted, frame-rail-1 bare steel", ACCENT)
    draw.text((700, 200), "Two identical portal frames", fill=INK, font=font(24, True))
    for offset, text in enumerate([
        "The two sill rails stand on the dock and carry the same load.",
        "Only the first rail had the yard finish, so the pair",
        "rendered as one dark rail and one light rail.",
        "",
        "Corrected control: both sill rails use yardPaint.",
        "Uprights, top rails and crossbars stay structural steel.",
    ]):
        draw.text((700, 250 + offset * 34), text, fill=INK if offset < 3 else MUTED, font=font(19))
    first = ROOT / "video-inputs" / "slide-01-before.png"
    image.save(first)
    inputs.append(first)

    image, draw = slide("After: both sill rails carry the yard finish",
                        "Same geometry and 308 triangles; palette rows updated in catalog/index.json")
    card(image, draw, after, (64, 160, 640, 660),
         "frame-rail-0 and frame-rail-1 both yardPaint", (60, 140, 90))
    draw.text((700, 200), "Regression test", fill=INK, font=font(24, True))
    for offset, text in enumerate([
        "hullSurveyGridFrameMaterial.test.ts",
        "· palette: yardPaint = both sill rails",
        "· GLB: #6e817a on both rails, #b6c1c4 on steel",
        "· fails on the pre-fix source, passes after",
        "",
        "ESLint clean · shipyard gate 70/70",
        "catalog suite 222 files / 374 tests pass",
    ]):
        draw.text((700, 250 + offset * 34), text, fill=INK if offset < 4 else MUTED, font=font(19))
    second = ROOT / "video-inputs" / "slide-02-after.png"
    image.save(second)
    inputs.append(second)
    return inputs


def encode(slides: list[Path]) -> Path:
    output = ROOT / "review-demo.mp4"
    inputs: list[str] = []
    for path in slides:
        inputs += ["-loop", "1", "-t", "3.2", "-i", str(path)]
    graph = "[0:v][1:v]xfade=transition=fade:duration=0.6:offset=2.6[v]"
    subprocess.run([
        "ffmpeg", "-y", *inputs,
        "-filter_complex", graph, "-map", "[v]",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "25", "-crf", "23",
        "-movflags", "+faststart", str(output),
    ], check=True, capture_output=True)
    return output


if __name__ == "__main__":
    slides = build()
    video = encode(slides)
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration,size",
         "-of", "default=nw=1", str(video)],
        check=True, capture_output=True, text=True)
    print(probe.stdout.strip())
