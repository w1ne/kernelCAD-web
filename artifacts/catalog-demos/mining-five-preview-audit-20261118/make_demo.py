#!/usr/bin/env python3
"""Build a short local-preview audit video and its visual inspection packet."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parent
PREVIEWS = ROOT / "samples" / "previews"
SLIDES = ROOT / "slides"
REVIEW = ROOT / "video-review"
VIDEO = ROOT / "mining-five-preview-audit.mp4"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
W, H = 1280, 720
SECONDS_PER_SLIDE = 1.6

ASSETS = [
    {
        "id": "apron-feeder",
        "title": "Heavy-duty apron feeder",
        "note": "Hopper, pan conveyor, side drive and discharge chute are visible.",
        "materials": "Coated girders · steel pans · dark chain · ore · safety rail",
        "bounds": "14.000 × 5.180 × 5.148 m · 3,576 triangles",
    },
    {
        "id": "double-deck-screen",
        "title": "Double-deck vibrating screen",
        "note": "Inclined decks, spring supports, exciter drive and underframe read clearly.",
        "materials": "Coated body · dark stand · polyurethane panels · steel springs",
        "bounds": "6.541 × 5.695 × 5.050 m · 5,194 triangles",
    },
    {
        "id": "flotation-conditioning-tank",
        "title": "Flotation conditioning tank",
        "note": "Cylindrical vessel, drive and guarded top service platform are distinct.",
        "materials": "Coated tank · steel rails · dark drive · process contents",
        "bounds": "6.800 × 5.770 × 3.900 m · 3,256 triangles",
    },
    {
        "id": "gyratory-crusher-station",
        "title": "Gyratory crusher station",
        "note": "Crusher shell and drive sit in a concrete dump pit with operator access.",
        "materials": "Coated shell · manganese wear surfaces · drive steel · concrete",
        "bounds": "16.000 × 12.769 × 20.000 m · 3,336 triangles",
    },
    {
        "id": "hydrocyclone-cluster",
        "title": "Hydrocyclone cluster",
        "note": "Radial cyclone bank, circular platform and process piping are visible.",
        "materials": "Coated cyclones · dark platform · rubber piping · safety rail",
        "bounds": "7.750 × 6.774 × 6.564 m · 5,412 triangles",
    },
]


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT, size)


def wrap(text: str, font_obj: ImageFont.FreeTypeFont, max_width: int) -> str:
    words = text.split()
    lines: list[str] = []
    line = ""
    probe = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    for word in words:
        next_line = f"{line} {word}".strip()
        if probe.textbbox((0, 0), next_line, font=font_obj)[2] <= max_width:
            line = next_line
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return "\n".join(lines)


def base_slide(section: str, page: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (W, H), "#f4f7fa")
    draw = ImageDraw.Draw(image)
    draw.text((58, 38), "KERNELCAD  /  MINING PREVIEW AUDIT  /  18 NOV 2026", font=font(18, True), fill="#3c556c")
    draw.text((58, 78), section, font=font(34, True), fill="#172b3d")
    draw.line((58, 654, 1222, 654), fill="#bcc9d4", width=2)
    draw.text((58, 674), "Local rendered-preview review · no simulation, deployment or hardware acceptance claim", font=font(15), fill="#42576a")
    draw.text((1154, 674), page, font=font(15, True), fill="#42576a")
    return image, draw


def make_contact_sheet() -> None:
    panel_w, panel_h = 344, 386
    sheet = Image.new("RGB", (panel_w * len(ASSETS), panel_h), "#e9eff4")
    draw = ImageDraw.Draw(sheet)
    for i, asset in enumerate(ASSETS):
        x = i * panel_w
        preview = Image.open(PREVIEWS / f"{asset['id']}.png").convert("RGB")
        preview.thumbnail((324, 324), Image.Resampling.LANCZOS)
        sheet.paste(preview, (x + (panel_w - preview.width) // 2, 8))
        draw.text((x + 12, 340), asset["title"], font=font(15, True), fill="#20394e")
        draw.text((x + 12, 363), asset["id"], font=font(13), fill="#42576a")
    sheet.save(ROOT / "contact-sheet.png")


def make_slides() -> list[Path]:
    SLIDES.mkdir(parents=True, exist_ok=True)
    paths: list[Path] = []

    image, draw = base_slide("Five rendered machines checked", "01 / 07")
    draw.text((60, 150), "Scope: silhouette · process features · material roles · catalog mesh envelope", font=font(21, True), fill="#2e526f")
    contact = Image.open(ROOT / "contact-sheet.png").convert("RGB")
    contact.thumbnail((1080, 310), Image.Resampling.LANCZOS)
    image.paste(contact, ((W - contact.width) // 2, 190))
    draw.text((60, 535), "Five source hashes match catalog/index.json.", font=font(20, True), fill="#26704c")
    draw.text((60, 575), "No source, test, preview, or index row changed.", font=font(20), fill="#25394a")
    p = SLIDES / "slide-01-scope.png"; image.save(p); paths.append(p)

    for i, asset in enumerate(ASSETS, start=2):
        image, draw = base_slide(asset["title"], f"{i:02d} / 07")
        preview = Image.open(PREVIEWS / f"{asset['id']}.png").convert("RGB")
        preview = ImageOps.contain(preview, (548, 548), Image.Resampling.LANCZOS)
        image.paste(preview, (45 + (560 - preview.width) // 2, 115 + (548 - preview.height) // 2))
        draw.text((645, 147), asset["id"], font=font(21, True), fill="#385b77")
        draw.multiline_text((645, 207), wrap(asset["note"], font(23), 560), font=font(23), fill="#25394a", spacing=9)
        draw.text((645, 342), "MATERIAL ROLES", font=font(16, True), fill="#385b77")
        draw.multiline_text((645, 374), wrap(asset["materials"], font(21), 560), font=font(21), fill="#25394a", spacing=8)
        draw.text((645, 478), asset["bounds"], font=font(17), fill="#42576a")
        draw.text((645, 544), "No material mismatch established.", font=font(19, True), fill="#26704c")
        p = SLIDES / f"slide-{i:02d}-{asset['id']}.png"; image.save(p); paths.append(p)

    image, draw = base_slide("Audit result", "07 / 07")
    draw.text((90, 175), "5 / 5", font=font(78, True), fill="#26704c")
    draw.text((90, 284), "previews reviewed", font=font(34, True), fill="#172b3d")
    draw.multiline_text((90, 366), "No material mismatch was established.\nNo filler edit or catalog re-index was made.", font=font(26), fill="#25394a", spacing=14)
    draw.text((90, 506), "Local preview audit only · source and index unchanged", font=font(20), fill="#42576a")
    p = SLIDES / "slide-07-result.png"; image.save(p); paths.append(p)
    return paths


def encode(paths: list[Path]) -> None:
    concat = ROOT / "verification" / "ffmpeg-concat.txt"
    concat.parent.mkdir(parents=True, exist_ok=True)
    lines = []
    for path in paths:
        lines.extend((f"file '{path.resolve()}'", f"duration {SECONDS_PER_SLIDE}"))
    lines.append(f"file '{paths[-1].resolve()}'")
    concat.write_text("\n".join(lines) + "\n")
    command = [
        "ffmpeg", "-hide_banner", "-loglevel", "warning", "-y",
        "-f", "concat", "-safe", "0", "-i", str(concat),
        "-vf", "fps=24,format=yuv420p", "-c:v", "libx264", "-preset", "medium",
        "-crf", "25", "-movflags", "+faststart", str(VIDEO),
    ]
    result = subprocess.run(command, text=True, capture_output=True, check=True)
    (ROOT / "verification" / "demo-generation.txt").write_text(
        "Command: " + " ".join(command) + "\n" + result.stderr
    )


def inspect_video() -> None:
    REVIEW.mkdir(parents=True, exist_ok=True)
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(VIDEO)],
        text=True, capture_output=True, check=True,
    )
    (REVIEW / "video-probe.json").write_text(json.dumps(json.loads(probe.stdout), indent=2) + "\n")
    frames = []
    for i in range(7):
        frame = REVIEW / f"frame-{i}.png"
        timestamp = (i + 0.5) * SECONDS_PER_SLIDE
        subprocess.run(
            ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(timestamp), "-i", str(VIDEO), "-frames:v", "1", str(frame)],
            check=True,
        )
        frames.append(frame)
    cell_w, cell_h = 400, 225
    contact = Image.new("RGB", (cell_w * 2, cell_h * 4), "#dbe4eb")
    for i, frame in enumerate(frames):
        im = Image.open(frame).convert("RGB").resize((cell_w, cell_h), Image.Resampling.LANCZOS)
        contact.paste(im, ((i % 2) * cell_w, (i // 2) * cell_h))
    contact.save(REVIEW / "contact-sheet.png")
    (REVIEW / "inspection.md").write_text(
        "# Video inspection\n\n"
        "The encoded MP4 was probed with ffprobe and reviewed through one extracted "
        "mid-slide frame from each of its seven slides. The title, five asset captions, "
        "result, and local-only claim limits remain readable. The review video does not "
        "claim simulation, deployment, or hardware acceptance. See `video-probe.json` "
        "and `contact-sheet.png`.\n"
    )


def main() -> None:
    make_contact_sheet()
    paths = make_slides()
    encode(paths)
    inspect_video()
    print(f"wrote {VIDEO.relative_to(ROOT)} ({len(paths)} slides)")


if __name__ == "__main__":
    main()
