#!/usr/bin/env python3
"""Build a short local review video from retained catalog evidence."""

from pathlib import Path
import subprocess

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parent
WIDTH, HEIGHT = 1280, 720
BG = (246, 248, 250)
INK = (27, 42, 54)
MUTED = (87, 105, 119)
ACCENT = (191, 119, 20)
CABINET = (224, 123, 36)
HEAD = (43, 45, 47)
LENS = (210, 58, 42)
TARGET = "vehicle-barrier-gate"
FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD_PATH if bold else FONT_PATH, size)


def slide(title: str, subtitle: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    draw.text((64, 42), title, fill=INK, font=font(34, True))
    draw.text((66, 91), subtitle, fill=MUTED, font=font(18))
    draw.line((64, 132, WIDTH - 64, 132), fill=(215, 222, 227), width=2)
    return image, draw


def contain(image_path: Path, size: tuple[int, int]) -> Image.Image:
    source = Image.open(image_path).convert("RGB")
    return ImageOps.contain(source, size, Image.Resampling.LANCZOS)


def make_sample_sheet() -> Path:
    image, draw = slide("Five rendered previews", "Recycling-facility site equipment · existing catalog assets")
    ids = [
        TARGET,
        "tyre-dropoff-rack",
        "truck-wheel-wash",
        "roller-conveyor-section",
        "walking-floor-trailer",
    ]
    positions = [(64, 162), (466, 162), (868, 162), (265, 412), (667, 412)]
    for asset_id, (x, y) in zip(ids, positions, strict=True):
        card = (x, y, x + 348, y + 215)
        outline = ACCENT if asset_id == TARGET else (218, 225, 230)
        draw.rounded_rectangle(card, radius=14, fill="white", outline=outline, width=4 if asset_id == TARGET else 2)
        rendered = contain(ROOT / "samples" / "previews" / f"{asset_id}.png", (310, 160))
        image.paste(rendered, (x + (348 - rendered.width) // 2, y + 8))
        draw.text((x + 14, y + 177), asset_id, fill=INK, font=font(15, True))
    draw.text((64, 655), "Selected defect: both photo-eye posts stood in the drive lane under the boom.", fill=INK, font=font(20))
    output = ROOT / "video-inputs" / "slide-01-five-preview-audit.png"
    image.save(output)
    image.save(ROOT / "preview-review-five-assets.png")
    return output


def make_before_after() -> Path:
    image, draw = slide("Before and after", "The photo-eye pair now stands at the lane edges and looks across the lane")
    before = contain(ROOT / "before" / f"{TARGET}.png", (470, 470))
    after = contain(ROOT / "after" / f"{TARGET}.png", (470, 470))
    for label, rendered, x in [("BEFORE", before, 80), ("AFTER", after, 730)]:
        draw.rounded_rectangle((x - 12, 157, x + 482, 685), radius=14, fill="white", outline=(218, 225, 230), width=2)
        draw.text((x + 8, 171), label, fill=ACCENT if label == "BEFORE" else (43, 125, 86), font=font(20, True))
        image.paste(rendered, (x, 204))
    output = ROOT / "video-inputs" / "slide-02-before-after.png"
    image.save(output)
    return output


def plan_view(draw: ImageDraw.ImageDraw, x0: int, y0: int, eyes: list[tuple[int, int]], beam_ok: bool) -> None:
    """Draw a top view: 1 px = 8 mm, boom along the page X axis, travel along the page Y axis."""
    def px(x: float, y: float) -> tuple[float, float]:
        return x0 + x / 8, y0 - y / 8
    lane_left, lane_right = px(260, 0)[0], px(3900, 0)[0]
    draw.rectangle((lane_left, y0 - 110, lane_right, y0 + 110), fill=(232, 236, 239))
    draw.text((lane_left + 150, y0 + 84), "drive lane (3.64 m clear)", fill=MUTED, font=font(14))
    draw.rectangle((*px(-260, 240), *px(260, -240)), fill=(138, 141, 136))
    draw.rectangle((*px(-180, 170), *px(180, -170)), fill=CABINET)
    draw.rectangle((*px(3900, 130), *px(4160, -130)), fill=(138, 141, 136))
    draw.rectangle((*px(230, 35), *px(4260, -35)), fill=(242, 240, 234), outline=(198, 45, 42), width=2)
    for x, y in eyes:
        draw.rectangle((*px(x - 55, y + 55), *px(x + 55, y - 55)), fill=HEAD)
    (ax, ay), (bx, by) = px(*eyes[0]), px(*eyes[1])
    draw.line((ax, ay, bx, by), fill=LENS if beam_ok else ACCENT, width=3)


def make_material_map() -> Path:
    image, draw = slide("Placement map", "Top view · boom closed · vehicles travel up the page")
    draw.text((74, 160), "BEFORE", fill=ACCENT, font=font(20, True))
    plan_view(draw, 120, 300, [(1130, -600), (1130, 600)], False)
    draw.text((720, 196), "Both posts 0.87 m inside the lane.", fill=INK, font=font(18))
    draw.text((720, 224), "Beam runs along the direction of travel.", fill=INK, font=font(18))
    draw.text((74, 420), "AFTER", fill=(43, 125, 86), font=font(20, True))
    plan_view(draw, 120, 560, [(420, -300), (4030, -300)], True)
    draw.text((720, 456), "Posts at the plinth and the rest post.", fill=INK, font=font(18))
    draw.text((720, 484), "Beam crosses the lane 0.3 m ahead of the boom.", fill=INK, font=font(18))
    draw.text((720, 512), "1,050 triangles · depth 1.31 m -> 0.595 m", fill=INK, font=font(18))
    draw.text((74, 684), "Parts moved: eye-post, eye-head, eye-lens (0 and 1). Colours and controls unchanged.", fill=MUTED, font=font(16))
    output = ROOT / "video-inputs" / "slide-03-placement-map.png"
    image.save(output)
    return output


def make_verification() -> Path:
    image, draw = slide("Local verification", "Software preview and exported-GLB bounds regression")
    checks = [
        ("Regression", "1 focused GLB test passes after failing on the baseline source"),
        ("Geometry", "1,050 triangles · 4.52 × 1.266 × 0.595 m index envelope"),
        ("Catalog", "Preview re-rendered · generated index row refreshed"),
        ("Scope", "No deployment, simulation, safety or compliance approval"),
    ]
    for i, (heading, body) in enumerate(checks):
        y = 174 + i * 112
        draw.rounded_rectangle((78, y, WIDTH - 78, y + 82), radius=12, fill="white", outline=(218, 225, 230), width=2)
        draw.ellipse((102, y + 25, 132, y + 55), fill=(43, 125, 86) if i < 3 else ACCENT)
        draw.text((158, y + 12), heading, fill=INK, font=font(20, True))
        draw.text((346, y + 18), body, fill=MUTED, font=font(17))
    draw.text((80, 650), "Branch not deployed. Results describe local source and software-rendered evidence only.", fill=INK, font=font(18, True))
    output = ROOT / "video-inputs" / "slide-04-verification.png"
    image.save(output)
    return output


def main() -> None:
    slides = [make_sample_sheet(), make_before_after(), make_material_map(), make_verification()]
    concat_file = ROOT / "video-inputs" / "ffmpeg-concat.txt"
    lines = []
    for path in slides:
        lines.extend([f"file '{path.name}'", "duration 4"])
    lines.append(f"file '{slides[-1].name}'")
    concat_file.write_text("\n".join(lines) + "\n", encoding="utf-8")
    output = ROOT / "review-demo.mp4"
    subprocess.run(
        [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_file),
            "-vf", "fps=24,format=yuv420p", "-c:v", "libx264", "-preset", "medium",
            "-crf", "20", "-movflags", "+faststart", str(output),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    print(f"wrote {output}")


if __name__ == "__main__":
    main()
