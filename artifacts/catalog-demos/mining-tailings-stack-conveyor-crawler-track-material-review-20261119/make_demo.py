#!/usr/bin/env python3
"""Build a short local-preview and material-regression review video."""

from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
WIDTH, HEIGHT = 1280, 720
BG = "#eef3f7"
INK = "#17354b"
MUTED = "#536878"
CARD = "#ffffff"
ACCENT = "#2677a8"
GREEN = "#24734f"


def font(size: int, bold: bool = False):
    path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def slide(title: str, subtitle: str = "") -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    draw.text((54, 38), title, fill=INK, font=font(34, True))
    if subtitle:
        draw.text((56, 86), subtitle, fill=MUTED, font=font(18))
    draw.line((54, 122, WIDTH - 54, 122), fill="#cad5de", width=2)
    return image, draw


def fit(path: Path, size: tuple[int, int]) -> Image.Image:
    image = Image.open(path).convert("RGB")
    image.thumbnail(size, Image.Resampling.LANCZOS)
    return image


def centered(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, f, fill):
    draw.text(xy, text, anchor="mm", font=f, fill=fill)


def create_audit_slide() -> Image.Image:
    image, draw = slide("Five-preview mining audit", "Rendered catalog views · one material-role mismatch selected")
    names = [
        ("core-drill-rig", "Exploration core drill"),
        ("overland-conveyor-bridge", "Overland conveyor bridge"),
        ("stacker-reclaimer-boom", "Stacker reclaimer boom"),
        ("tailings-stack-conveyor", "Tailings stack conveyor"),
        ("ore-sorting-arch", "Ore sorting arch"),
    ]
    card_w, card_h, gap = 224, 502, 20
    start_x = 50
    for i, (asset, label) in enumerate(names):
        x = start_x + i * (card_w + gap)
        y = 151
        draw.rounded_rectangle((x, y, x + card_w, y + card_h), radius=14, fill=CARD, outline="#d7e0e6", width=2)
        thumb = fit(BUNDLE / "samples" / "previews" / f"{asset}.png", (208, 300))
        image.paste(thumb, (x + (card_w - thumb.width) // 2, y + 15))
        centered(draw, (x + card_w // 2, y + 350), label, font(15, True), INK)
        centered(draw, (x + card_w // 2, y + 392), asset, font(12), MUTED)
        if asset == "tailings-stack-conveyor":
            draw.rounded_rectangle((x + 38, y + 434, x + card_w - 38, y + 470), radius=10, fill="#e4f2ea")
            centered(draw, (x + card_w // 2, y + 452), "selected fix", font(14, True), GREEN)
    draw.text((54, 680), "Preview observations cover silhouette and material zones; dimensions are catalog mesh envelopes.", fill=MUTED, font=font(14))
    return image


def create_before_after_slide() -> Image.Image:
    image, draw = slide("Crawler material correction", "Same 3,792-triangle geometry · only the track material assignment changed")
    box_y, box_w, box_h = 152, 550, 475
    for x in (54, 676):
        draw.rounded_rectangle((x, box_y, x + box_w, box_y + box_h), radius=16, fill=CARD, outline="#d7e0e6", width=2)
    before = fit(BUNDLE / "before" / "tailings-stack-conveyor.png", (510, 430))
    after = fit(BUNDLE / "after" / "tailings-stack-conveyor.png", (510, 430))
    image.paste(before, (74, box_y + 18))
    image.paste(after, (696, box_y + 18))
    centered(draw, (329, 650), "BEFORE · track and grousers on belt rubber", font(16, True), MUTED)
    centered(draw, (951, 650), "AFTER · crawler track parts on steel", font(16, True), GREEN)
    return image


def create_material_slide() -> Image.Image:
    image, draw = slide("Material controls follow part roles", "Twenty crawler parts moved to the existing steel finish; belt parts stay rubber")
    cards = [
        (54, "BEFORE", "beltRubber", "#25282a", "track-0, track-1\n18 × grouser-*", "Incorrect control grouping", "#f7e8e5", "#9b463b"),
        (664, "AFTER", "crawlerSteel", "#3a3f44", "track-0, track-1\n18 × grouser-*", "Steel crawler parts", "#e4f2ea", GREEN),
    ]
    for x, side, name, color, parts, caption, panel, label_color in cards:
        draw.rounded_rectangle((x, 166, x + 562, 582), radius=18, fill=CARD, outline="#d7e0e6", width=2)
        draw.text((x + 28, 190), side, fill=label_color, font=font(18, True))
        draw.rounded_rectangle((x + 28, 232, x + 174, 380), radius=12, fill=color)
        draw.text((x + 202, 255), name, fill=INK, font=font(25, True))
        draw.text((x + 202, 298), color.upper(), fill=MUTED, font=font(18))
        draw.rounded_rectangle((x + 28, 408, x + 534, 483), radius=10, fill=panel)
        draw.multiline_text((x + 48, 422), parts, fill=INK, font=font(16), spacing=5)
        draw.text((x + 28, 516), caption, fill=label_color, font=font(18, True))
    draw.rounded_rectangle((54, 602, 1226, 664), radius=12, fill="#e8eef3")
    centered(draw, (640, 633), "belt-carry and the rubber-lagged head pulley remain on beltRubber", font(18, True), INK)
    return image


def create_verification_slide() -> Image.Image:
    image, draw = slide("Local verification", "Source · software preview · index · exported-GLB regression")
    items = [
        ("PASS", "Focused GLB test", "1 / 1 · 20 crawler parts"),
        ("PASS", "ESLint", "mining kit + regression"),
        ("PASS", "Catalog index", "fresh source SHA · preview path"),
        ("PASS", "Catalog integration", "full suite passed"),
    ]
    y = 160
    for status, title, detail in items:
        draw.rounded_rectangle((72, y, 1208, y + 88), radius=14, fill=CARD, outline="#d7e0e6", width=2)
        draw.rounded_rectangle((95, y + 20, 220, y + 68), radius=12, fill="#e4f2ea")
        centered(draw, (157, y + 44), status, font(17, True), GREEN)
        draw.text((254, y + 19), title, fill=INK, font=font(22, True))
        draw.text((254, y + 51), detail, fill=MUTED, font=font(16))
        y += 108
    draw.rounded_rectangle((72, 608, 1208, 670), radius=12, fill="#e8eef3")
    centered(draw, (640, 639), "Local software preview and GLB test only · no deployment, simulation, or hardware acceptance", font(15, True), INK)
    return image


def main() -> None:
    video_inputs = BUNDLE / "video-inputs"
    video_inputs.mkdir(parents=True, exist_ok=True)
    slides = [create_audit_slide(), create_before_after_slide(), create_material_slide(), create_verification_slide()]
    slide_paths = []
    names = [
        "slide-01-five-preview-audit.png",
        "slide-02-before-after.png",
        "slide-03-material-map.png",
        "slide-04-verification-and-scope.png",
    ]
    for name, image in zip(names, slides, strict=True):
        path = video_inputs / name
        image.save(path, optimize=True)
        slide_paths.append(path)

    output = BUNDLE / "review-demo.mp4"
    inputs = []
    for path in slide_paths:
        inputs.extend(["-loop", "1", "-t", "3.75", "-i", str(path)])
    concat = "".join(f"[{i}:v]" for i in range(len(slide_paths))) + f"concat=n={len(slide_paths)}:v=1:a=0,format=yuv420p[out]"
    command = [
        "ffmpeg", "-y", *inputs,
        "-filter_complex", concat,
        "-map", "[out]", "-r", "24", "-c:v", "libx264", "-preset", "medium",
        "-crf", "20", "-movflags", "+faststart", str(output),
    ]
    (BUNDLE / "video-inputs" / "ffmpeg-command.txt").write_text(" ".join(command) + "\n")
    result = subprocess.run(command, check=False, capture_output=True, text=True)
    log = "\n".join(line.rstrip() for line in (result.stdout + result.stderr).splitlines()).rstrip() + "\n"
    (BUNDLE / "verification" / "demo-generation.txt").write_text(log)
    if result.returncode:
        raise SystemExit(result.returncode)
    print(f"wrote {output} ({output.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
