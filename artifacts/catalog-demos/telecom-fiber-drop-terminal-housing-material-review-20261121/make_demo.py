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
POWDER_OLD = (49, 139, 150)
POLYMER_OLD = (49, 82, 103)
HOUSING = (61, 67, 71)
POLYMER = (21, 25, 28)
STAINLESS = (210, 219, 220)
POLE_WOOD = (122, 91, 62)
TARGET = "fiber-drop-terminal"
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
    image, draw = slide("Six rendered previews", "Telecom infrastructure · existing catalog assets")
    ids = [
        "fiber-drop-terminal",
        "fiber-route-marker",
        "rf-hazard-marker",
        "site-id-placard",
        "telecom-cable-marker-post",
        "telecom-warning-sign",
    ]
    positions = [(64, 150), (466, 150), (868, 150), (64, 400), (466, 400), (868, 400)]
    for asset_id, (x, y) in zip(ids, positions, strict=True):
        card = (x, y, x + 348, y + 230)
        outline = ACCENT if asset_id == TARGET else (218, 225, 230)
        draw.rounded_rectangle(card, radius=14, fill="white", outline=outline, width=4 if asset_id == TARGET else 2)
        rendered = contain(ROOT / "samples" / f"{asset_id}.png", (310, 175))
        image.paste(rendered, (x + (348 - rendered.width) // 2, y + 8))
        draw.text((x + 14, y + 194), asset_id, fill=INK, font=font(15, True))
    draw.text((64, 655), "Fixed: fiber-drop-terminal (powder-coated steel case, hood and face; no mount).", fill=INK, font=font(20))
    output = ROOT / "video-inputs" / "slide-01-six-preview-audit.png"
    image.save(output)
    image.save(ROOT / "preview-review-six-assets.png")
    return output


def make_before_after() -> Path:
    image, draw = slide("Before and after", "Moulded polymer housing with capped drop ports, on a stainless pole bracket")
    before = contain(ROOT / "before" / f"{TARGET}.png", (470, 470))
    after = contain(ROOT / "after" / f"{TARGET}.png", (470, 470))
    for label, rendered, x in [("BEFORE", before, 80), ("AFTER", after, 730)]:
        draw.rounded_rectangle((x - 12, 157, x + 482, 685), radius=14, fill="white", outline=(218, 225, 230), width=2)
        draw.text((x + 8, 171), label, fill=ACCENT if label == "BEFORE" else (43, 125, 86), font=font(20, True))
        image.paste(rendered, (x, 204))
    output = ROOT / "video-inputs" / "slide-02-before-after.png"
    image.save(output)
    return output


def make_material_map() -> Path:
    image, draw = slide("Material map", "A painted steel box becomes a moulded polymer terminal on a pole bracket")

    def rows(x: int, entries: list[tuple[str, str, tuple[int, int, int]]]) -> None:
        for i, (knob, parts, color) in enumerate(entries):
            y = 224 + i * 62
            draw.rectangle((x + 4, y + 4, x + 32, y + 32), fill=color, outline=(140, 155, 158))
            draw.text((x + 50, y), knob, fill=INK, font=font(18, True))
            draw.text((x + 50, y + 26), parts, fill=MUTED, font=font(15))

    draw.text((74, 180), "BEFORE", fill=ACCENT, font=font(20, True))
    rows(74, [
        ("powderCoat #318b96", "case, rain hood, front face", POWDER_OLD),
        ("polymer #315267", "6 port cylinders", POLYMER_OLD),
    ])
    draw.text((74, 424), "A fiber drop terminal is a moulded polymer", fill=INK, font=font(17))
    draw.text((74, 452), "housing. The model was a painted steel box on", fill=INK, font=font(17))
    draw.text((74, 480), "the ground, with no mount and no cable entry.", fill=INK, font=font(17))
    draw.text((690, 180), "AFTER", fill=(43, 125, 86), font=font(20, True))
    rows(690, [
        ("housing #3d4347", "chamfered housing, 6 port bosses (new control)", HOUSING),
        ("polymer #15191c", "6 dust caps, lid seam, tether gland and cable", POLYMER),
        ("stainlessSteel #d2dbdc", "bracket, 2 band straps, 4 lid screws (new)", STAINLESS),
        ("poleWood #7a5b3e", "pole section (new control)", POLE_WOOD),
    ])
    draw.text((690, 484), "300 -> 976 triangles (budget 900 -> 1100).", fill=INK, font=font(17))
    draw.text((690, 512), "400 x 150 x 190 mm housing on a 220 mm pole.", fill=INK, font=font(17))
    draw.text((690, 568), "Noted, not corrected: telecom-warning-sign panel", fill=MUTED, font=font(16))
    draw.text((690, 592), "floats 20 mm above its posts; marker posts are", fill=MUTED, font=font(16))
    draw.text((690, 616), "galvanized steel, not polymer.", fill=MUTED, font=font(16))
    output = ROOT / "video-inputs" / "slide-03-material-map.png"
    image.save(output)
    return output


def make_verification() -> Path:
    image, draw = slide("Local verification", "Software preview and exported-GLB colour regression")
    checks = [
        ("Regression", "1 focused GLB test passes after failing on the baseline source"),
        ("Geometry", "976 triangles in a 1100 budget · pole, bracket, housing stack · capped ports · tether"),
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
