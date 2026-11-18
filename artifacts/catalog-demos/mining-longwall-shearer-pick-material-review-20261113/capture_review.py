#!/usr/bin/env python3
"""Build a short local review video from the checked-in kernelCAD previews."""

from pathlib import Path
import subprocess

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
FRAMES = ROOT / "frames"
WIDTH, HEIGHT = 1280, 720
BG = "#eef3f8"
INK = "#203047"
MUTED = "#53657c"


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def slide(title: str, subtitle: str = "") -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    draw.text((64, 40), title, fill=INK, font=font(36))
    if subtitle:
        draw.text((66, 92), subtitle, fill=MUTED, font=font(20))
    draw.line((64, 132, WIDTH - 64, 132), fill="#c8d3df", width=2)
    return image, draw


def fit_image(path: Path, size: tuple[int, int]) -> Image.Image:
    image = Image.open(path).convert("RGB")
    image.thumbnail(size, Image.Resampling.LANCZOS)
    return image


def label(draw: ImageDraw.ImageDraw, text: str, box: tuple[int, int, int, int]) -> None:
    x0, y0, x1, _ = box
    draw.text((x0 + 8, y0 + 8), text, fill=INK, font=font(17))


def gallery_frame() -> Image.Image:
    image, draw = slide("Five mining preview checks", "Branch renders · sample includes the target plus four other machines")
    items = [
        ("longwall-shearer · target", ROOT / "before/longwall-shearer.png"),
        ("mine ventilation fan station", ROOT / "samples/mine-ventilation-fan.png"),
        ("spiral concentrator bank", ROOT / "samples/spiral-concentrator.png"),
        ("gyratory crusher station", ROOT / "samples/gyratory-crusher-station.png"),
        ("jaw crusher module", ROOT / "samples/jaw-crusher-module.png"),
    ]
    boxes = [(64, 150, 432, 402), (456, 150, 824, 402), (848, 150, 1216, 402),
             (260, 420, 628, 672), (652, 420, 1020, 672)]
    for (caption, path), box in zip(items, boxes):
        draw.rounded_rectangle(box, radius=12, fill="#ffffff", outline="#cad5e1", width=2)
        label(draw, caption, box)
        preview = fit_image(path, (box[2] - box[0] - 24, box[3] - box[1] - 52))
        x = box[0] + (box[2] - box[0] - preview.width) // 2
        y = box[1] + 38 + (box[3] - box[1] - 48 - preview.height) // 2
        image.paste(preview, (x, y))
    return image


def compare_frame(before: Path, after: Path, title: str, note: str) -> Image.Image:
    image, draw = slide(title, note)
    panels = [(64, 158, 616, 656), (664, 158, 1216, 656)]
    for caption, path, box in zip(("Before", "After"), (before, after), panels):
        draw.rounded_rectangle(box, radius=12, fill="#ffffff", outline="#cad5e1", width=2)
        draw.text((box[0] + 18, box[1] + 12), caption, fill=INK, font=font(20))
        preview = fit_image(path, (box[2] - box[0] - 28, box[3] - box[1] - 56))
        x = box[0] + (box[2] - box[0] - preview.width) // 2
        y = box[1] + 44 + (box[3] - box[1] - 52 - preview.height) // 2
        image.paste(preview, (x, y))
    return image


def assignment_frame() -> Image.Image:
    image, draw = slide("Material assignment", "The existing drumSteel control already names drum and pick steel")
    blocks = [
        ("Before", "vane-pick + face-pick loops", ".color(steelwork)", "Conveyor / shield steel"),
        ("After", "vane-pick + face-pick loops", ".color(drumSteel)", "Drum / pick steel"),
    ]
    for index, (heading, scope, assignment, description) in enumerate(blocks):
        y = 178 + index * 178
        draw.rounded_rectangle((80, y, 1200, y + 140), radius=14, fill="#ffffff", outline="#cad5e1", width=2)
        draw.text((112, y + 18), heading, fill=INK, font=font(25))
        draw.text((112, y + 59), scope, fill=MUTED, font=font(19))
        draw.text((620, y + 22), assignment, fill="#12604e" if index else "#9a432e", font=font(27))
        draw.text((620, y + 66), description, fill=MUTED, font=font(19))
    draw.text((86, 563), "Then: renderCatalogPreviews.ts longwall-shearer → buildAssetCatalog.ts", fill=INK, font=font(20))
    draw.text((86, 610), "No geometry, parameter, preset or triangle-budget change.", fill=MUTED, font=font(19))
    return image


def verification_frame() -> Image.Image:
    image, draw = slide("Local verification", "The previews show authored color mapping; they do not show process or equipment acceptance.")
    lines = [
        "✓ Focused exported-GLB regression: 40 cutter picks map to drumSteel",
        "✓ Mining-kit ESLint clean",
        "✓ Catalog integration: 53 files, 86 tests passed across retained runs",
        "✓ Target preview regenerated; catalog index rebuilt from source",
        "PR #1258 baseline was green before this edit; this branch is not deployed",
    ]
    y = 188
    for line in lines:
        draw.text((88, y), line, fill=INK, font=font(24))
        y += 66
    draw.text((88, 570), "Local catalog source + software-rendered GLB. No simulation or hardware claim.", fill=MUTED, font=font(18))
    return image


def main() -> None:
    FRAMES.mkdir(parents=True, exist_ok=True)
    slides = [
        slide("Longwall shearer: cutter-pick material review", "Semantic audit of five mining previews · one material mapping correction")[0],
        gallery_frame(),
        assignment_frame(),
        compare_frame(ROOT / "before/longwall-shearer.png", ROOT / "after/longwall-shearer.png",
                      "Branch preview before and after", "Geometry unchanged · cutter picks now use the existing drum/pick steel control"),
        compare_frame(ROOT / "before/pick-detail.png", ROOT / "after/pick-detail.png",
                      "Cutter drum detail", "Detail render isolates the authored drum, vanes and pick parts"),
        verification_frame(),
    ]
    for index, frame in enumerate(slides, start=1):
        frame.save(FRAMES / f"slide-{index:02d}.png")

    concat = ROOT / "video-slides.txt"
    concat.write_text("".join(f"file '{(FRAMES / f'slide-{index:02d}.png').as_posix()}'\nduration 3\n" for index in range(1, len(slides) + 1))
                       + f"file '{(FRAMES / f'slide-{len(slides):02d}.png').as_posix()}'\n", encoding="utf-8")
    output = ROOT / "mining-longwall-shearer-pick-material-review.mp4"
    command = ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat), "-vf", "fps=30,format=yuv420p",
               "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-movflags", "+faststart", str(output)]
    subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    print(f"wrote {output.relative_to(ROOT)} ({len(slides)} slides, {len(slides) * 3} seconds)")


if __name__ == "__main__":
    main()
