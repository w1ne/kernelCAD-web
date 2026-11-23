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
PANEL = (124, 133, 137)
WATER_OLD = (159, 198, 216)
GALVANIZED = (167, 175, 177)
VALVE_IRON = (60, 65, 68)
HANDWHEEL = (200, 50, 43)
TARGET = "trommel-screen"
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
    image, draw = slide("Eight rendered previews", "Mining · existing catalog assets not in any audit ledger")
    ids = [
        "trommel-screen",
        "mill-feed-chute",
        "ore-pass-grizzly",
        "roof-bolting-rig",
        "run-of-mine-hopper",
        "metal-detector-arch",
        "spiral-concentrator",
        "thickener-bridge",
    ]
    positions = [(64 + col * 292, 150 + row * 245) for row in range(2) for col in range(4)]
    for asset_id, (x, y) in zip(ids, positions, strict=True):
        card = (x, y, x + 276, y + 228)
        outline = ACCENT if asset_id == TARGET else (218, 225, 230)
        draw.rounded_rectangle(card, radius=14, fill="white", outline=outline, width=4 if asset_id == TARGET else 2)
        rendered = contain(ROOT / "samples" / f"{asset_id}.png", (250, 185))
        image.paste(rendered, (x + (276 - rendered.width) // 2, y + 6))
        draw.text((x + 12, y + 198), asset_id, fill=INK, font=font(15, True))
    draw.text((64, 660), "Fixed: trommel-screen (spray pipe on the screen-panel control; supply pipe in water colour).", fill=INK, font=font(19))
    output = ROOT / "video-inputs" / "slide-01-eight-preview-audit.png"
    image.save(output)
    image.save(ROOT / "preview-review-eight-assets.png")
    return output


def make_before_after() -> Path:
    image, draw = slide("Before and after", "Default catalog preview: galvanized spray bar, elbow over the discharge end")
    before = contain(ROOT / "before" / f"{TARGET}.png", (470, 470))
    after = contain(ROOT / "after" / f"{TARGET}.png", (470, 470))
    for label, rendered, x in [("BEFORE", before, 80), ("AFTER", after, 730)]:
        draw.rounded_rectangle((x - 12, 157, x + 482, 685), radius=14, fill="white", outline=(218, 225, 230), width=2)
        draw.text((x + 8, 171), label, fill=ACCENT if label == "BEFORE" else (43, 125, 86), font=font(20, True))
        image.paste(rendered, (x, 204))
    output = ROOT / "video-inputs" / "slide-02-before-after.png"
    image.save(output)
    return output


def make_inspection() -> Path:
    image, draw = slide("Inspection view from the right", "kernelcad render inspect, cropped to the discharge end · supply, riser and valve")
    for label, folder, x in [("BEFORE", "before", 80), ("AFTER", "after", 730)]:
        # Crop the 1024 px view to the discharge end, where the supply, riser and valve are.
        view = Image.open(ROOT / "inspect" / folder / "right.png").convert("RGB").crop((560, 300, 980, 720))
        rendered = ImageOps.contain(view, (470, 470), Image.Resampling.LANCZOS)
        draw.rounded_rectangle((x - 12, 157, x + 482, 685), radius=14, fill="white", outline=(218, 225, 230), width=2)
        draw.text((x + 8, 171), label, fill=ACCENT if label == "BEFORE" else (43, 125, 86), font=font(20, True))
        image.paste(rendered, (x, 204))
    output = ROOT / "video-inputs" / "slide-03-inspection-right.png"
    image.save(output)
    return output


def make_material_map() -> Path:
    image, draw = slide("Material map", "One galvanized pipe run; the screen-panel control drives the panels only")

    def rows(x: int, entries: list[tuple[str, str, tuple[int, int, int]]]) -> None:
        for i, (knob, parts, color) in enumerate(entries):
            y = 224 + i * 62
            draw.rectangle((x + 4, y + 4, x + 32, y + 32), fill=color, outline=(140, 155, 158))
            draw.text((x + 50, y), knob, fill=INK, font=font(18, True))
            draw.text((x + 50, y + 26), parts, fill=MUTED, font=font(15))

    draw.text((74, 180), "BEFORE", fill=ACCENT, font=font(20, True))
    rows(74, [
        ("stainlessSteel #7c8589", "\"Screen panels\": panels, spray bar, 6 nozzles", PANEL),
        ("water #9fc6d8", "spray supply pipe (diagonal, ends in the air)", WATER_OLD),
    ])
    draw.text((74, 424), "A panel colour change recoloured the water", fill=INK, font=font(17))
    draw.text((74, 452), "pipe, and the supply pipe was drawn in the", fill=INK, font=font(17))
    draw.text((74, 480), "colour of water: two finishes on one pipe run.", fill=INK, font=font(17))
    draw.text((690, 180), "AFTER", fill=(43, 125, 86), font=font(20, True))
    rows(690, [
        ("stainlessSteel #7c8589", "\"Screen panels\": screen panels only", PANEL),
        ("galvanized #a7afb1", "bar, 6 nozzles, supply, elbow, riser, flange", GALVANIZED),
        ("valveIron #3c4144", "gate valve body and stem (new)", VALVE_IRON),
        ("handwheel #c8322b", "valve handwheel (new)", HANDWHEEL),
    ])
    draw.text((690, 484), "2160 -> 2352 triangles (budget 3200).", fill=INK, font=font(17))
    draw.text((690, 512), "Riser stands on the discharge plinth.", fill=INK, font=font(17))
    draw.text((690, 568), "Noted, not corrected: mill-feed-chute belt shares", fill=MUTED, font=font(16))
    draw.text((690, 592), "the wear-liner rubber control; screen panels", fill=MUTED, font=font(16))
    draw.text((690, 616), "are a plain cylinder with no perforation.", fill=MUTED, font=font(16))
    output = ROOT / "video-inputs" / "slide-04-material-map.png"
    image.save(output)
    return output


def make_verification() -> Path:
    image, draw = slide("Local verification", "Software preview and exported-GLB colour regression")
    checks = [
        ("Regression", "1 focused GLB test passes after failing on the baseline source"),
        ("Geometry", "2352 triangles in a 3200 budget · supply -> elbow -> riser -> flange on plinth"),
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
    slides = [make_sample_sheet(), make_before_after(), make_inspection(), make_material_map(), make_verification()]
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
