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
OK = (43, 125, 86)
TARGET = "turnout-track"
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
    image, draw = slide("Six rendered previews", "Railway · turnout-track (best next fix, 2026-11-27) and five railway assets not in any earlier ledger")
    ids = ["turnout-track", "straight-track", "curved-track", "rail-sleeper", "level-crossing", "tank-wagon"]
    positions = [(64 + col * 388, 150 + row * 245) for row in range(2) for col in range(3)]
    for asset_id, (x, y) in zip(ids, positions, strict=True):
        card = (x, y, x + 372, y + 228)
        outline = ACCENT if asset_id == TARGET else (218, 225, 230)
        draw.rounded_rectangle(card, radius=14, fill="white", outline=outline, width=4 if asset_id == TARGET else 2)
        rendered = contain(ROOT / "samples" / f"{asset_id}.png", (250, 190))
        image.paste(rendered, (x + (372 - rendered.width) // 2, y + 4))
        draw.text((x + 12, y + 198), asset_id, fill=INK, font=font(15, True))
    draw.text((64, 660), "Rebuilt: turnout-track (one-rail branch). Noted: curved-track sleepers along the rails, sleeper proportions.", fill=INK, font=font(17))
    output = ROOT / "video-inputs" / "slide-01-six-preview-audit.png"
    image.save(output)
    image.save(ROOT / "preview-review-six-assets.png")
    return output


def make_before_after() -> Path:
    image, draw = slide("Before and after", "Default catalog preview: two rails on both routes, switch blades, point machine, frog and check rails")
    before = contain(ROOT / "before" / f"{TARGET}.png", (470, 470))
    after = contain(ROOT / "after" / f"{TARGET}.png", (470, 470))
    for label, rendered, x in [("BEFORE", before, 80), ("AFTER", after, 730)]:
        draw.rounded_rectangle((x - 12, 157, x + 482, 685), radius=14, fill="white", outline=(218, 225, 230), width=2)
        draw.text((x + 8, 171), label, fill=ACCENT if label == "BEFORE" else OK, font=font(20, True))
        image.paste(rendered, (x, 204))
    output = ROOT / "video-inputs" / "slide-02-before-after.png"
    image.save(output)
    return output


def make_inspection() -> Path:
    image, draw = slide("Inspection views", "kernelcad render inspect · top view: one branch rail before; full switch and crossing after")
    for label, folder, x in [("BEFORE", "before", 80), ("AFTER", "after", 730)]:
        pair = Image.new("RGB", (2048, 1024), (142, 142, 142))
        pair.paste(Image.open(ROOT / "inspect" / folder / "top.png").convert("RGB"), (0, 0))
        pair.paste(Image.open(ROOT / "inspect" / folder / "iso.png").convert("RGB"), (1024, 0))
        rendered = ImageOps.contain(pair, (470, 470), Image.Resampling.LANCZOS)
        draw.rounded_rectangle((x - 12, 157, x + 482, 685), radius=14, fill="white", outline=(218, 225, 230), width=2)
        draw.text((x + 8, 171), label, fill=ACCENT if label == "BEFORE" else OK, font=font(20, True))
        image.paste(rendered, (x, 300))
    output = ROOT / "video-inputs" / "slide-03-inspection.png"
    image.save(output)
    return output


def make_part_map() -> Path:
    image, draw = slide("What changed", "Same three colour controls and presets, plus a point machine paint control; new switch and crossing")
    before = [
        "diverging route: one rail (branch-rail) only",
        "branch rail ends at y ~ 360, past ballast and sleepers",
        "no switch blades, stretcher bars or point machine",
        "frog: a box on the branch, no nose or wing rails",
        "no check rails; 6 short sleepers",
        "132 triangles",
    ]
    after = [
        "both routes: 2 rails at 180 mm gauge (concentric arcs)",
        "switch blades set for straight, 30 mm throw",
        "2 stretcher bars, point machine, drive rod under rail",
        "closure rails bend into wing rails at the frog",
        "cast frog nose, 2 check rails, 14 mm flangeways",
        "13 timbers and ballast follow the diverging track",
        "2508 triangles (budget 1800 -> 3000)",
    ]
    draw.text((74, 180), "BEFORE", fill=ACCENT, font=font(20, True))
    for i, line in enumerate(before):
        draw.text((74, 226 + i * 50), "- " + line, fill=INK, font=font(18))
    draw.text((690, 180), "AFTER", fill=OK, font=font(20, True))
    for i, line in enumerate(after):
        draw.text((690, 226 + i * 50), "- " + line, fill=INK, font=font(18))
    draw.text((74, 610), "Noted, not corrected: curved-track sleepers run along the rails; rail-sleeper is wider than long;", fill=MUTED, font=font(16))
    draw.text((74, 634), "level-crossing has no panel between the rails; straight-track gauge 168 mm vs turnout 180 mm.", fill=MUTED, font=font(16))
    output = ROOT / "video-inputs" / "slide-04-part-map.png"
    image.save(output)
    return output


def make_verification() -> Path:
    image, draw = slide("Local verification", "Software preview and exported-GLB geometry regression")
    checks = [
        ("Regression", "1 focused GLB test passes; it fails on the baseline source (no second branch rail)"),
        ("Geometry", "2508 triangles in a 3000 budget · every rail over a timber"),
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
    output = ROOT / "video-inputs" / "slide-05-verification.png"
    image.save(output)
    return output


def main() -> None:
    slides = [make_sample_sheet(), make_before_after(), make_inspection(), make_part_map(), make_verification()]
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
