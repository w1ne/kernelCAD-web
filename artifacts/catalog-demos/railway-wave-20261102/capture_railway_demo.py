#!/usr/bin/env python3
"""Create a short demo from real railway source, preview and audit evidence."""
import json
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / 'catalog' / 'kits' / 'railway'
PREVIEWS = KIT / 'previews'
INDEX = ROOT / 'catalog' / 'index.json'
CHECKS = BUNDLE / 'asset-check-results.json'
PAGES = BUNDLE / 'catalog-pages-check.json'
TESTS = BUNDLE / 'catalog-tests.json'
FRAMES = BUNDLE / 'frames'
OUT = BUNDLE / 'railway-kit.mp4'
W, H = 1280, 720
BG, PANEL, TEXT, MUTED, TEAL = '#111923', '#1d2935', '#eef3f5', '#a6b6c0', '#61c6bf'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
GROUPS = [
    ('Locomotives and passenger cars', ['steam-locomotive', 'diesel-locomotive', 'electric-locomotive', 'passenger-coach', 'commuter-car', 'subway-car', 'caboose', 'maintenance-railcar']),
    ('Freight and rail vehicles', ['freight-boxcar', 'tank-wagon', 'hopper-wagon', 'flatbed-wagon', 'lumber-wagon', 'mail-car', 'dining-car', 'handcar']),
    ('Track and maintenance', ['straight-track', 'curved-track', 'turnout-track', 'level-crossing', 'buffer-stop', 'rail-sleeper', 'track-switch-lever', 'inspection-trolley']),
    ('Signals and crossing equipment', ['semaphore-signal', 'signal-light', 'signal-gantry', 'crossing-gate', 'crossing-warning-light', 'milepost', 'railway-lantern', 'station-clock']),
    ('Station and passenger equipment', ['station-platform', 'platform-canopy', 'station-bench', 'timetable-board', 'railway-ticket-machine', 'ticket-barrier', 'baggage-cart', 'luggage-stack']),
]


def font(size, path=FONT): return ImageFont.truetype(path, size)
def canvas(): return Image.new('RGB', (W, H), BG)
def footer(draw, text):
    draw.line((54, 678, W - 54, 678), fill='#35434e', width=1)
    draw.text((54, 688), text, fill=MUTED, font=font(13))
def header(draw, kicker, title, detail):
    draw.text((54, 32), kicker.upper(), fill=TEAL, font=font(17, BOLD))
    draw.text((54, 65), title, fill=TEXT, font=font(34, BOLD))
    draw.text((54, 110), detail, fill=MUTED, font=font(17))

def title_frame():
    im=canvas(); d=ImageDraw.Draw(im)
    d.text((72,76),'kernelCAD  /  ASSET CATALOG',fill=TEAL,font=font(20,BOLD))
    d.text((72,162),'RAILWAY',fill=TEXT,font=font(72,BOLD))
    d.text((76,262),'40 editable low-poly scene props',fill=TEXT,font=font(32))
    d.text((76,316),'Locomotives  ·  rolling stock  ·  track  ·  signals  ·  stations',fill=MUTED,font=font(21))
    d.rounded_rectangle((72,414,1208,550),radius=16,fill=PANEL,outline='#344651',width=2)
    d.text((102,440),'Native .kcad.ts source, generated mesh and two knobs per asset',fill=TEXT,font=font(23,BOLD))
    d.text((102,492),'CC0 1.0   /   millimetres   /   Z up   /   base origin',fill=TEAL,font=font(20))
    footer(d,'Original kernelCAD geometry · local catalog workflow')
    return im

def source_frame():
    im=canvas();d=ImageDraw.Draw(im)
    header(d,'01 / author','Editable model source','Steam locomotive: the overall scale drives all parts; the color control sets its single material.')
    lines=(KIT/'steam-locomotive.kcad.ts').read_text().splitlines(); y=160
    for line in lines[:25]:
        text=line.strip()
        if len(text)>66:text=text[:63]+'…'
        d.text((58,y),text,fill=TEXT,font=font(13,MONO));y+=21
    d.rounded_rectangle((779,165,1207,565),radius=16,fill=PANEL,outline='#344651',width=2)
    preview=Image.open(PREVIEWS/'steam-locomotive.png').convert('RGB');preview.thumbnail((395,300),Image.Resampling.LANCZOS)
    im.paste(preview,(795+(395-preview.width)//2,182+(300-preview.height)//2))
    d.text((809,500),'scale  0.65 — 1.35',fill=TEAL,font=font(18,BOLD))
    d.text((809,530),'color  user-selectable',fill=TEXT,font=font(17))
    footer(d,'The generated index lists the same two controls for every source model.')
    return im

def contact_frame(index,title,detail,ids):
    im=canvas();d=ImageDraw.Draw(im)
    header(d,f'02 / generated previews  ·  set {index}',title,detail)
    cw,ch,gx,gy,x0,y0=278,226,18,12,54,160
    for i,asset_id in enumerate(ids):
        col,row=i%4,i//4;x=x0+col*(cw+gx);y=y0+row*(ch+gy)
        d.rounded_rectangle((x,y,x+cw,y+ch),radius=10,fill=PANEL,outline='#344651',width=1)
        preview=Image.open(PREVIEWS/f'{asset_id}.png').convert('RGB');preview.thumbnail((cw-16,174),Image.Resampling.LANCZOS)
        im.paste(preview,(x+(cw-preview.width)//2,y+4+(174-preview.height)//2))
        label=asset_id.replace('-',' ').title()
        if len(label)>32:label=label[:30]+'…'
        d.text((x+10,y+190),label,fill=TEXT,font=font(14,BOLD))
        d.text((x+10,y+209),'scale · color',fill=TEAL,font=font(11,MONO))
    footer(d,'Default-param previews rendered from each catalog-indexed .kcad.ts source')
    return im

def verification_frame():
    im=canvas();d=ImageDraw.Draw(im)
    header(d,'03 / local verification','Catalog audit and generated pages','Source, mesh, index, lint, integration suite and local pages were checked.')
    checks,pages,tests,index=(json.loads(p.read_text()) for p in (CHECKS,PAGES,TESTS,INDEX))
    d.rounded_rectangle((54,178,1226,548),radius=18,fill=PANEL,outline='#344651',width=2)
    rows=[
        ('Catalog integration suite',f"{tests['filesPassed']} files · {tests['testsPassed']} tests passed"),
        ('Railway source assets',f"{checks['passed']} / {checks['total']} audited"),
        ('Material and triangle budget',f"1 material each · {checks['triangleRange'][0]}–{checks['triangleRange'][1]} triangles"),
        ('Indexed knobs and base','scale + color · all meshes start at z = 0'),
        ('Local generated pages',f"{pages['kitPages']} pages · {len(index['assets'])} assets total"),
    ]
    y=211
    for label,value in rows:
        d.text((90,y),label,fill=TEAL,font=font(18,BOLD));d.text((490,y),value,fill=TEXT,font=font(18));y+=53
    d.text((90,493),'Website deployment: unverified pending merge; this is local catalog evidence.',fill=MUTED,font=font(15))
    d.text((90,520),'No transport safety, track fit, signaling compliance or operational acceptance is claimed.',fill=MUTED,font=font(14))
    footer(d,'Local validation only · deployed behavior remains unverified')
    return im

def main():
    index=json.loads(INDEX.read_text());assets=[a for a in index['assets'] if a['kit']=='railway']
    if len(assets)!=40:raise SystemExit(f'expected 40 railway records, found {len(assets)}')
    if any(not p.exists() for p in (CHECKS,PAGES,TESTS)):raise SystemExit('local audit/page/test evidence is missing')
    if any(not (PREVIEWS/f'{a["id"]}.png').exists() for a in assets):raise SystemExit('generated preview missing')
    FRAMES.mkdir(parents=True,exist_ok=True)
    frames=[title_frame(),source_frame()]
    details=[
        ('Locomotives and passenger cars','Steam, diesel, electric and passenger rolling stock'),
        ('Freight and rail vehicles','Freight wagons, service cars and hand-powered rail equipment'),
        ('Track and maintenance','Track sections, crossings, switches and inspection equipment'),
        ('Signals and crossing equipment','Semaphore, signal heads, crossing arms and trackside markers'),
        ('Station and passenger equipment','Platform fixtures, ticketing and passenger luggage'),
    ]
    for i,((title,detail),(_,ids)) in enumerate(zip(details,GROUPS),start=1):frames.append(contact_frame(i,title,detail,ids))
    frames.append(verification_frame())
    if len(frames)!=8:raise SystemExit(f'expected 8 frames, found {len(frames)}')
    for i,frame in enumerate(frames,1):frame.save(FRAMES/f'frame-{i:02d}.png',optimize=True)
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-framerate','1/3','-i',str(FRAMES/'frame-%02d.png'),'-c:v','libx264','-r','24','-pix_fmt','yuv420p','-crf','25','-movflags','+faststart',str(OUT)],check=True)
    Image.open(FRAMES/'frame-01.png').save(BUNDLE/'poster.png',optimize=True)
    print(f'wrote {OUT}')

if __name__=='__main__':main()
