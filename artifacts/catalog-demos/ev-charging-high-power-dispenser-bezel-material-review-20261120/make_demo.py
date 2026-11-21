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
POWDER = (57, 127, 144)
BEZEL = (31, 36, 39)
GLASS = (121, 207, 218)
TARGET = "high-power-charge-dispenser"
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
    image, draw = slide("Five rendered previews", "EV charging site equipment · existing catalog assets")
    ids = [
        TARGET,
        "dual-connector-dc-dispenser",
        "ev-service-disconnect-cabinet",
        "ev-site-distribution-panel",
        "outdoor-charger-switchboard",
    ]
    positions = [(64, 162), (466, 162), (868, 162), (265, 412), (667, 412)]
    for asset_id, (x, y) in zip(ids, positions, strict=True):
        card = (x, y, x + 348, y + 215)
        outline = ACCENT if asset_id == TARGET else (218, 225, 230)
        draw.rounded_rectangle(card, radius=14, fill="white", outline=outline, width=4 if asset_id == TARGET else 2)
        rendered = contain(ROOT / "samples" / f"{asset_id}.png", (310, 160))
        image.paste(rendered, (x + (348 - rendered.width) // 2, y + 8))
        draw.text((x + 14, y + 177), asset_id, fill=INK, font=font(15, True))
    draw.text((64, 655), "Selected mismatch: the status-screen bezel frame is coloured as display glass.", fill=INK, font=font(20))
    output = ROOT / "video-inputs" / "slide-01-five-preview-audit.png"
    image.save(output)
    image.save(ROOT / "preview-review-five-assets.png")
    return output


def make_before_after() -> Path:
    image, draw = slide("Before and after", "The glass-coloured screen frame becomes a black polymer bezel")
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
    image, draw = slide("Material map", "The bezel leaves the display glass control and gets a screen bezel polymer control")

    def rows(x: int, entries: list[tuple[str, str, tuple[int, int, int]]]) -> None:
        for i, (knob, parts, color) in enumerate(entries):
            y = 224 + i * 62
            draw.rectangle((x + 4, y + 4, x + 32, y + 32), fill=color, outline=(140, 155, 158))
            draw.text((x + 50, y), knob, fill=INK, font=font(18, True))
            draw.text((x + 50, y + 26), parts, fill=MUTED, font=font(15))

    draw.text((74, 180), "BEFORE", fill=ACCENT, font=font(20, True))
    rows(74, [
        ("displayGlass #79cfda", "display-bezel and display-window", GLASS),
    ])
    draw.text((74, 440), "The 350 x 326 mm frame and the 296 x 240 mm", fill=INK, font=font(17))
    draw.text((74, 468), "glass were one colour, so the screen read as", fill=INK, font=font(17))
    draw.text((74, 496), "one pale panel on the dispenser front.", fill=INK, font=font(17))
    draw.text((690, 180), "AFTER", fill=(43, 125, 86), font=font(20, True))
    rows(690, [
        ("bezelPolymer #1f2427", "display-bezel (27 mm side frame)", BEZEL),
        ("displayGlass #79cfda", "display-window, 5.5 mm proud of the bezel", GLASS),
        ("powderCoat #397f90", "enclosure, seams, plinth, visor (unchanged)", POWDER),
    ])
    draw.text((690, 440), "376 triangles. The bezel now sits on the", fill=INK, font=font(17))
    draw.text((690, 468), "enclosure (was 1 mm clear). Presets set it.", fill=INK, font=font(17))
    draw.text((690, 570), "Noted, not corrected: connector cradles are bare", fill=MUTED, font=font(16))
    draw.text((690, 594), "stubs; cables are straight rods ending in mid-air.", fill=MUTED, font=font(16))
    output = ROOT / "video-inputs" / "slide-03-material-map.png"
    image.save(output)
    return output


def make_verification() -> Path:
    image, draw = slide("Local verification", "Software preview and exported-GLB colour and framing regression")
    checks = [
        ("Regression", "1 focused GLB test passes after failing on the baseline source"),
        ("Geometry", "376 triangles in a 2,400 budget · bezel seated on the enclosure"),
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
