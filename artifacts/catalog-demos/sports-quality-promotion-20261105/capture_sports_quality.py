#!/usr/bin/env python3
"""Build a short local walkthrough from sports source and preview artifacts."""

from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/sports"
PREVIEWS = KIT / "previews"
BEFORE = BUNDLE / "before"
PRESETS = BUNDLE / "presets"
FRAMES = BUNDLE / "frames"
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, GREEN, BLUE = "#111923", "#1d2935", "#eef3f5", "#a6b6c0", "#86c89a", "#75bfd1"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"


def font(size: int, path: str = FONT) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def canvas() -> Image.Image:
    return Image.new("RGB", (WIDTH, HEIGHT), BG)


def header(draw: ImageDraw.ImageDraw, kicker: str, title: str, detail: str) -> None:
    draw.text((54, 27), kicker.upper(), fill=GREEN, font=font(16, BOLD))
    draw.text((54, 55), title, fill=TEXT, font=font(30, BOLD))
    draw.text((54, 99), detail, fill=MUTED, font=font(15))


def footer(draw: ImageDraw.ImageDraw, detail: str) -> None:
    draw.line((54, 678, WIDTH - 54, 678), fill="#35434e", width=1)
    draw.text((54, 689), detail, fill=MUTED, font=font(12))


def paste_fit(im: Image.Image, source: Path, bounds: tuple[int, int, int, int]) -> None:
    x, y, width, height = bounds
    preview = Image.open(source).convert("RGB")
    preview.thumbnail((width, height), Image.Resampling.LANCZOS)
    im.paste(preview, (x + (width - preview.width) // 2, y + (height - preview.height) // 2))


def save_frame(number: int, im: Image.Image) -> Path:
    path = FRAMES / f"frame-{number:02d}.png"
    im.save(path, optimize=True)
    return path


def title_frame() -> Image.Image:
    im = canvas()
    d = ImageDraw.Draw(im)
    d.text((72, 67), "kernelCAD  /  ASSET CATALOG", fill=GREEN, font=font(20, BOLD))
    d.text((75, 146), "SPORTS QUALITY", fill=TEXT, font=font(46, BOLD))
    d.text((78, 228), "40 existing assets promoted in place", fill=TEXT, font=font(24))
    d.text((78, 282), "115 material controls  ·  40 clubColors presets  ·  40 indexed previews", fill=MUTED, font=font(17))
    d.rounded_rectangle((72, 398, 1208, 552), radius=16, fill=PANEL, outline="#344651", width=2)
    d.text((105, 427), "same 40 IDs   /   no catalog count increase", fill=TEXT, font=font(24, BOLD))
    d.text((105, 477), "each asset exposes 2–4 named material controls", fill=GREEN, font=font(17))
    footer(d, "Local source-to-preview workflow · branch is not deployed · no physical sport-performance claim.")
    return im


def compare_frame() -> Image.Image:
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "01 / before and after", "Materials and silhouette details", "The same basketball and soccer goal IDs, with differentiated finishes and modeled construction.")
    examples = [
        ("Basketball", "basketball", "Pebbled cover · continuous dark channel seams"),
        ("Soccer goal", "soccer-goal", "Aluminium frame · open nylon grid · rubber feet"),
    ]
    for row, (label, asset_id, note) in enumerate(examples):
        y = 158 + row * 242
        d.rounded_rectangle((54, y, 1226, y + 218), radius=12, fill=PANEL, outline="#344651", width=1)
        d.text((76, y + 8), label, fill=TEXT, font=font(16, BOLD))
        d.text((124, y + 32), "BASELINE", fill=MUTED, font=font(11, BOLD))
        d.text((458, y + 32), "PROMOTED", fill=GREEN, font=font(11, BOLD))
        paste_fit(im, BEFORE / f"{asset_id}.png", (92, y + 48, 268, 156))
        paste_fit(im, PREVIEWS / f"{asset_id}.png", (426, y + 48, 268, 156))
        d.text((744, y + 78), asset_id, fill=BLUE, font=font(14, MONO))
        d.text((744, y + 112), note, fill=TEXT, font=font(14))
    footer(d, "Baseline previews were captured from HEAD before edits; promoted previews use the refreshed default sources.")
    return im


def detail_frame() -> Image.Image:
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "02 / recognizable objects", "Color follows the modeled materials", "The preview separates the parts a customer would expect to tune.")
    assets = [
        ("american-football", "Leather cover · ivory laces · end stripes"),
        ("baseball", "White cover · raised red seam cord"),
        ("tennis-racket", "Graphite frame · nylon strings · grip tape"),
    ]
    for i, (asset_id, caption) in enumerate(assets):
        x = 54 + i * 392
        d.rounded_rectangle((x, 168, x + 372, 601), radius=12, fill=PANEL, outline="#344651", width=1)
        paste_fit(im, PREVIEWS / f"{asset_id}.png", (x + 18, 182, 336, 300))
        d.text((x + 18, 509), asset_id.replace("-", " "), fill=TEXT, font=font(14, BOLD))
        d.text((x + 18, 540), caption, fill=BLUE, font=font(12))
    footer(d, "These images are actual software-rendered previews from the refreshed catalog sources.")
    return im


def controls_frame() -> Image.Image:
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "03 / source controls", "Parameters name the material", "Example source controls from the basketball and racket assets.")
    source_lines = [
        ("basketball", "pebbledCover", "Pebbled ball cover", "#d47a32"),
        ("basketball", "channelRubber", "Channel rubber", "#302c29"),
        ("tennis-racket", "graphiteFrame", "Graphite frame", "#5b6870"),
        ("tennis-racket", "nylonStrings", "Nylon strings", "#e7e3d7"),
        ("tennis-racket", "gripTape", "Grip tape", "#343a3d"),
    ]
    d.rounded_rectangle((54, 151, 760, 601), radius=14, fill=PANEL, outline="#344651", width=1)
    y = 188
    for asset_id, knob, label, value in source_lines:
        d.text((77, y), asset_id, fill=MUTED, font=font(12, MONO))
        d.text((77, y + 20), f"{knob:<18} {value}   {label}", fill=BLUE, font=font(14, MONO))
        y += 73
    d.rounded_rectangle((784, 151, 1226, 601), radius=14, fill=PANEL, outline="#344651", width=1)
    paste_fit(im, PREVIEWS / "basketball.png", (808, 171, 394, 330))
    d.text((815, 524), "default values render into separate parts", fill=GREEN, font=font(12, BOLD))
    d.text((815, 550), "scale remains an editable geometry control", fill=MUTED, font=font(12))
    footer(d, "Material knobs color named source parts; geometry and scale controls remain parametric.")
    return im


def presets_frame() -> Image.Image:
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "04 / named preset replay", "Switch the source palette", "Default and clubColors are rendered from source-declared values for three existing assets.")
    pairs = [
        ("basketball", "Basketball", "pebbledCover + channelRubber"),
        ("soccer-ball", "Soccer ball", "ballCover + panelPolymer"),
        ("tennis-racket", "Tennis racket", "graphiteFrame + nylonStrings"),
    ]
    for row, (asset_id, label, materials) in enumerate(pairs):
        y = 155 + row * 166
        d.rounded_rectangle((54, y, 1226, y + 151), radius=12, fill=PANEL, outline="#344651", width=1)
        d.text((74, y + 12), label, fill=TEXT, font=font(15, BOLD))
        d.text((260, y + 14), "DEFAULT", fill=MUTED, font=font(10, BOLD))
        d.text((614, y + 14), "clubColors", fill=GREEN, font=font(10, BOLD))
        paste_fit(im, PRESETS / f"{asset_id}-default.png", (251, y + 32, 266, 110))
        paste_fit(im, PRESETS / f"{asset_id}-clubColors.png", (605, y + 32, 266, 110))
        d.text((902, y + 54), materials, fill=BLUE, font=font(12, MONO))
    footer(d, "Six preset replay images were built by changing source parameter defaults and rerunning the local CAD renderer.")
    return im


def result_frame() -> Image.Image:
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "05 / local verification", "Quality gate, index and previews agree", "All evidence below is from this branch's local source and rendering workflow.")
    metrics = [
        ("40 / 40  ·  100%", "sports assets pass the quality gate"),
        ("2,131 / 2,390  ·  89.16%", "catalog assets pass · 259 thin remain"),
        ("40 / 40", "previews rendered and indexed · 40 presets"),
        ("lint + integration", "ESLint clean · 15 integration tests pass"),
    ]
    for i, (value, label) in enumerate(metrics):
        col, row = i % 2, i // 2
        x, y = 58 + col * 588, 176 + row * 194
        d.rounded_rectangle((x, y, x + 544, y + 150), radius=14, fill=PANEL, outline="#344651", width=1)
        d.text((x + 28, y + 25), value, fill=GREEN, font=font(25 if len(value) > 19 else 27, BOLD))
        d.text((x + 28, y + 83), label, fill=TEXT, font=font(15))
    footer(d, "Local source evaluation and replay only · branch not deployed · no hardware, fit or sport-performance acceptance tested.")
    return im


def main() -> None:
    FRAMES.mkdir(parents=True, exist_ok=True)
    frames = [title_frame(), compare_frame(), detail_frame(), controls_frame(), presets_frame(), result_frame()]
    frame_paths = [save_frame(index, frame) for index, frame in enumerate(frames, start=1)]
    Image.open(frame_paths[0]).save(BUNDLE / "poster.png", optimize=True)

    concat = BUNDLE / "frames.ffconcat"
    entries = []
    for path in frame_paths:
        entries.extend((f"file '{path}'", "duration 3"))
    entries.append(f"file '{frame_paths[-1]}'")
    concat.write_text("ffconcat version 1.0\n" + "\n".join(entries) + "\n")
    video = BUNDLE / "sports-quality-promotion.mp4"
    subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-f", "concat", "-safe", "0", "-i", str(concat),
            "-vf", "fps=24", "-c:v", "libx264", "-crf", "22", "-preset", "medium",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(video),
        ],
        check=True,
    )
    print(f"wrote {video} with {len(frame_paths)} storyboard frames")


if __name__ == "__main__":
    main()
