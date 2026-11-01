#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
"""Render transcript.txt (written by demo.sh) into terminal frames and demo.mp4.

One scene per command: the caption names what the step shows, the command is
"typed", then its real output appears. Text is drawn verbatim from the
transcript; only line wrapping is added. Usage: python3 -I render_terminal.py
"""
import os
import shutil
import subprocess
import sys
import tempfile
import textwrap

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 1600, 900
FPS = 24
FONT_PATHS = [
    '/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Regular.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
]
CAPTIONS = [
    'Sandbox status: workspace root, read-only runtime roots, network and telemetry policy',
    'In-workspace STEP export succeeds (NEMA 17 plate: 60 x 60 x 5 mm, 22.5 mm bore, 4 x M3)',
    'The exported STEP is real: 15830 mm3, one 22.5 mm bore and four 3.4 mm holes',
    'Path escape with ".." is refused before anything is written: cli.sandbox-path-denied',
    'Symlink escape: workspace/escape -> /etc is followed and refused',
    'kernelcad mcp --sandbox: network tool arguments refused up front (cli.sandbox-network-denied)',
]
BG, FG, DIM, PROMPT, ERR, OK, CAP = (18, 20, 24), (220, 223, 228), (130, 136, 146), (120, 200, 255), (255, 120, 110), (130, 220, 140), (255, 210, 120)


def font(size):
    for p in FONT_PATHS:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


F = font(19)
FC = font(24)
CW = F.getlength('M')
LH = 27
COLS = int((W - 80) // CW) - 1


def scenes():
    text = open(os.path.join(HERE, 'transcript.txt'), encoding='utf8').read().strip()
    blocks = [b for b in text.split('\n\n') if b.strip()]
    out = []
    for i, b in enumerate(blocks):
        lines = b.split('\n')
        out.append((CAPTIONS[i] if i < len(CAPTIONS) else '', lines[0], lines[1:]))
    return out


def wrap(line):
    return textwrap.wrap(line, COLS, subsequent_indent='    ', drop_whitespace=False) or ['']


def colour(line):
    if line.startswith('ERROR') or 'isError' in line or 'REFUSED' in line:
        return ERR
    if line.startswith('[exit 0]') or line.startswith('Wrote') or '→ ok' in line or line.startswith('sandbox: ON'):
        return OK
    if line.startswith('[exit') or line.strip().startswith('Hint:'):
        return DIM
    return FG


def frame(caption, step, cmd_typed, out_lines):
    img = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 100], fill=(30, 33, 40))
    d.text((40, 14), f'kernelCAD sandbox mode  ·  step {step}/6', font=FC, fill=DIM)
    d.text((40, 54), caption, font=FC, fill=CAP)
    y = 124
    for seg in wrap('$ ' + cmd_typed):
        d.text((40, y), seg, font=F, fill=PROMPT)
        y += LH
    y += 6
    for line in out_lines:
        for seg in wrap(line):
            if y > H - 70:
                break
            d.text((40, y), seg, font=F, fill=colour(line))
            y += LH
    d.text((40, H - 44), 'Local run of this branch (dist/cli/index.js), Linux, 2026-10-31. Real output; OCCT banner + heap re-exec lines filtered (README).', font=F, fill=DIM)
    return img


def main():
    tmp = tempfile.mkdtemp(prefix='sbx-frames-')
    n = 0

    def emit(img, seconds):
        nonlocal n
        for _ in range(max(1, int(seconds * FPS))):
            img.save(os.path.join(tmp, f'f{n:05d}.png'))
            n += 1

    for step, (cap, cmd_line, output) in enumerate(scenes(), start=1):
        cmd = cmd_line[2:]
        for k in range(0, len(cmd) + 1, max(1, len(cmd) // 20)):
            emit(frame(cap, step, cmd[:k], []), 0.06)
        emit(frame(cap, step, cmd, []), 0.4)
        emit(frame(cap, step, cmd, output), 4.6)
    out = os.path.join(HERE, 'demo.mp4')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', os.path.join(tmp, 'f%05d.png'),
                    '-vf', 'format=yuv420p', '-c:v', 'libx264', '-crf', '26', '-preset', 'slow', '-movflags', '+faststart', out], check=True)
    shutil.rmtree(tmp)
    print(f'wrote {out} ({n} frames)')


if __name__ == '__main__':
    sys.exit(main())
