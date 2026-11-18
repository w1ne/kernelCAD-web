#!/usr/bin/env python3
"""Create a short, captioned source-to-preview semantic-review demo."""
import json
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
WIDTH, HEIGHT = 1280, 720
BG, PANEL, TEXT, MUTED, CYAN = '#101923', '#1d2935', '#eef3f5', '#a6b6c0', '#61c6bf'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
FRAMES = BUNDLE / 'frames'
OUT = BUNDLE / 'beverage-cap-elevator-semantic-review.mp4'
def font(size, bold=False): return ImageFont.truetype(BOLD if bold else FONT, size)
def canvas(): return Image.new('RGB', (WIDTH, HEIGHT), BG)
def header(draw, section, title, detail):
    draw.text((54, 25), section.upper(), fill=CYAN, font=font(15, True))
    draw.text((54, 54), title, fill=TEXT, font=font(29, True))
    draw.text((54, 96), detail, fill=MUTED, font=font(14))
def footer(draw):
    draw.line((54, 678, WIDTH-54, 678), fill='#35434e', width=1)
    draw.text((54, 688), 'Local source replay and software render only · not deployed · no physical acceptance', fill=MUTED, font=font(11))
def paste_fit(target, path, box):
    x, y, w, h = box
    with Image.open(path) as src:
        src = src.convert('RGB'); src.thumbnail((w, h), Image.Resampling.LANCZOS)
        target.paste(src, (x+(w-src.width)//2, y+(h-src.height)//2))
def title_frame(report):
    img=canvas(); d=ImageDraw.Draw(img)
    d.text((72,68), 'kernelCAD  /  CATALOG SEMANTIC REVIEW', fill=CYAN, font=font(17,True))
    d.text((72,122), 'BOTTLE-CAP ELEVATOR', fill=TEXT, font=font(42,True))
    d.text((76,186), 'Make the conveyor flights visible in the catalog preview.', fill=TEXT, font=font(19))
    d.rounded_rectangle((72,264,1208,546), radius=18, fill=PANEL, outline='#344651', width=2)
    paste_fit(img, BUNDLE/'before/cap-elevator.png', (104,290,310,225))
    paste_fit(img, BUNDLE/'after-cap-elevator.png', (478,290,310,225))
    d.text((130,526), '188 tris · enclosed slab', fill=MUTED, font=font(14))
    d.text((499,526), f"{report['triangles']} tris · visible flights", fill=CYAN, font=font(14,True))
    d.text((858,334), 'Existing asset refined', fill=TEXT, font=font(19,True))
    d.text((858,378), '4 material controls', fill=TEXT, font=font(16))
    d.text((858,414), '2 appearance presets', fill=TEXT, font=font(16))
    d.text((858,450), 'No new IDs or kits', fill=TEXT, font=font(16))
    footer(d); return img
def compare_frame():
    img=canvas(); d=ImageDraw.Draw(img)
    header(d,'01 / compare preview','Expose the working conveyor','Same catalog software renderer; before and after are source snapshots from the branch.')
    d.rounded_rectangle((54,144,1226,620), radius=14, fill=PANEL, outline='#344651', width=1)
    d.text((86,160),'BEFORE · shroud hides every flight',fill=MUTED,font=font(16,True))
    d.text((666,160),'AFTER · hopper, cleats, rails and discharge',fill=CYAN,font=font(16,True))
    paste_fit(img,BUNDLE/'before/cap-elevator.png',(84,192,500,390))
    paste_fit(img,BUNDLE/'after-cap-elevator.png',(664,192,500,390))
    d.text((86,592),'188 triangles · reads as an enclosed slab',fill=MUTED,font=font(14))
    d.text((666,592),'516 / 2,200 triangles · open guarded cleated lift',fill=TEXT,font=font(14))
    footer(d); return img
def anatomy_frame():
    img=canvas(); d=ImageDraw.Draw(img)
    header(d,'02 / refine the silhouette','Show the parts that identify the machine','Open hopper feeds the vertical flight belt; the drive and upper chute complete the transfer.')
    paste_fit(img,BUNDLE/'after-cap-elevator.png',(80,144,500,480))
    d.rounded_rectangle((626,154,1224,606),radius=16,fill=PANEL,outline='#344651',width=2)
    rows=[('01','Open tapered feed hopper'),('02','Visible vertical belt web'),('03','Eight repeated pickup flights'),('04','Side rails and return roller'),('05','Drive motor and gearbox'),('06','Upper discharge trough')]
    y=190
    for n,label in rows:
        d.text((676,y),n,fill=CYAN,font=font(18,True)); d.text((740,y),label,fill=TEXT,font=font(17)); y+=62
    footer(d); return img
def palettes_frame():
    img=canvas(); d=ImageDraw.Draw(img)
    header(d,'03 / change materials','Two named presets recolor separate parts','Stainless steel, powder coat, food polymer and belt rubber remain independent controls.')
    for i,(name,fn) in enumerate([('sanitaryLine','sanitaryLine.png'),('legacyPlant','legacyPlant.png')]):
        x=54+i*596
        d.rounded_rectangle((x,152,x+570,606),radius=14,fill=PANEL,outline='#344651',width=1)
        d.text((x+22,170),name,fill=CYAN,font=font(19,True))
        paste_fit(img,BUNDLE/'variants'/fn,(x+28,210,514,340))
        d.text((x+22,554),'Source preset → GLB → catalog software render',fill=MUTED,font=font(13))
    footer(d); return img
def verification_frame(report):
    img=canvas(); d=ImageDraw.Draw(img)
    header(d,'04 / validate locally','Keep preview, index and checks aligned','Generated page and integration results are local evidence; the branch is not deployed.')
    d.rounded_rectangle((54,150,1226,606),radius=16,fill=PANEL,outline='#344651',width=2)
    rows=[('Preview refresh',f"{report['previewsRendered']} / 50 kit previews"),('Kit quality',report['kitQuality']),('Structural catalog gate',report['catalogQuality']),('Focused regression',report['focusedTest']),('Catalog integration',report['integration']),('ESLint',report['eslint'])]
    y=184
    for label,value in rows:
        d.text((88,y),label,fill=CYAN,font=font(16,True)); d.text((470,y),str(value),fill=TEXT,font=font(15)); y+=55
    d.text((88,526),'Local replay and validation only; no deployed behavior or physical acceptance.',fill=MUTED,font=font(14))
    footer(d); return img
def main():
    report=json.loads((BUNDLE/'verification.json').read_text(encoding='utf-8'))
    frames=[title_frame(report),compare_frame(),anatomy_frame(),palettes_frame(),verification_frame(report)]
    FRAMES.mkdir(exist_ok=True)
    for i,frame in enumerate(frames,1): frame.save(FRAMES/f'frame-{i:02d}.png',optimize=True)
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-framerate','1/3','-i',str(FRAMES/'frame-%02d.png'),'-c:v','libx264','-r','24','-pix_fmt','yuv420p','-crf','24','-movflags','+faststart',str(OUT)],check=True)
    Image.open(FRAMES/'frame-01.png').save(BUNDLE/'poster.png',optimize=True)
    settings_path=BUNDLE/'demo-settings.json'
    settings=json.loads(settings_path.read_text(encoding='utf-8'))
    settings.update({
        'videoPath':str(OUT.relative_to(ROOT)),
        'durationSeconds':len(frames)*3,
        'ffmpegInvocation':'ffmpeg -framerate 1/3 -c:v libx264 -r 24 -pix_fmt yuv420p -crf 24 -movflags +faststart',
        'captureInvocation':'python3 artifacts/catalog-demos/beverage-cap-elevator-semantic-review-20261110/capture_demo.py',
        'provenance':'Local source, catalog GLB software renders, generated pages and integration checks only; not deployed and no physical acceptance is shown.'
    })
    settings_path.write_text(json.dumps(settings,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'video':str(OUT.relative_to(ROOT)),'frames':len(frames),'durationSeconds':len(frames)*3},indent=2))
if __name__=='__main__': main()
