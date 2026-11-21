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
PAINT = (143, 121, 94)
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
    image, draw = slide("Five rendered previews", "Shipyard racks, jigs and frames · existing catalog assets")
    ids = [
        "hull-profile-template-rack",
        "surface-prep-drying-rack",
        "modular-scaffold-bay",
        "keel-section-fit-up-jig",
        "hull-survey-grid-frame",
    ]
    positions = [(64, 162), (466, 162), (868, 162), (265, 412), (667, 412)]
    for asset_id, (x, y) in zip(ids, positions, strict=True):
        card = (x, y, x + 348, y + 215)
        outline = ACCENT if asset_id == "hull-profile-template-rack" else (218, 225, 230)
        draw.rounded_rectangle(card, radius=14, fill="white", outline=outline, width=4 if asset_id == "hull-profile-template-rack" else 2)
        rendered = contain(ROOT / "samples" / "previews" / f"{asset_id}.png", (310, 160))
        image.paste(rendered, (x + (348 - rendered.width) // 2, y + 8))
        draw.text((x + 14, y + 177), asset_id, fill=INK, font=font(17, True))
    draw.text((64, 655), "Selected mismatch: one of five identical template-rack dividers had the yard-paint finish.", fill=INK, font=font(20))
    output = ROOT / "video-inputs" / "slide-01-five-preview-audit.png"
    image.save(output)
    return output


def make_before_after() -> Path:
    image, draw = slide("Before and after", "The five identical bay dividers now share the structural steel finish")
    before = contain(ROOT / "before" / "hull-profile-template-rack.png", (470, 470))
    after = contain(ROOT / "after" / "hull-profile-template-rack.png", (470, 470))
    for label, rendered, x in [("BEFORE", before, 80), ("AFTER", after, 730)]:
        draw.rounded_rectangle((x - 12, 157, x + 482, 685), radius=14, fill="white", outline=(218, 225, 230), width=2)
        draw.text((x + 8, 171), label, fill=ACCENT if label == "BEFORE" else (43, 125, 86), font=font(20, True))
        image.paste(rendered, (x, 204))
    output = ROOT / "video-inputs" / "slide-02-before-after.png"
    image.save(output)
    return output


def make_material_map() -> Path:
    image, draw = slide("Material map", "All five dividers use the structuralSteel control")
    rows = [
        ("divider-0", "before: yardPaint · brown", PAINT),
        ("divider-1", "before: structuralSteel", STEEL),
        ("divider-2", "before: structuralSteel", STEEL),
        ("divider-3", "before: structuralSteel", STEEL),
        ("divider-4", "before: structuralSteel", STEEL),
    ]
    for i, (part, note, color) in enumerate(rows):
        y = 170 + i * 76
        draw.rounded_rectangle((74, y, 604, y + 62), radius=10, fill="white", outline=(218, 225, 230), width=2)
        draw.ellipse((91, y + 17, 119, y + 45), fill=color)
        draw.text((137, y + 8), part, fill=INK, font=font(18, True))
        draw.text((137, y + 34), note, fill=MUTED, font=font(15))
    draw.text((690, 190), "AFTER", fill=(43, 125, 86), font=font(20, True))
    draw.text((690, 242), "yardPaint", fill=INK, font=font(22, True))
    draw.text((690, 275), "Base runners only · unchanged", fill=MUTED, font=font(17))
    draw.text((690, 360), "structuralSteel", fill=INK, font=font(22, True))
    draw.text((690, 393), "divider-0 through divider-4, templates, restraint, end stop", fill=MUTED, font=font(17))
    swatch_y = 462
    for index in range(5):
        x = 694 + index * 96
        draw.rounded_rectangle((x, swatch_y, x + 72, swatch_y + 56), radius=8, fill=STEEL)
        draw.text((x + 23, swatch_y + 65), str(index), fill=INK, font=font(16, True))
    draw.text((690, 564), "Default steel finish #b6c1c4 · geometry unchanged", fill=INK, font=font(19))
    output = ROOT / "video-inputs" / "slide-03-material-map.png"
    image.save(output)
    return output


def make_verification() -> Path:
    image, draw = slide("Local verification", "Software preview and exported-GLB color regression")
    checks = [
        ("Regression", "1 focused GLB test passes after failing on the baseline source"),
        ("Geometry", "364 triangles · 1.995 × 2.15 × 1.18 m index envelope"),
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
        lines.extend([f"file '{path.resolve()}'", "duration 4"])
    lines.append(f"file '{slides[-1].resolve()}'")
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
