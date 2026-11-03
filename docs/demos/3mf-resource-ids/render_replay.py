#!/usr/bin/env python3
"""Render a labeled replay from actual exporter transcript; writes only here."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json
import subprocess

OUT = Path(__file__).resolve().parent
evidence = json.loads((OUT / 'evidence.json').read_text())
lines = (OUT / 'transcript.txt').read_text().splitlines()
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
font = ImageFont.truetype(FONT, 22)
small = ImageFont.truetype(FONT, 20)
title = ImageFont.truetype(FONT, 32)
panels = [
    ('1 / 3   Actual local exporter invocation', lines[:1] + [''] + lines[2:6], 5),
    ('2 / 3   Inspect generated resource references', lines[6:11], 6),
    ('3 / 3   Verify geometry and identity', lines[9:15], 7),
]
frames = []
for subtitle, panel, duration in panels:
    im = Image.new('RGB', (1280,720), '#0b1120')
    draw = ImageDraw.Draw(im)
    draw.text((48,36), 'kernelCAD / 3MF resource IDs', font=title, fill='#f0f5ff')
    draw.text((48,90), subtitle, font=small, fill='#8ab4f8')
    draw.rounded_rectangle((36,140,1244,592), radius=14, fill='#121d31', outline='#29415f', width=2)
    for i, line in enumerate(panel):
        color = '#91e6ba' if line.startswith(('PASS','RESULT')) else '#e5ecf7'
        draw.text((60,172+i*49), line, font=font, fill=color)
    draw.text((48,624), evidence['scope'], font=small, fill='#f5ce87')
    draw.text((48,661), 'Generic injected mesh | transcript replay | source + evidence retained', font=small, fill='#a6b5cd')
    frames.append((im,duration))

command = ['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24',
           '-s','1280x720','-r','12','-i','pipe:0','-an','-c:v','libx264',
           '-preset','fast','-crf','28','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/'demo.mp4')]
process = subprocess.Popen(command, stdin=subprocess.PIPE)
assert process.stdin is not None
for im, duration in frames:
    payload = im.tobytes()
    for _ in range(duration*12):
        process.stdin.write(payload)
process.stdin.close()
if process.wait() != 0:
    raise SystemExit('FFmpeg failed')
subprocess.run(['ffmpeg','-y','-loglevel','error','-ss','14','-i',str(OUT/'demo.mp4'),
                '-frames:v','1',str(OUT/'poster.png')], check=True)
print(f"Created demo.mp4 ({(OUT/'demo.mp4').stat().st_size} bytes), 18 seconds, 1280x720")
