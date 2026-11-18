from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


BUNDLE = Path(__file__).resolve().parents[1]
DEMO = Path(__file__).resolve().parent
FRAMES = DEMO / "frames"
FRAMES.mkdir(parents=True, exist_ok=True)
W, H = 1280, 720
BG = "#0d1723"
PANEL = "#162536"
INK = "#f1f5f9"
MUTED = "#b6c5d4"
ACCENT = "#62c3ad"
GREEN = "#2f6f4a"
STEEL = "#58646c"

FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")
FONT_REG = FONT_DIR / "DejaVuSans.ttf"
FONT_BOLD = FONT_DIR / "DejaVuSans-Bold.ttf"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_BOLD if bold else FONT_REG), size)


def new_slide(title: str, kicker: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((44, 32, W - 44, H - 32), radius=26, fill=PANEL)
    draw.text((82, 62), kicker.upper(), font=font(15, True), fill=ACCENT)
    draw.text((82, 94), title, font=font(34, True), fill=INK)
    return image, draw


def contain(image: Image.Image, bounds: tuple[int, int, int, int], bg: str = "#f5f7f8") -> Image.Image:
    x0, y0, x1, y1 = bounds
    tile = Image.new("RGB", (x1 - x0, y1 - y0), bg)
    source = image.convert("RGB")
    source.thumbnail((tile.width, tile.height), Image.Resampling.LANCZOS)
    tile.paste(source, ((tile.width - source.width) // 2, (tile.height - source.height) // 2))
    return tile


def footer(draw: ImageDraw.ImageDraw, text: str) -> None:
    draw.text((82, 656), text, font=font(15), fill=MUTED)


def audit_slide() -> Image.Image:
    image, draw = new_slide("Five mining previews reviewed", "Semantic audit · no open-target overlap")
    names = [
        ("belt-magnet-separator", "Recognizable"),
        ("crusher-discharge-conveyor", "Material review"),
        ("flotation-cell-bank", "Recognizable"),
        ("mine-sump-pump", "Recognizable"),
        ("radial-stacker", "Recognizable"),
    ]
    left, gap, card_w = 82, 18, 210
    for index, (asset, verdict) in enumerate(names):
        x = left + index * (card_w + gap)
        draw.rounded_rectangle((x, 180, x + card_w, 560), radius=14, fill="#f5f7f8")
        preview = Image.open(BUNDLE / "samples" / f"{asset}.png")
        image.paste(contain(preview, (0, 0, card_w - 16, 250)), (x + 8, 190))
        if asset == "crusher-discharge-conveyor":
            draw.multiline_text((x + 14, 462), "crusher discharge\nconveyor", font=font(13, True), spacing=2, fill="#213247")
            verdict_y = 502
        else:
            draw.text((x + 14, 462), asset.replace("-", " "), font=font(14, True), fill="#213247")
            verdict_y = 492
        draw.text((x + 14, verdict_y), verdict, font=font(14), fill="#526174")
        draw.text((x + 14, 532), "public preview · 200 OK", font=font(11), fill="#69798a")
    footer(draw, "Issue and pull request paths checked before selecting the five assets.")
    return image


def overview_slide() -> Image.Image:
    image, draw = new_slide("Crusher discharge conveyor", "Default catalog preview · before / after")
    before = Image.open(BUNDLE / "before" / "crusher-discharge-conveyor.png")
    repo_root = BUNDLE.parents[2]
    after = Image.open(repo_root / "catalog" / "kits" / "mining" / "previews" / "crusher-discharge-conveyor.png")
    for x, label, preview in [(82, "Before", before), (658, "After · preview regenerated", after)]:
        draw.rounded_rectangle((x, 168, x + 540, 560), radius=14, fill="#f5f7f8")
        image.paste(contain(preview, (0, 0, 520, 335)), (x + 10, 180))
        draw.text((x + 20, 520), label, font=font(17, True), fill="#213247")
    draw.text((82, 582), "The default covered belt masks most carry idlers; a focused part view is used for the material comparison.", font=font(16), fill=INK)
    footer(draw, "The overview still reads as an inclined ore conveyor; its 3,456-triangle geometry is unchanged.")
    return image


def detail_slide() -> Image.Image:
    image, draw = new_slide("The mismatch was on the rollers", "Focused impact idler set · same geometry")
    for x, label, path, chip, role in [
        (82, "Before", BUNDLE / "focused" / "before-idler-set.png", GREEN, "Drive paint · #2F6F4A"),
        (658, "After", BUNDLE / "focused" / "after-idler-set.png", STEEL, "Frame steel · #58646C"),
    ]:
        draw.rounded_rectangle((x, 166, x + 540, 568), radius=16, fill="#f5f7f8")
        view = Image.open(path)
        image.paste(contain(view, (0, 0, 520, 330)), (x + 10, 174))
        draw.text((x + 20, 525), label, font=font(18, True), fill="#213247")
        draw.ellipse((x + 112, 530, x + 132, 550), fill=chip)
        draw.text((x + 142, 528), role, font=font(16), fill="#213247")
    draw.text((82, 588), "All 46 troughing and return roller shells now use the existing frame-steel finish.", font=font(17, True), fill=INK)
    footer(draw, "The drive, chute and belt-cover paint assignments remain unchanged.")
    return image


def result_slide() -> Image.Image:
    image, draw = new_slide("Material role corrected and checked", "Native kernelCAD source · local verification")
    metrics = [
        (82, "46 / 46", "idler roller parts use frame steel"),
        (480, "3,456", "triangles · budget 4,200 · unchanged"),
        (878, "4 / 4", "painted equipment roles remain green"),
    ]
    for x, value, label in metrics:
        draw.rounded_rectangle((x, 194, x + 340, 370), radius=18, fill="#20364b")
        draw.text((x + 26, 225), value, font=font(40, True), fill=ACCENT)
        draw.text((x + 26, 292), label, font=font(16), fill=INK)
    verification = json.loads((BUNDLE / "verification" / "run-results.json").read_text())
    checks = [
        ("Focused GLB regression", verification["focusedTest"]),
        ("Mining lint", verification["lint"]),
        ("Catalog integration suite", verification["catalogIntegration"]),
        ("Mining quality gate", verification["kitQuality"]),
        ("Global quality gate", verification["globalQuality"]),
        ("Generated catalog index", verification["indexCheck"]),
    ]
    for row, (label, status) in enumerate(checks):
        y = 412 + row * 31
        draw.text((110, y), label, font=font(16), fill=INK)
        status_font = font(15, True)
        status_width = draw.textbbox((0, 0), status, font=status_font)[2]
        draw.text((1188 - status_width, y), status, font=status_font, fill=ACCENT if status.startswith("PASS") else "#f1b36f")
    footer(draw, "Software-rendered source review only · no deployment, simulation, or hardware acceptance claimed.")
    return image


frames = [audit_slide(), overview_slide(), detail_slide(), result_slide()]
for index, frame in enumerate(frames, start=1):
    frame.save(FRAMES / f"{index:02d}-review.png", optimize=True)
durations = [4, 4, 6, 6]

settings = {
    "asset": "mining/crusher-discharge-conveyor",
    "reviewedAssets": [
        "mining/belt-magnet-separator",
        "mining/crusher-discharge-conveyor",
        "mining/flotation-cell-bank",
        "mining/mine-sump-pump",
        "mining/radial-stacker",
    ],
    "focusedParts": sorted([
        "impact-idler-0-centre",
        "impact-idler-0-wing-0",
        "impact-idler-0-wing-1",
        "impact-idler-0-frame",
    ]),
    "resolution": [W, H],
    "frameDurationSeconds": durations,
    "targetDurationSeconds": 20,
    "fps": 24,
    "codec": "libx264",
    "preset": "medium",
    "crf": 20,
    "pixelFormat": "yuv420p",
    "rendering": "CPU software rasterization of kernelCAD-exported GLB triangles",
    "note": "Local review artifact; no deployment, simulation, or hardware acceptance.",
}
(DEMO / "demo-settings.json").write_text(json.dumps(settings, indent=2) + "\n")
