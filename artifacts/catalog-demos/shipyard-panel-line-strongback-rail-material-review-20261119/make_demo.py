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
STEEL = (182, 193, 196)
PAINT = (120, 134, 125)
YELLOW = (239, 185, 52)
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
    image, draw = slide("Five rendered previews", "Shipyard fixtures and support stands · existing catalog assets")
    ids = [
        "panel-line-strongback",
        "stern-section-support-frame",
        "bow-section-support-stand",
        "ship-plate-staging-pallet",
        "low-profile-material-skid",
    ]
    positions = [(64, 162), (466, 162), (868, 162), (265, 412), (667, 412)]
    for asset_id, (x, y) in zip(ids, positions, strict=True):
        card = (x, y, x + 348, y + 215)
        outline = ACCENT if asset_id == "panel-line-strongback" else (218, 225, 230)
        draw.rounded_rectangle(card, radius=14, fill="white", outline=outline, width=4 if asset_id == "panel-line-strongback" else 2)
        rendered = contain(ROOT / "samples" / "previews" / f"{asset_id}.png", (310, 160))
        image.paste(rendered, (x + (348 - rendered.width) // 2, y + 8))
        draw.text((x + 14, y + 177), asset_id, fill=INK, font=font(15, True))
    draw.text((64, 655), "Selected mismatch: one of the two longitudinal rails had the structural-steel finish.", fill=INK, font=font(20))
    output = ROOT / "video-inputs" / "slide-01-five-preview-audit.png"
    image.save(output)
    return output


def make_before_after() -> Path:
    image, draw = slide("Before and after", "Both longitudinal rails of the strongback now share the yard finish")
    before = contain(ROOT / "before" / "panel-line-strongback.png", (470, 470))
    after = contain(ROOT / "after" / "panel-line-strongback.png", (470, 470))
    for label, rendered, x in [("BEFORE", before, 80), ("AFTER", after, 730)]:
        draw.rounded_rectangle((x - 12, 157, x + 482, 685), radius=14, fill="white", outline=(218, 225, 230), width=2)
        draw.text((x + 8, 171), label, fill=ACCENT if label == "BEFORE" else (43, 125, 86), font=font(20, True))
        image.paste(rendered, (x, 204))
    output = ROOT / "video-inputs" / "slide-02-before-after.png"
    image.save(output)
    return output


def make_material_map() -> Path:
    image, draw = slide("Material map", "Both longitudinal rails use the yardPaint control")
    rows = [
        ("longitudinal-rail-0", "before: yardPaint · grey-green", PAINT),
        ("longitudinal-rail-1", "before: structuralSteel · pale grey", STEEL),
    ]
    for i, (part, note, color) in enumerate(rows):
        y = 190 + i * 96
        draw.rounded_rectangle((74, y, 604, y + 72), radius=10, fill="white", outline=(218, 225, 230), width=2)
        draw.ellipse((91, y + 22, 119, y + 50), fill=color)
        draw.text((137, y + 12), part, fill=INK, font=font(18, True))
        draw.text((137, y + 40), note, fill=MUTED, font=font(15))
    draw.text((74, 420), "Unchanged controls", fill=INK, font=font(20, True))
    for i, (name, note, color) in enumerate([
        ("structuralSteel", "five cross rails, four datum feet", STEEL),
        ("safetyMarking", "six clamp blocks", YELLOW),
    ]):
        y = 462 + i * 62
        draw.ellipse((91, y + 4, 119, y + 32), fill=color)
        draw.text((137, y), name, fill=INK, font=font(18, True))
        draw.text((137, y + 26), note, fill=MUTED, font=font(15))
    draw.text((690, 190), "AFTER", fill=(43, 125, 86), font=font(20, True))
    draw.text((690, 242), "yardPaint", fill=INK, font=font(22, True))
    draw.text((690, 275), "longitudinal-rail-0 and longitudinal-rail-1", fill=MUTED, font=font(17))
    for index, label in enumerate(["rail-0", "rail-1"]):
        x = 694 + index * 150
        draw.rounded_rectangle((x, 330, x + 110, 400), radius=8, fill=PAINT)
        draw.text((x + 6, 410), label, fill=INK, font=font(16, True))
    draw.text((690, 480), "Default yard finish #78867d", fill=INK, font=font(19))
    draw.text((690, 514), "Geometry unchanged", fill=INK, font=font(19))
    draw.text((690, 560), "Noted, not corrected: the description names end", fill=MUTED, font=font(16))
    draw.text((690, 584), "stops, but the model has none.", fill=MUTED, font=font(16))
    output = ROOT / "video-inputs" / "slide-03-material-map.png"
    image.save(output)
    return output


def make_verification() -> Path:
    image, draw = slide("Local verification", "Software preview and exported-GLB color regression")
    checks = [
        ("Regression", "1 focused GLB test passes after failing on the baseline source"),
        ("Geometry", "476 triangles · 3 × 0.54 × 1.52 m index envelope"),
        ("Catalog", "Preview re-rendered · generated index row refreshed"),
        ("Scope", "No deployment, simulation, load test or hardware acceptance"),
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
