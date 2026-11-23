#!/usr/bin/env python3
"""Build the short local preview and material-regression handoff video."""

from pathlib import Path
import subprocess

from PIL import Image, ImageDraw, ImageFont


ARTIFACTS = Path(__file__).resolve().parent
REPO = ARTIFACTS.parents[2]
SAMPLES = ARTIFACTS / "samples" / "previews"
SLIDES = ARTIFACTS / "video-inputs"
VIDEO = ARTIFACTS / "beverage-carton-bottom-sealer-tape-head-material-review.mp4"
FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

BG = "#f1f5f8"
INK = "#1d2b39"
MUTED = "#536779"
BLUE = "#1b506d"
ACCENT = "#da9b26"


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_PATH, size)


def canvas(title: str, subtitle: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (1280, 720), BG)
    draw = ImageDraw.Draw(image)
    draw.text((64, 44), title, fill=INK, font=font(36))
    draw.text((64, 97), subtitle, fill=MUTED, font=font(21))
    draw.line((64, 143, 1216, 143), fill="#c8d3dc", width=2)
    draw.text((64, 678), "kernelCAD local preview and exported-GLB material check", fill=MUTED, font=font(16))
    return image, draw


def contain(path: Path, size: tuple[int, int]) -> Image.Image:
    image = Image.open(path).convert("RGB")
    image.thumbnail(size, Image.Resampling.LANCZOS)
    frame = Image.new("RGB", size, "#e5edf2")
    frame.paste(image, ((size[0] - image.width) // 2, (size[1] - image.height) // 2))
    return frame


def save_audit() -> None:
    image, draw = canvas("Five-preview audit", "Beverage bottling line · five current rendered assets · 18 Nov 2026")
    names = [
        ("cap-feed-hopper", "Cap feed hopper"),
        ("slip-sheet-dispenser", "Slip-sheet dispenser"),
        ("stretch-wrapper", "Pallet stretch wrapper"),
        ("wraparound-labeler", "Wraparound labeler"),
        ("carton-bottom-sealer", "Carton bottom sealer"),
    ]
    x_positions = [70, 310, 550, 790, 1030]
    for (asset_id, label), x in zip(names, x_positions, strict=True):
        image.paste(contain(SAMPLES / f"{asset_id}.png", (205, 245)), (x, 195))
        draw.text((x + 4, 456), label, fill=INK, font=font(17))
        draw.text((x + 4, 484), "preview + source checked", fill=MUTED, font=font(14))
    draw.rounded_rectangle((70, 545, 1210, 627), radius=16, fill="#e0edf2")
    draw.text((96, 560), "Selected mismatch", fill=BLUE, font=font(20))
    draw.text((300, 563), "steel taping head was grouped with polymer tape by a broad name rule", fill=INK, font=font(18))
    image.save(SLIDES / "slide-01-five-preview-audit.png")


def save_before_after() -> None:
    image, draw = canvas("Before and after", "Only the material assignment changed; the 176-triangle silhouette is unchanged")
    before = contain(ARTIFACTS / "before" / "carton-bottom-sealer.png", (470, 470))
    after = contain(REPO / "catalog/kits/beverage-bottling-line/previews/carton-bottom-sealer.png", (470, 470))
    image.paste(before, (105, 176))
    image.paste(after, (705, 176))
    draw.text((118, 650), "Before · head and roll both teal polymer", fill=INK, font=font(18))
    draw.text((718, 650), "After · steel head gray, tape roll teal", fill=INK, font=font(18))
    draw.line((640, 250, 640, 610), fill="#c8d3dc", width=2)
    image.save(SLIDES / "slide-02-before-after.png")


def save_material_map() -> None:
    image, draw = canvas("Material mapping", "Part names now distinguish the reusable mechanism from consumable film")
    draw.rounded_rectangle((82, 190, 1198, 602), radius=22, fill="white", outline="#d0dbe3", width=2)
    draw.text((126, 226), "Part", fill=MUTED, font=font(18))
    draw.text((500, 226), "Control", fill=MUTED, font=font(18))
    draw.text((800, 226), "Default finish", fill=MUTED, font=font(18))
    rows = [
        ("tape-head", "stainlessSteel", "#aebdc1", "steel mechanism"),
        ("tape-roll", "foodPolymer", "#3999a1", "film tape"),
        ("base-frame", "powderCoat", "#397e91", "painted frame"),
    ]
    y = 290
    for part, control, color, role in rows:
        draw.rounded_rectangle((126, y + 2, 176, y + 42), radius=8, fill=color)
        draw.text((195, y), part, fill=INK, font=font(20))
        draw.text((500, y), control, fill=INK, font=font(20))
        draw.text((800, y), f"{role} · {color}", fill=INK, font=font(18))
        y += 90
    draw.text((126, 564), "The explicit tape-head rule runs before the generic tape / film polymer rule.", fill=BLUE, font=font(17))
    image.save(SLIDES / "slide-03-material-map.png")


def save_regression() -> None:
    image, draw = canvas("Exported-GLB regression", "The check failed on the baseline source, then passed with the corrected material map")
    draw.rounded_rectangle((86, 190, 1194, 356), radius=20, fill="#fff1ef", outline="#e8c1bb", width=2)
    draw.text((126, 222), "BASELINE", fill="#963b35", font=font(21))
    draw.text((126, 264), "✕  stainlessSteel zone did not contain tape-head", fill=INK, font=font(24))
    draw.rounded_rectangle((86, 388, 1194, 592), radius=20, fill="#eaf5ec", outline="#c2ddc7", width=2)
    draw.text((126, 421), "CORRECTED GLB", fill="#27643c", font=font(21))
    draw.text((126, 464), "✓  tape-head = stainlessSteel", fill=INK, font=font(24))
    draw.text((126, 511), "✓  tape-roll = foodPolymer · 176 triangles / 2,200 budget", fill=INK, font=font(22))
    image.save(SLIDES / "slide-04-regression.png")


def save_scope() -> None:
    image, draw = canvas("Verification and scope", "Preview regeneration · generated-index refresh · focused and catalog checks")
    items = [
        ("PASS", "beverage-bottling-line ESLint"),
        ("PASS", "focused exported-GLB regression"),
        ("PASS", "catalog integration suite"),
        ("PASS", "source SHA-256 and preview path in generated index"),
    ]
    y = 205
    for status, label in items:
        draw.rounded_rectangle((100, y, 205, y + 48), radius=12, fill="#d9ecdf")
        draw.text((120, y + 10), status, fill="#27643c", font=font(18))
        draw.text((236, y + 7), label, fill=INK, font=font(22))
        y += 83
    draw.rounded_rectangle((100, 570, 1180, 640), radius=14, fill="#fff4de")
    draw.text((126, 586), "Local software preview and GLB material check only — not simulation or hardware acceptance.", fill=INK, font=font(17))
    image.save(SLIDES / "slide-05-verification.png")


def main() -> None:
    SLIDES.mkdir(parents=True, exist_ok=True)
    save_audit()
    save_before_after()
    save_material_map()
    save_regression()
    save_scope()
    concat = SLIDES / "ffmpeg-concat.txt"
    lines = []
    for slide in sorted(SLIDES.glob("slide-*.png")):
        lines.extend((f"file '{slide.resolve()}'", "duration 3"))
    lines.append(f"file '{(SLIDES / 'slide-05-verification.png').resolve()}'")
    concat.write_text("\n".join(lines) + "\n", encoding="utf-8")
    subprocess.run(
        [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat),
            "-vf", "fps=30,format=yuv420p", "-t", "15", "-c:v", "libx264",
            "-preset", "medium", "-crf", "22", str(VIDEO),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


if __name__ == "__main__":
    main()
