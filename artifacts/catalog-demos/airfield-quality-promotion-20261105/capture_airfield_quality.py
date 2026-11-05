#!/usr/bin/env python3
"""Build a short walkthrough from actual airfield sources and rendered previews."""

from __future__ import annotations

import subprocess
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/airfield"
PREVIEWS = KIT / "previews"
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
    d.text((75, 146), "AIRFIELD QUALITY", fill=TEXT, font=font(46, BOLD))
    d.text((78, 228), "40 existing assets promoted in place", fill=TEXT, font=font(24))
    d.text((78, 282), "2–4 material controls  ·  2 appearance presets  ·  40 refreshed previews", fill=MUTED, font=font(17))
    d.rounded_rectangle((72, 398, 1208, 552), radius=16, fill=PANEL, outline="#344651", width=2)
    d.text((105, 427), "142 material controls   /   80 named preset entries", fill=TEXT, font=font(24, BOLD))
    d.text((105, 477), "Same 40 IDs   /   no catalog count increase", fill=GREEN, font=font(17))
    footer(d, "Local source-to-preview workflow · stylized visualization props · no deployment or hardware acceptance claim.")
    return im


def compare_frame() -> Image.Image:
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "01 / before and after", "Materials and silhouette refinements", "The same fuel truck and control tower IDs, with source-driven finishes and new visible details.")
    examples = [("Fuel truck", "aircraft-fuel-truck"), ("Control tower", "airport-control-tower")]
    for row, (label, asset_id) in enumerate(examples):
        y = 158 + row * 242
        d.rounded_rectangle((54, y, 1226, y + 218), radius=12, fill=PANEL, outline="#344651", width=1)
        d.text((76, y + 8), label, fill=TEXT, font=font(16, BOLD))
        d.text((124, y + 32), "BASELINE", fill=MUTED, font=font(11, BOLD))
        d.text((458, y + 32), "PROMOTED", fill=GREEN, font=font(11, BOLD))
        paste_fit(im, BUNDLE / "before" / f"{asset_id}.png", (92, y + 48, 268, 156))
        paste_fit(im, PREVIEWS / f"{asset_id}.png", (426, y + 48, 268, 156))
        d.text((744, y + 75), asset_id, fill=BLUE, font=font(14, MONO))
        d.text((744, y + 108), "separate paint, glazing,", fill=TEXT, font=font(14))
        d.text((744, y + 132), "metal and structural parts", fill=TEXT, font=font(14))
    footer(d, "Baseline images were captured before the source promotion; promoted images are rendered from updated .kcad.ts defaults.")
    return im


def detail_frame() -> Image.Image:
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "02 / recognizable details", "Airport props read by their key parts", "The fire engine has its rescue palette and roof ladder; buildings expose their roof, glazing and opening.")
    assets = [
        ("airport-fire-engine", "Rescue body · crew cab · ladder"),
        ("aircraft-hangar", "Pitched roof · open apron side"),
        ("terminal-gate-front", "Glazing band · gate canopy"),
    ]
    for i, (asset_id, caption) in enumerate(assets):
        x = 54 + i * 392
        d.rounded_rectangle((x, 168, x + 372, 601), radius=12, fill=PANEL, outline="#344651", width=1)
        paste_fit(im, PREVIEWS / f"{asset_id}.png", (x + 18, 182, 336, 300))
        d.text((x + 18, 509), asset_id.replace("-", " "), fill=TEXT, font=font(14, BOLD))
        d.text((x + 18, 540), caption, fill=BLUE, font=font(12))
    footer(d, "These are actual software-rendered previews from the refreshed catalog sources.")
    return im


def controls_frame() -> Image.Image:
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "03 / source parameters", "Material controls map onto named parts", "Four independent finishes color the airport fire engine and its equipment.")
    source = (KIT / "airport-fire-engine.kcad.ts").read_text().splitlines()
    selected = []
    for line in source:
        match = re.match(
            r"const (vehiclePaint|cabPaint|stainlessSteel|rubber) = param\('[^']+', '([^']+)', \{ label: '([^']+)' \}\);",
            line.strip(),
        )
        if match:
            name, value, label = match.groups()
            selected.append((f"{name:<16} {value}  {label}", "material"))
        elif "weathered:" in line or "highVisibility:" in line:
            selected.append((f"preset  {line.strip()}", "preset"))
        elif 'p.part("roof-ladder-outer-rail",' in line:
            selected.append(('part    "roof-ladder-outer-rail" → stainlessSteel', "part"))
    d.rounded_rectangle((54, 151, 760, 601), radius=14, fill=PANEL, outline="#344651", width=1)
    y = 178
    for line, kind in selected:
        color = BLUE if kind in {"material", "preset"} else TEXT
        d.text((73, y), line, fill=color, font=font(13, MONO))
        y += 46
    d.rounded_rectangle((784, 151, 1226, 601), radius=14, fill=PANEL, outline="#344651", width=1)
    paste_fit(im, PREVIEWS / "airport-fire-engine.png", (808, 175, 394, 325))
    d.text((815, 524), "body · cab · stainless steel · rubber", fill=GREEN, font=font(12, BOLD))
    d.text((815, 550), "scale remains editable", fill=MUTED, font=font(12))
    footer(d, "Each material parameter colors named source parts; the two presets set coordinated values.")
    return im


def presets_frame() -> Image.Image:
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "04 / named appearance presets", "One fire engine, two coordinated finishes", "Both images replay the values declared in the same airport-fire-engine source.")
    d.rounded_rectangle((54, 157, 622, 601), radius=14, fill=PANEL, outline="#344651", width=1)
    d.rounded_rectangle((658, 157, 1226, 601), radius=14, fill=PANEL, outline="#344651", width=1)
    d.text((82, 178), "weathered", fill=TEXT, font=font(22, BOLD))
    d.text((686, 178), "highVisibility", fill=TEXT, font=font(22, BOLD))
    paste_fit(im, BUNDLE / "presets/airport-fire-engine-weathered.png", (88, 222, 500, 300))
    paste_fit(im, BUNDLE / "presets/airport-fire-engine-highVisibility.png", (692, 222, 500, 300))
    d.text((87, 548), "muted rescue paint · dark steel", fill=BLUE, font=font(13, MONO))
    d.text((690, 548), "safety yellow · bright metal", fill=GREEN, font=font(13, MONO))
    footer(d, "Preset images are locally rendered from source-declared parameter values; geometry and triangle count remain the same.")
    return im


def result_frame() -> Image.Image:
    im = canvas()
    d = ImageDraw.Draw(im)
    header(d, "05 / local verification", "Sources, previews and index agree", "Quality, lint, integration tests and generated local pages were checked on this branch.")
    metrics = [
        ("40 / 40 · 100%", "airfield assets pass quality gate"),
        ("2,091 / 2,390", "catalog assets pass · 87.49%"),
        ("40 / 40", "previews rendered and indexed"),
        ("local checks", "not deployed · no physical acceptance claim"),
    ]
    for i, (value, label) in enumerate(metrics):
        col, row = i % 2, i // 2
        x, y = 58 + col * 588, 176 + row * 194
        d.rounded_rectangle((x, y, x + 544, y + 150), radius=14, fill=PANEL, outline="#344651", width=1)
        d.text((x + 28, y + 25), value, fill=GREEN, font=font(27, BOLD))
        d.text((x + 28, y + 83), label, fill=TEXT, font=font(15))
    footer(d, "Local source evaluation and replay only · branch not deployed · flight performance and physical acceptance not evaluated.")
    return im


def main() -> None:
    FRAMES.mkdir(parents=True, exist_ok=True)
    frames = [title_frame(), compare_frame(), detail_frame(), controls_frame(), presets_frame(), result_frame()]
    frame_paths = [save_frame(index, frame) for index, frame in enumerate(frames, start=1)]
    Image.open(frame_paths[0]).save(BUNDLE / "poster.png", optimize=True)

    concat = BUNDLE / "frames.ffconcat"
    entries = []
    for path in frame_paths:
        entries.extend((f"file '{path}'", "duration 3.5"))
    entries.append(f"file '{frame_paths[-1]}'")
    concat.write_text("ffconcat version 1.0\n" + "\n".join(entries) + "\n")
    video = BUNDLE / "airfield-quality-promotion.mp4"
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
