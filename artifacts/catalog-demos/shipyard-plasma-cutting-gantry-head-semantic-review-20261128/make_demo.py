from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import subprocess

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'video-inputs'
OUT.mkdir(parents=True, exist_ok=True)
W, H = 1280, 720
BG = '#edf2f5'
INK = '#20313c'
MUTED = '#536675'
ACCENT = '#d77726'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FONT_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

def font(size, bold=False):
    path = FONT_BOLD if bold else FONT
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()

def base(title, kicker):
    im = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(im)
    d.text((58, 34), kicker.upper(), font=font(18, True), fill=ACCENT)
    d.text((58, 70), title, font=font(34, True), fill=INK)
    d.line((58, 124, W - 58, 124), fill='#c8d2d9', width=2)
    return im, d

def fit_preview(name, path, x, y, w, h):
    image = Image.open(path).convert('RGB')
    image.thumbnail((w, h), Image.Resampling.LANCZOS)
    canvas = Image.new('RGB', (w, h), '#f8fafb')
    canvas.paste(image, ((w - image.width) // 2, (h - image.height) // 2))
    name.paste(canvas, (x, y))

def save(im, n):
    im.save(OUT / f'slide-{n:02d}.png', optimize=True)

before = ROOT / 'before/plasma-cutting-gantry-head.png'
after = ROOT / 'after/plasma-cutting-gantry-head.png'

im, d = base('The asset ID said “head”', 'Catalog preview audit · 2026-11-28')
fit_preview(im, before, 58, 150, 540, 500)
d.text((640, 180), 'Existing model', font=font(22, True), fill=INK)
d.text((640, 226), 'The render contained the complete', font=font(20), fill=MUTED)
d.text((640, 256), 'cutting machine: table, floor rails,', font=font(20), fill=MUTED)
d.text((640, 286), 'full bridge, extraction and console.', font=font(20), fill=MUTED)
d.rounded_rectangle((640, 372, 1130, 448), radius=12, fill='#fff3e8', outline='#efc59e', width=2)
d.text((668, 390), 'Mismatch: component label vs full system', font=font(18, True), fill='#824618')
save(im, 1)

im, d = base('Keep the head; remove the machine', 'Source correction · stable asset ID preserved')
fit_preview(im, before, 58, 155, 420, 390)
fit_preview(im, after, 490, 155, 420, 390)
d.text((135, 556), 'Before · full cutting system', font=font(19, True), fill=MUTED)
d.text((572, 556), 'After · torch-head assembly', font=font(19, True), fill=MUTED)
d.text((965, 190), 'Retained', font=font(22, True), fill=INK)
d.text((965, 236), '• short bridge segment', font=font(18), fill=MUTED)
d.text((965, 272), '• cross-slide and guides', font=font(18), fill=MUTED)
d.text((965, 308), '• motorized Z lifter', font=font(18), fill=MUTED)
d.text((965, 344), '• torch, clamp and cable', font=font(18), fill=MUTED)
d.text((965, 420), 'Removed', font=font(22, True), fill=INK)
d.text((965, 466), 'Full table, floor rails,', font=font(18), fill=MUTED)
d.text((965, 496), 'extraction and console', font=font(18), fill=MUTED)
save(im, 2)

im, d = base('The rendered head reads as a component', 'Updated local catalog preview')
fit_preview(im, after, 78, 150, 570, 520)
d.text((700, 190), '1,360 × 1,158 × 618 mm', font=font(27, True), fill=INK)
d.text((700, 244), '1,024 triangles · 1,600 budget', font=font(20), fill=MUTED)
d.text((700, 310), '4 material controls', font=font(22, True), fill=INK)
d.text((700, 350), 'painted steel · machined steel', font=font(18), fill=MUTED)
d.text((700, 380), 'cable polymer · copper alloy', font=font(18), fill=MUTED)
d.text((700, 444), '3 editable appearance presets', font=font(22, True), fill=INK)
d.text((700, 492), 'fresh-coat · weathered-yard', font=font(18), fill=MUTED)
d.text((700, 522), 'blue-machine', font=font(18), fill=MUTED)
save(im, 3)

im, d = base('Local regression confirms the scope', 'Verification evidence · 2026-11-28')
d.rounded_rectangle((70, 170, 1210, 470), radius=20, fill='#ffffff', outline='#c8d2d9', width=2)
d.text((112, 208), 'PASS  ·  exported-GLB geometry regression', font=font(25, True), fill='#17603b')
d.text((112, 270), '• Requires the bridge, guides, Z lifter, clamp and torch parts', font=font(20), fill=INK)
d.text((112, 315), '• Rejects table, slat, floor-rail, extraction and operator-station parts', font=font(20), fill=INK)
d.text((112, 360), '• Checks the measured envelope and the 1,600-triangle budget', font=font(20), fill=INK)
d.text((58, 540), 'Local preview and software geometry regression only.', font=font(22, True), fill=INK)
d.text((58, 580), 'No cutting-process simulation, deployment or physical-machine acceptance is claimed.', font=font(18), fill=MUTED)
save(im, 4)

video = ROOT / 'review-demo.mp4'
inputs = [OUT / f'slide-{n:02d}.png' for n in range(1, 5)]
durations = [3.0, 3.0, 3.5, 3.0]
cmd = ['ffmpeg', '-y', '-loglevel', 'error']
for image, duration in zip(inputs, durations):
    cmd += ['-loop', '1', '-framerate', '24', '-t', str(duration), '-i', str(image)]
filters = []
for n in range(len(inputs)):
    filters.append(f'[{n}:v]fps=24,format=yuv420p,setpts=PTS-STARTPTS[v{n}]')
filters.append(''.join(f'[v{n}]' for n in range(len(inputs))) + f'concat=n={len(inputs)}:v=1:a=0[v]')
cmd += ['-filter_complex', ';'.join(filters), '-map', '[v]', '-r', '24', '-c:v', 'libx264', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(video)]
subprocess.run(cmd, check=True)
print(video)
