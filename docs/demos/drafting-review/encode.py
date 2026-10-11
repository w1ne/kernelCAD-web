"""Crop actual captured dialog frames; captions describe only recorded actions."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

base = Path(__file__).resolve().parent
receipt = json.loads((base / 'receipt.json').read_text())
encoded = base / 'encoded-frames'
encoded.mkdir(exist_ok=True)
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 20)
files = []
for i, timestamp in enumerate(receipt['samples']):
    image = Image.open(base / 'frames' / f'{i:05d}.jpg').convert('RGB')
    # The modal left edge has a blue surface; viewport/background pixels do not.
    ys = [y for y in range(image.height) if (lambda p: p[2] > 34 and p[2]-p[0] > 17)(image.getpixel((145,y)))]
    top, bottom = max(0,min(ys)-4), min(image.height,max(ys)+5)
    cropped = image.crop((144,top,1296,bottom))
    canvas = Image.new('RGB',(1152,1060),(12,16,23))
    canvas.paste(cropped,(0,max(0,(996-cropped.height)//2)))
    draw = ImageDraw.Draw(canvas)
    draw.text((18,1000),'LOCAL Studio validation · illustrative model · recorded UI cuts',font=font,fill='white')
    label = ('Generate the drawing preview' if timestamp < 7 else
             'Select a hole callout' if timestamp < 13 else
             'Edit the primary label and extra offset' if timestamp < 23 else
             'Refresh and inspect the updated drawing' if timestamp < 32 else
             'Mark the preview reviewed' if timestamp < 36 else
             'Export reviewed PDF · actual %PDF-1.4 file verified')
    draw.text((18,1030),label,font=font,fill=(164,199,247))
    path = encoded / f'{i:05d}.png'
    canvas.save(path)
    duration = ((receipt['samples'][i+1]-timestamp) if i+1 < len(receipt['samples']) else 4)*0.82
    files.append(f"file '{path}'\nduration {duration:.6f}\n")
files.append(f"file '{path}'\n")
(base / 'frames.ffconcat').write_text('ffconcat version 1.0\n'+''.join(files))
