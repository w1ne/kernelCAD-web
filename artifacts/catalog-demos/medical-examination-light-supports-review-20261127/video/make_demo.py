#!/usr/bin/env python3
"""Build the retained short review video from the actual catalog previews."""
from pathlib import Path
import subprocess

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent
BUNDLE = ROOT.parent
WIDTH, HEIGHT = 1280, 720
BG = (246, 248, 250)
INK = (29, 43, 54)
MUTED = (83, 101, 116)
ACCENT = (183, 91, 42)
OK = (43, 125, 86)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

def font(size: int, bold: bool = False):
    return ImageFont.truetype(BOLD if bold else FONT, size)

def slide(title: str, subtitle: str):
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    draw.text((58, 36), title, fill=INK, font=font(32, True))
    draw.text((60, 83), subtitle, fill=MUTED, font=font(17))
    draw.line((60, 120, WIDTH - 60, 120), fill=(215, 222, 227), width=2)
    return image, draw

def contain(path: Path, size: tuple[int, int]) -> Image.Image:
    return ImageOps.contain(Image.open(path).convert("RGB"), size, Image.Resampling.LANCZOS)

def make_comparison() -> Path:
    image, draw = slide("Examination light: before and after", "The same CC0 catalog asset; only support geometry changed")
    for label, file, x, color in [
        ("BEFORE", "before/examination-light.png", 88, ACCENT),
        ("AFTER", "after/examination-light.png", 692, OK),
    ]:
        draw.rounded_rectangle((x - 14, 143, x + 510, 684), radius=14, fill="white", outline=(218, 225, 230), width=2)
        draw.text((x + 8, 153), label, fill=color, font=font(18, True))
        rendered = contain(BUNDLE / file, (470, 450))
        image.paste(rendered, (x + (490 - rendered.width) // 2, 183))
    draw.text((92, 656), "Column gap below arm", fill=ACCENT, font=font(15, True))
    draw.text((696, 656), "Mast and lamp neck connect", fill=OK, font=font(15, True))
    output = ROOT / "frames" / "slide-01-before-after.png"
    image.save(output)
    return output

def make_geometry() -> Path:
    image, draw = slide("Two support joints corrected", "The authored model is rerun at three scales; shared interior points prove overlap")
    rendered = contain(BUNDLE / "after/examination-light.png", (440, 470))
    image.paste(rendered, (72, 156 + (470 - rendered.height) // 2))
    rows = [
        ("Mast → arm", "Column extended 24 mm; overlaps arm at z = 810 mm"),
        ("Arm → lamp head", "Angled neck ends inside the head housing"),
        ("Scale sweep", "0.65 · 1.00 · 1.35; all three joints checked"),
        ("Materials", "Steel, rubber, anodized aluminium, opal glass"),
    ]
    for i, (heading, body) in enumerate(rows):
        y = 180 + i * 94
        draw.rounded_rectangle((560, y, 1190, y + 70), radius=12, fill="white", outline=(218, 225, 230), width=2)
        draw.text((584, y + 10), heading, fill=INK, font=font(18, True))
        draw.text((584, y + 38), body, fill=MUTED, font=font(14))
    output = ROOT / "frames" / "slide-02-support-geometry.png"
    image.save(output)
    return output

def make_verification() -> Path:
    image, draw = slide("Local verification", "Source → preview render → exported-GLB support test")
    checks = [
        ("Geometry", "3 support intersections at scales 0.65, 1.0 and 1.35"),
        ("Catalog", "368 triangles / 450 budget; source hash indexed"),
        ("Preview", "Before and after images generated from the authored source"),
        ("Boundary", "Local result only · not deployed · no hardware acceptance"),
    ]
    for i, (heading, body) in enumerate(checks):
        y = 162 + i * 105
        draw.rounded_rectangle((90, y, 1190, y + 78), radius=12, fill="white", outline=(218, 225, 230), width=2)
        draw.ellipse((112, y + 25, 140, y + 53), fill=OK if i < 3 else ACCENT)
        draw.text((162, y + 12), heading, fill=INK, font=font(18, True))
        draw.text((380, y + 19), body, fill=MUTED, font=font(16))
    output = ROOT / "frames" / "slide-03-verification.png"
    image.save(output)
    return output

def main() -> None:
    slides = [make_comparison(), make_geometry(), make_verification()]
    concat = ROOT / "frames" / "input.ffconcat"
    lines = []
    for path in slides:
        lines.extend([f"file '{path.name}'", "duration 5"])
    lines.append(f"file '{slides[-1].name}'")
    concat.write_text("\n".join(lines) + "\n", encoding="utf-8")
    output = ROOT / "review-demo.mp4"
    subprocess.run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat),
        "-vf", "fps=24,format=yuv420p", "-c:v", "libx264", "-preset", "medium",
        "-crf", "21", "-movflags", "+faststart", str(output),
    ], cwd=ROOT / "frames", check=True, capture_output=True, text=True)
    print(output)

if __name__ == "__main__":
    main()
