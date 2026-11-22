#!/usr/bin/env python3
"""Build the recorded local review demo from source, presets and rendered previews."""
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog" / "kits" / "wind-energy"
PREVIEWS = KIT / "previews"
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, TEAL, GOLD = "#111923", "#1d2935", "#eef3f5", "#a6b6c0", "#61c6bf", "#efb532"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"


def font(size, path=FONT):
    return ImageFont.truetype(path, size)


def canvas():
    return Image.new("RGB", (WIDTH, HEIGHT), BG)


def header(draw, kicker, title, detail):
    draw.text((54, 28), kicker.upper(), fill=TEAL, font=font(16, BOLD))
    draw.text((54, 57), title, fill=TEXT, font=font(31, BOLD))
    draw.text((54, 102), detail, fill=MUTED, font=font(16))


def footer(draw, detail):
    draw.line((54, 678, WIDTH - 54, 678), fill="#35434e", width=1)
    draw.text((54, 690), detail, fill=MUTED, font=font(12))


def title_frame():
    im = canvas(); d = ImageDraw.Draw(im)
    d.text((72, 64), "kernelCAD  /  ASSET CATALOG", fill=TEAL, font=font(20, BOLD))
    d.text((72, 137), "WIND ENERGY", fill=TEXT, font=font(58, BOLD))
    d.text((76, 224), "50 useful, material-aware parametric assets", fill=TEXT, font=font(27))
    d.text((76, 271), "Turbines · foundations · grid equipment · maintenance props", fill=MUTED, font=font(19))
    ids = ["horizontal-axis-wind-turbine", "wind-farm-pad-mount-transformer", "maintenance-tool-cart"]
    xs = [80, 454, 828]
    for x, asset_id in zip(xs, ids):
        d.rounded_rectangle((x, 355, x + 330, 600), radius=14, fill=PANEL, outline="#344651", width=2)
        preview = Image.open(PREVIEWS / f"{asset_id}.png").convert("RGB")
        preview.thumbnail((310, 190), Image.Resampling.LANCZOS)
        im.paste(preview, (x + (330 - preview.width) // 2, 365 + (190 - preview.height) // 2))
        d.text((x + 15, 566), asset_id.replace("-", " ").title(), fill=TEXT, font=font(14, BOLD))
    footer(d, "Native .kcad.ts source · millimetres · Z up · local catalog workflow")
    return im


def source_frame():
    im = canvas(); d = ImageDraw.Draw(im)
    header(d, "01 / material controls", "One model, real material knobs", "The turbine source assigns each control to the component it represents.")
    code = [
        "const paintedSteel = param('paintedSteel', '#53727c', { label: 'Painted steel' });",
        "const fiberglassComposite = param('fiberglassComposite', '#e7ebe1', { label: 'Fiberglass composite' });",
        "const stainlessSteel = param('stainlessSteel', '#b8c2c5', { label: 'Stainless steel' });",
        "",
        "presets({",
        '  weathered: {"paintedSteel": "#415961", "fiberglassComposite": "#f9fef3"},',
        '  highVisibility: {"fiberglassComposite": "#e48d35"},',
        "});",
        "",
        "p.part(\"tower\",towerShape([[0,145],[300,120],[2480,72]],10).color(paintedSteel));",
        "p.part(\"hub\",rotorHub(0,-180,2600,180,125,12).color(stainlessSteel));",
        "p.part(\"blade-up\",rotorBlade(1180,210,135,38,56,34).translate(0,-180,2600).color(fiberglassComposite));",
    ]
    d.rounded_rectangle((54, 155, 768, 555), radius=15, fill=PANEL, outline="#344651", width=2)
    y = 179
    for line in code:
        d.text((78, y), line, fill=TEAL if "param(" in line or "presets(" in line else TEXT, font=font(11, MONO)); y += 28
    d.rounded_rectangle((797, 155, 1226, 555), radius=15, fill=PANEL, outline="#344651", width=2)
    preview = Image.open(PREVIEWS / "horizontal-axis-wind-turbine.png").convert("RGB")
    preview.thumbnail((405, 330), Image.Resampling.LANCZOS)
    im.paste(preview, (809 + (405 - preview.width) // 2, 165 + (330 - preview.height) // 2))
    d.text((835, 510), "Tapered tower · swept blades · hub", fill=TEXT, font=font(15, BOLD))
    footer(d, "3 material controls + scale · 2 named color presets · source excerpt paired with its rendered preview")
    return im


def preset_frame():
    im = canvas(); d = ImageDraw.Draw(im)
    header(d, "02 / switch presets", "Named presets change the rendered model", "Images below were exported from the same source using its declared preset values.")
    entries = [
        ("Default", PREVIEWS / "horizontal-axis-wind-turbine.png", "painted steel · pale composite"),
        ("Weathered", BUNDLE / "preset-variants/weathered.png", "darker painted steel"),
        ("High visibility", BUNDLE / "preset-variants/highVisibility.png", "orange composite blades"),
    ]
    for i, (title, path, detail) in enumerate(entries):
        x = 54 + i * 397
        d.rounded_rectangle((x, 160, x + 370, 595), radius=15, fill=PANEL, outline="#344651", width=2)
        preview = Image.open(path).convert("RGB")
        preview.thumbnail((346, 330), Image.Resampling.LANCZOS)
        im.paste(preview, (x + (370 - preview.width) // 2, 174 + (330 - preview.height) // 2))
        d.text((x + 20, 523), title, fill=TEAL, font=font(20, BOLD))
        d.text((x + 20, 557), detail, fill=TEXT, font=font(13))
    footer(d, "Preset PNGs: runAndExport(GLB) → software rasterizer · variant settings retained in preset-variants.json")
    return im


def gallery_frame():
    im = canvas(); d = ImageDraw.Draw(im)
    header(d, "03 / kit previews", "Recognizable objects across the kit", "Rendered from the promoted source assets at their default material settings.")
    ids = [
        "horizontal-axis-wind-turbine", "offshore-wind-turbine", "wind-turbine-blade", "vertical-axis-wind-turbine",
        "wind-farm-pad-mount-transformer", "converter-cabinet", "maintenance-tool-cart", "service-shelter",
    ]
    card_w, card_h, gap_x, gap_y, x0, y0 = 282, 219, 12, 10, 54, 154
    for i, asset_id in enumerate(ids):
        col, row = i % 4, i // 4
        x, y = x0 + col * (card_w + gap_x), y0 + row * (card_h + gap_y)
        d.rounded_rectangle((x, y, x + card_w, y + card_h), radius=10, fill=PANEL, outline="#344651", width=1)
        preview = Image.open(PREVIEWS / f"{asset_id}.png").convert("RGB")
        preview.thumbnail((card_w - 16, 160), Image.Resampling.LANCZOS)
        im.paste(preview, (x + (card_w - preview.width) // 2, y + 2 + (160 - preview.height) // 2))
        titles = {
            "horizontal-axis-wind-turbine": "Horizontal-axis Turbine",
            "offshore-wind-turbine": "Offshore Turbine",
            "wind-turbine-blade": "Turbine Blade",
            "vertical-axis-wind-turbine": "Vertical-axis Turbine",
            "wind-farm-pad-mount-transformer": "Pad-mount Transformer",
            "converter-cabinet": "Converter Cabinet",
            "maintenance-tool-cart": "Maintenance Tool Cart",
            "service-shelter": "Service Shelter",
        }
        title = titles[asset_id]
        d.text((x + 9, y + 174), title, fill=TEXT, font=font(12, BOLD))
        d.text((x + 9, y + 195), "material colors · silhouette geometry", fill=TEAL, font=font(9, MONO))
    footer(d, "All 50 wind-energy assets have indexed, regenerated preview paths.")
    return im


def verification_frame():
    im = canvas(); d = ImageDraw.Draw(im)
    report = json.loads((BUNDLE / "verification.json").read_text())
    checks = json.loads((BUNDLE / "checks.json").read_text())
    global_quality = checks["catalogQuality"]
    integration = next(item for item in checks["checks"] if item["name"] == "catalog integration suite")
    header(d, "04 / verification", "Quality and local checks", "Evidence from the checked source, generated index, and local build.")
    rows = [
        ("Wind-energy quality gate", "50 / 50 pass · 2–4 material controls + presets"),
        ("Generated previews", f"{report['previewsPresent']} / 50 present · index source hashes match"),
        ("ESLint", "clean"),
        ("Catalog integration", f"{integration['filesPassed']} files · {integration['testsPassed']} tests passed"),
        ("Full catalog quality", f"{global_quality['passing']} / {global_quality['total']} pass ({global_quality['passRate']}) · {global_quality['thin']} thin"),
        ("Generated local pages", "2,390 pages built · 50 wind-energy pages and previews checked"),
    ]
    d.rounded_rectangle((54, 153, 1226, 580), radius=16, fill=PANEL, outline="#344651", width=2)
    y = 180
    for label, value in rows:
        d.text((82, y), label, fill=TEAL, font=font(17, BOLD))
        d.text((475, y), value, fill=TEXT, font=font(16)); y += 58
    d.rounded_rectangle((82, 531, 1197, 566), radius=8, fill="#493c22")
    d.text((96, 539), "Local validation only · this branch is not deployed · no engineering or physical acceptance claim", fill=GOLD, font=font(13, BOLD))
    footer(d, "Build and source checks do not establish deployed behavior, manufacturing suitability or hardware acceptance.")
    return im


def main():
    required = ["verification.json", "preset-variants.json", "checks.json"]
    if not all((BUNDLE / name).is_file() for name in required):
        raise SystemExit(f"missing required evidence: {[n for n in required if not (BUNDLE / n).is_file()]}")
    index = json.loads((ROOT / "catalog/index.json").read_text())
    assets = [asset for asset in index["assets"] if asset["kit"] == "wind-energy"]
    if len(assets) != 50 or not all((PREVIEWS / f"{asset['id']}.png").is_file() for asset in assets):
        raise SystemExit("expected all 50 indexed wind-energy previews before capture")
    frames = [title_frame(), source_frame(), preset_frame(), gallery_frame(), verification_frame()]
    frame_dir = BUNDLE / "frames"
    frame_dir.mkdir(parents=True, exist_ok=True)
    for i, frame in enumerate(frames, 1):
        frame.save(frame_dir / f"frame-{i:02d}.png", optimize=True)
    out = BUNDLE / "wind-energy-quality-demo.mp4"
    settings = {
        "command": "python3 artifacts/catalog-demos/wind-energy-quality-20261105/capture_wind_quality_demo.py",
        "output": str(out.relative_to(ROOT)), "resolution": "1280x720", "duration_seconds": 20,
        "frames": 5, "seconds_per_frame": 4, "video_codec": "libx264", "pixel_format": "yuv420p",
        "frame_rate": 24, "crf": 24, "movflags": ["faststart"], "source": "local catalog source, previews, preset renders and verification evidence",
    }
    (BUNDLE / "demo-settings.json").write_text(json.dumps(settings, indent=2) + "\n")
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "1/4",
        "-i", str(frame_dir / "frame-%02d.png"), "-c:v", "libx264", "-r", "24",
        "-pix_fmt", "yuv420p", "-crf", "24", "-movflags", "+faststart", str(out),
    ], check=True)
    (BUNDLE / "poster.png").write_bytes((frame_dir / "frame-01.png").read_bytes())
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
