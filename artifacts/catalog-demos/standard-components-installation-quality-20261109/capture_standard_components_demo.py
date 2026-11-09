#!/usr/bin/env python3
"""Compose a short source-to-preview tour from generated model images."""

from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
W, H = 1280, 720
BG = (238, 243, 248)
INK = (25, 39, 58)
MUTED = (83, 99, 119)
ACCENT = (39, 101, 126)
WHITE = (255, 255, 255)
FOOTER = "Local kernelCAD source render · not deployed · no physical acceptance"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT, size)


def contain(path: Path, size: tuple[int, int]) -> Image.Image:
    image = Image.open(path).convert("RGB")
    source_w, source_h = image.size
    if 0.85 <= source_w / source_h <= 1.15:
        model_area = image.crop((0, 0, source_w, max(1, source_h - 64)))
        background = Image.new("RGB", model_area.size, model_area.getpixel((0, 0)))
        difference = ImageChops.difference(model_area, background).convert("L")
        bounds = difference.point(lambda value: 255 if value > 14 else 0).getbbox()
        if bounds is not None:
            left, top, right, bottom = bounds
            margin = 12
            image = model_area.crop((max(0, left - margin), max(0, top - margin), min(source_w, right + margin), min(source_h - 64, bottom + margin)))
    image.thumbnail(size, Image.Resampling.LANCZOS)
    panel = Image.new("RGB", size, WHITE)
    panel.paste(image, ((size[0] - image.width) // 2, (size[1] - image.height) // 2))
    return panel


def base_frame(title: str, subtitle: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    frame = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(frame)
    draw.rectangle((0, 0, W, 92), fill=INK)
    draw.text((54, 20), "kernelCAD · standard-components", font=font(21, True), fill=(176, 202, 219))
    draw.text((55, 111), title, font=font(31, True), fill=INK)
    draw.text((56, 154), subtitle, font=font(17), fill=MUTED)
    draw.rectangle((0, H - 48, W, H), fill=INK)
    draw.text((55, H - 34), FOOTER, font=font(14), fill=(224, 233, 241))
    return frame, draw


def before_after() -> None:
    frame, draw = base_frame(
        "Five existing component models refined in place",
        "Same asset IDs · added material zones and geometry options users can select",
    )
    names = ["base-mounting-plate", "blind-flange", "pipe-coupling", "pipe-flange", "rubber-bumper"]
    labels = ["Base mounting plate", "Blind flange", "Pipe coupling", "Pipe flange", "Rubber bumper"]
    draw.text((320, 190), "Before", font=font(18, True), fill=ACCENT)
    draw.text((787, 190), "Updated default", font=font(18, True), fill=ACCENT)
    for index, (name, label) in enumerate(zip(names, labels, strict=True)):
        y = 218 + index * 87
        draw.text((66, y + 24), label, font=font(15, True), fill=MUTED)
        frame.paste(contain(OUT / "before" / f"{name}.png", (220, 82)), (300, y))
        frame.paste(contain(ROOT / "catalog/kits/standard-components/previews" / f"{name}.png", (470, 82)), (744, y))
    frame.save(OUT / "frames" / "01-before-after.png")


def pair_slide(title: str, subtitle: str, left_id: str, right_id: str, left_label: str, right_label: str, controls: list[str], filename: str) -> None:
    frame, draw = base_frame(title, subtitle)
    frame.paste(contain(OUT / "variants" / f"{left_id}.png", (520, 410)), (50, 190))
    frame.paste(contain(OUT / "variants" / f"{right_id}.png", (520, 410)), (610, 190))
    draw.text((72, 610), left_label, font=font(18, True), fill=ACCENT)
    draw.text((632, 610), right_label, font=font(18, True), fill=ACCENT)
    for index, line in enumerate(controls[:2]):
        draw.text((56, 640 + index * 18), line, font=font(14), fill=MUTED)
    frame.save(OUT / "frames" / filename)


def flange_slide() -> None:
    frame, draw = base_frame(
        "Both flange models change their mounting layout",
        "Four/eight-hole bolt circles and optional installed bolts are generated from source choices",
    )
    panels = [
        ("blind-four-open", "Blind flange · four holes"),
        ("blind-eight-installed", "Blind flange · eight bolts"),
        ("flange-four-open", "Pipe flange · four holes"),
        ("flange-eight-installed", "Pipe flange · eight bolts"),
    ]
    for index, (variant, label) in enumerate(panels):
        x = 66 + (index % 2) * 610
        y = 204 + (index // 2) * 210
        frame.paste(contain(OUT / "variants" / f"{variant}.png", (550, 168)), (x, y))
        draw.text((x + 8, y + 170), label, font=font(17, True), fill=ACCENT)
    draw.text((58, 637), "New zinc-plated hardware controls · clean / galvanized palette presets", font=font(15), fill=MUTED)
    frame.save(OUT / "frames" / "03-flange-layouts.png")


def verification_slide() -> None:
    frame, draw = base_frame(
        "Generated previews and local verification",
        "Source edits · fifty refreshed kit previews · regenerated catalog index",
    )
    lines = (OUT / "verification-summary.txt").read_text(encoding="utf-8").splitlines()
    y = 218
    for line in lines:
        draw.rounded_rectangle((94, y, 1187, y + 56), radius=10, fill=WHITE)
        draw.text((122, y + 16), line, font=font(18, True), fill=ACCENT)
        y += 74
    draw.text((96, 608), "Branch-local software evidence only; no deployment or hardware acceptance.", font=font(17), fill=MUTED)
    frame.save(OUT / "frames" / "06-local-verification.png")


def main() -> None:
    required = [OUT / "before" / f"{name}.png" for name in [
        "base-mounting-plate", "blind-flange", "pipe-coupling", "pipe-flange", "rubber-bumper",
    ]]
    required += [OUT / "variants" / f"{name}.png" for name in [
        "plate-four-open", "plate-eight-installed", "blind-four-open", "blind-eight-installed",
        "coupling-two-seals", "coupling-bare-clean-service", "flange-four-open", "flange-eight-installed",
        "bumper-male-stud", "bumper-threaded-insert",
    ]]
    required += [OUT / "verification-summary.txt"]
    missing = [str(path) for path in required if not path.is_file()]
    if missing:
        raise SystemExit(f"missing source evidence: {', '.join(missing)}")
    (OUT / "frames").mkdir(exist_ok=True)
    (OUT / "video-review").mkdir(exist_ok=True)

    before_after()
    pair_slide(
        "Mounting plate: hole count and hardware are selectable",
        "The eight-hole option also adds four side positions around the locating boss.",
        "plate-four-open", "plate-eight-installed", "four corner holes · open", "eight perimeter holes · installed bolts",
        ["Controls: holePattern · fasteners · plateSteel · brass · zinc", "Preset: galvanized"], "02-mounting-plate-options.png",
    )
    flange_slide()
    pair_slide(
        "Sleeve coupling: the bore can carry two elastomer seals",
        "Choose a sealed entry pair or a bare sleeve; the bore parts and material controls update from source.",
        "coupling-two-seals", "coupling-bare-clean-service", "two seals · dark preset", "bare sleeve · cleanService",
        ["Controls: sealConfiguration · sleeve steel · stainless collars · elastomer", "Preset: cleanService"], "04-coupling-seals.png",
    )
    pair_slide(
        "Rubber bumper: choose its mounting interface",
        "The male stud and recessed threaded insert have different generated silhouettes and heights.",
        "bumper-male-stud", "bumper-threaded-insert", "male mounting stud", "threaded insert · clean preset",
        ["Controls: mounting · rubber · steel · zinc", "Vertical envelope changes by 9.9 mm"], "05-bumper-mounts.png",
    )
    verification_slide()

    slides = [
        "01-before-after.png", "02-mounting-plate-options.png", "03-flange-layouts.png",
        "04-coupling-seals.png", "05-bumper-mounts.png", "06-local-verification.png",
    ]
    inputs: list[str] = []
    for slide in slides:
        inputs.extend(["-loop", "1", "-framerate", "30", "-t", "2.5", "-i", str(OUT / "frames" / slide)])
    concat = "".join(f"[{index}:v]" for index in range(len(slides))) + f"concat=n={len(slides)}:v=1:a=0,format=yuv420p[v]"
    command = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *inputs,
        "-filter_complex", concat, "-map", "[v]", "-r", "30", "-c:v", "libx264",
        "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        str(OUT / "standard-components-installation-quality.mp4"),
    ]
    subprocess.run(command, check=True)
    thumbs = [contain(OUT / "frames" / slide, (400, 225)) for slide in slides]
    sheet = Image.new("RGB", (1236, 500), BG)
    for index, thumb in enumerate(thumbs):
        sheet.paste(thumb, (12 + (index % 3) * 412, 12 + (index // 3) * 237))
    sheet.save(OUT / "video-review" / "contact-sheet.png")
    print("wrote six-slide, 15-second source-render MP4")


if __name__ == "__main__":
    main()
