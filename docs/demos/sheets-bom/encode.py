from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).parent / 'frames'
OUT.mkdir(exist_ok=True)
W, H = 1280, 720
font_path = '/System/Library/Fonts/Supplemental/Arial.ttf'
font = ImageFont.truetype(font_path, 32)
small = ImageFont.truetype(font_path, 23)

def slide(filename, title, lines, accent=(112, 215, 180)):
    im = Image.new('RGB', (W, H), '#111827')
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((54, 54, W - 54, H - 54), radius=24, fill='#1f2937', outline='#374151', width=2)
    d.text((96, 92), 'kernelCAD  /  write_bom', font=small, fill='#9ca3af')
    d.text((96, 148), title, font=font, fill=accent)
    y = 230
    for line in lines:
        d.text((106, y), line, font=small, fill='#f3f4f6')
        y += 54
    d.text((96, H - 104), 'LOCAL VALIDATION  ·  CSV FALLBACK  ·  no Sheets connection', font=small, fill='#fbbf24')
    im.save(OUT / filename)

slide('01.png', 'LabWired handoff', [
    'Drawbot · schema 0.1',
    '7 parts · ref and MPN status retained',
    'Handoff is supplied as the agent tool input',
])
slide('02.png', 'Merge catalog data', [
    'KernelCAD example catalog entries match by ref',
    'MPN and unit price fill when available',
    'Extra fasteners become additional BOM rows',
], accent=(147, 197, 253))
slide('03.png', 'Write BOM rows', [
    'Columns: ref · qty · part · MPN · source · unit price · notes',
    'No injected Sheets adapter is configured in this run',
    'The tool writes CSV and returns both path and contents',
], accent=(196, 181, 253))
slide('04.png', 'CSV result', [
    '7 handoff rows + 2 catalog additions',
    'CSV saved to docs/demos/sheets-bom/bom.csv',
    'Sheets append path is covered by the mocked client test',
])
