#!/usr/bin/env python3
"""Compose a short local source-render walkthrough from verified PNGs."""

from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


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
    image.thumbnail(size, Image.Resampling.LANCZOS)
    panel = Image.new("RGB", size, WHITE)
    panel.paste(image, ((size[0] - image.width) // 2, (size[1] - image.height) // 2))
    return panel


def base_frame(title: str, subtitle: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    frame = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(frame)
    draw.rectangle((0, 0, W, 92), fill=INK)
    draw.text((54, 20), "kernelCAD · construction-equipment models", font=font(21, True), fill=(176, 202, 219))
    draw.text((55, 111), title, font=font(32, True), fill=INK)
    draw.text((56, 155), subtitle, font=font(18), fill=MUTED)
    draw.rectangle((0, H - 48, W, H), fill=INK)
    draw.text((55, H - 34), FOOTER, font=font(14), fill=(224, 233, 241))
    return frame, draw


def before_after() -> None:
    frame, draw = base_frame(
        "Four existing machine IDs, rebuilt in place",
        "Same catalog entries · stronger silhouette, material separation and shape choices",
    )
    before_names = [
        "walk-behind-power-trowel",
        "vibrating-concrete-screed",
        "rebar-bending-machine",
        "portable-material-hoist",
    ]
    after_ids = [
        "trowel-standard",
        "screed-standard-working",
        "rebar-compact-hook",
        "hoist-standard-guarded",
    ]
    labels = ["Walk-behind trowel", "Vibrating screed", "Rebar bender", "Material hoist"]
    draw.text((86, 194), "Before", font=font(20, True), fill=ACCENT)
    draw.text((704, 194), "Updated default", font=font(20, True), fill=ACCENT)
    for i, (name, after, label) in enumerate(zip(before_names, after_ids, labels, strict=True)):
        y = 222 + i * 105
        draw.text((84, y + 3), label, font=font(15, True), fill=MUTED)
        frame.paste(contain(OUT / "before" / f"{name}.png", (260, 88)), (330, y))
        frame.paste(contain(OUT / "variants" / f"{after}.png", (490, 88)), (680, y))
    frame.save(OUT / "frames" / "01-before-vs-promoted.png")


def pair_slide(title: str, subtitle: str, left_id: str, right_id: str, left_label: str, right_label: str, controls: list[str], filename: str) -> None:
    frame, draw = base_frame(title, subtitle)
    frame.paste(contain(OUT / "variants" / f"{left_id}.png", (505, 406)), (54, 206))
    frame.paste(contain(OUT / "variants" / f"{right_id}.png", (505, 406)), (610, 206))
    draw.text((74, 624), left_label, font=font(19, True), fill=ACCENT)
    draw.text((628, 624), right_label, font=font(19, True), fill=ACCENT)
    y = 646
    for item in controls[:3]:
        draw.text((58, y), item, font=font(15), fill=MUTED)
        y += 20
    frame.save(OUT / "frames" / filename)


def preset_slide() -> None:
    frame, draw = base_frame(
        "Named high-visibility preset",
        "Same assemblies and shape choices; enamel and steel finishes change by preset",
    )
    hi_vis = [
        "trowel-compact-hi-vis",
        "screed-short-folded-hi-vis",
        "rebar-extended-stirrup-hi-vis",
        "hoist-short-open-hi-vis",
    ]
    labels = ["Trowel", "Screed", "Rebar bender", "Hoist"]
    for i, (variant, label) in enumerate(zip(hi_vis, labels, strict=True)):
        x = 54 + (i % 2) * 610
        y = 206 + (i // 2) * 210
        frame.paste(contain(OUT / "variants" / f"{variant}.png", (556, 174)), (x, y))
        draw.text((x + 16, y + 176), f"highVisibility · {label}", font=font(17, True), fill=ACCENT)
    frame.save(OUT / "frames" / "06-high-visibility-presets.png")


def main() -> None:
    required = [
        OUT / "before" / f"{name}.png"
        for name in [
            "walk-behind-power-trowel",
            "vibrating-concrete-screed",
            "rebar-bending-machine",
            "portable-material-hoist",
        ]
    ]
    required += [OUT / "variants" / f"{name}.png" for name in [
        "trowel-standard", "trowel-compact-hi-vis", "screed-standard-working",
        "screed-short-folded-hi-vis", "rebar-compact-hook", "rebar-extended-stirrup-hi-vis",
        "hoist-standard-guarded", "hoist-short-open-hi-vis",
    ]]
    missing = [str(path) for path in required if not path.is_file()]
    if missing:
        raise SystemExit(f"missing rendered source evidence: {', '.join(missing)}")
    (OUT / "frames").mkdir(exist_ok=True)
    (OUT / "video-review").mkdir(exist_ok=True)
    before_after()
    pair_slide(
        "Trowel guard diameter changes the working footprint",
        "Choose a compact or standard guard before placing the tool in a scene.",
        "trowel-standard", "trowel-compact-hi-vis", "standard · default palette", "compact · highVisibility",
        ["Controls: guardSize · equipmentEnamel · structuralSteel"], "02-trowel-guard-choice.png",
    )
    pair_slide(
        "The screed handle folds for storage",
        "Profile length and the paired handle frame alter the model silhouette.",
        "screed-standard-working", "screed-short-folded-hi-vis", "standard · working", "short · folded · highVisibility",
        ["Controls: profileSize · handlePosition · extrudedAluminum · gripRubber"], "03-screed-handle-choice.png",
    )
    pair_slide(
        "Rebar tooling changes with the setup",
        "The wider feed rails and a different bent-bar form are generated from the same source.",
        "rebar-compact-hook", "rebar-extended-stirrup-hi-vis", "compact table · hook", "extended table · stirrup · highVisibility",
        ["Controls: workTable · barForm · equipmentEnamel · rebarSteel"], "04-rebar-table-and-form-choice.png",
    )
    pair_slide(
        "Hoist mast and load platform configuration",
        "Choose mast height and whether the load carrier has a guard cage.",
        "hoist-standard-guarded", "hoist-short-open-hi-vis", "standard mast · guarded", "short mast · open · highVisibility",
        ["Controls: mastHeight · platformStyle · structuralSteel · tireRubber"], "05-hoist-platform-choice.png",
    )
    preset_slide()

    slides = [
        "01-before-vs-promoted.png", "02-trowel-guard-choice.png",
        "03-screed-handle-choice.png", "04-rebar-table-and-form-choice.png",
        "05-hoist-platform-choice.png", "06-high-visibility-presets.png",
    ]
    inputs = []
    for slide in slides:
        inputs.extend(["-loop", "1", "-framerate", "30", "-t", "2.5", "-i", str(OUT / "frames" / slide)])
    concat = "".join(f"[{index}:v]" for index in range(len(slides))) + f"concat=n={len(slides)}:v=1:a=0,format=yuv420p[v]"
    command = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *inputs,
        "-filter_complex", concat, "-map", "[v]", "-r", "30", "-c:v", "libx264",
        "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        str(OUT / "construction-equipment-machines.mp4"),
    ]
    subprocess.run(command, check=True)
    thumbs = [contain(OUT / "frames" / slide, (400, 225)) for slide in slides]
    sheet = Image.new("RGB", (1236, 500), BG)
    for i, thumb in enumerate(thumbs):
        sheet.paste(thumb, (12 + (i % 3) * 412, 12 + (i // 3) * 237))
    sheet.save(OUT / "video-review" / "contact-sheet.png")
    print("wrote six-slide, 15-second local source-render MP4")


if __name__ == "__main__":
    main()
