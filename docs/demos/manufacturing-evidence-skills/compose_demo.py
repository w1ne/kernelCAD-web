#!/usr/bin/env python3
from __future__ import annotations
import json, subprocess, textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
W, H = 1280, 720
BG = '#0b1020'; CARD = '#141b2d'; CARD2 = '#1b253b'
WHITE = '#f8fafc'; MUTED = '#a8b3c7'; BLUE = '#4ea1ff'
GREEN = '#22c55e'; AMBER = '#f59e0b'; RED = '#ef4444'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'

def font(size:int, bold=False, mono=False):
    return ImageFont.truetype(MONO if mono else (BOLD if bold else FONT), size)

def canvas():
    return Image.new('RGB', (W,H), BG)

def text(draw, xy, value, size, fill=WHITE, bold=False, mono=False, anchor=None):
    draw.text(xy, value, font=font(size,bold,mono), fill=fill, anchor=anchor)

def wrap(draw, xy, value, width_px, size, fill=MUTED, bold=False, line_gap=8):
    avg=max(1,size*0.55); chars=max(12,int(width_px/avg)); lines=textwrap.wrap(value,width=chars)
    y=xy[1]
    for line in lines:
        text(draw,(xy[0],y),line,size,fill,bold)
        y += size+line_gap
    return y

def card(draw, box, fill=CARD, radius=24, outline=None):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=2 if outline else 1)

def fit_image(path, box, contain=True):
    img=Image.open(path).convert('RGB')
    bw, bh=box[2]-box[0], box[3]-box[1]
    ratio=min(bw/img.width,bh/img.height) if contain else max(bw/img.width,bh/img.height)
    size=(max(1,int(img.width*ratio)),max(1,int(img.height*ratio)))
    img=img.resize(size,Image.Resampling.LANCZOS)
    out=Image.new('RGB',(bw,bh),WHITE)
    out.paste(img,((bw-size[0])//2,(bh-size[1])//2))
    return out

def header(draw, kicker, title, subtitle=None):
    text(draw,(64,42),kicker.upper(),18,BLUE,True)
    text(draw,(64,74),title,40,WHITE,True)
    if subtitle: text(draw,(64,126),subtitle,21,MUTED)

def pill(draw, xy, label, colour):
    f=font(18,True); bb=draw.textbbox((0,0),label,font=f); w=bb[2]-bb[0]+30
    draw.rounded_rectangle((xy[0],xy[1],xy[0]+w,xy[1]+38),19,fill=colour)
    draw.text((xy[0]+15,xy[1]+8),label,font=f,fill=BG)
    return w

evidence=json.loads((ROOT/'authenticated-evidence.json').read_text())
study=json.loads((ROOT/'trade-study.json').read_text())
stale=json.loads((ROOT/'evaluate-stale-example.json').read_text())['result']['structuredContent']
slides=[]

# 1 — title
im=canvas(); d=ImageDraw.Draw(im); header(d,'kernelCAD','Manufacturing evidence, not generic reports','Revision-bound readiness + computed trade studies')
card(d,(54,174,1226,650),WHITE,28)
hero=fit_image(ROOT/'render-iso.png',(80,194,720,626)); im.paste(hero,(80,194))
text(d,(765,225),'Exact source',18,MUTED,True)
text(d,(765,260),'f32440a37c96…',22,BLUE,True,True)
text(d,(765,320),'Build',18,MUTED); pill(d,(865,311),'PASS',GREEN)
text(d,(765,382),'FDM + CNC',18,MUTED); pill(d,(905,373),'PASS',GREEN)
text(d,(765,444),'Structural solve',18,MUTED); pill(d,(955,435),'WARN',AMBER)
wrap(d,(765,505),'A warning stays a warning. The workflow never upgrades missing or low-trust evidence to PASS.',390,19,BG,False,7)
slides.append(im)

# 2 — negative control
im=canvas(); d=ImageDraw.Draw(im); header(d,'negative control','The stale example fails loudly','Failure evidence is retained instead of hidden')
card(d,(64,184,560,632),CARD2,24,RED); pill(d,(96,220),'FAIL',RED)
text(d,(96,282),'query.empty',30,WHITE,True,True)
wrap(d,(96,335),'The fillet selector resolved to zero edges. Downstream chamfer and hole features then lost their input.',410,22,MUTED,False,10)
text(d,(96,522),'Source SHA-256',17,MUTED,True)
text(d,(96,552),stale['evaluationEvidence']['source']['sha256'][:28]+'…',18,WHITE,False,True)
card(d,(604,184,1216,632),CARD,24)
text(d,(642,224),'Evidence states',24,WHITE,True)
states=[('PASS','checked and met',GREEN),('FAIL','checked and contradicted',RED),('WARN','completed with limitation',AMBER),('NOT_RUN','applicable, not executed',MUTED),('UNSUPPORTED','cannot be evaluated',MUTED),('ASSUMPTION','input without evidence',MUTED)]
y=278
for name,desc,col in states:
    pill(d,(642,y),name,col); text(d,(790,y+8),desc,18,MUTED); y+=53
slides.append(im)

# 3 — repaired model
im=canvas(); d=ImageDraw.Draw(im); header(d,'manufacturing readiness','Canonical hole features restore clean evidence','One exact source revision; no diagnostics')
card(d,(64,180,746,642),WHITE,24); im.paste(fit_image(ROOT/'render-sheet.png',(80,196,730,626)),(80,196))
card(d,(780,180,1216,642),CARD,24)
rows=[('Geometry build','PASS',GREEN),('Finite solid','PASS',GREEN),('FDM checks','PASS',GREEN),('CNC checks','PASS',GREEN),('Trusted structural mesh','WARN',AMBER)]
y=225
for label,state,col in rows:
    text(d,(814,y),label,19,MUTED); pill(d,(1050,y-8),state,col); y+=66
text(d,(814,568),'No export, quote, print, or order.',17,WHITE,True)
slides.append(im)

# 4 — comparable inputs
im=canvas(); d=ImageDraw.Draw(im); header(d,'same basis','Three variants; one evidence contract','Only thickness changes. Interfaces and checks stay constant.')
cols=[70,250,430,640,845,1040]
headers=['Variant','Mass','FDM','CNC','Est. SF','Est. disp.']
for x,h in zip(cols,headers): text(d,(x,205),h,18,MUTED,True)
d.line((64,238,1216,238),fill='#334155',width=2)
y=274
for name in ['t4','t8','t12']:
    v=evidence['variants'][name]
    text(d,(cols[0],y),f"{v['thicknessMm']} mm",25,WHITE,True)
    text(d,(cols[1],y),f"{v['mass']['massKg']*1000:.1f} g",23,WHITE)
    pill(d,(cols[2],y-6),'PASS',GREEN); pill(d,(cols[3],y-6),'PASS',GREEN)
    text(d,(cols[4],y),f"{v['fea']['minSafetyFactorEstimate']:.1f}",23,WHITE)
    text(d,(cols[5],y),f"{v['fea']['maxDisplacementMm']:.3f} mm",23,WHITE)
    text(d,(cols[4],y+35),'WARN · voxel estimate',14,AMBER)
    d.line((64,y+76,1216,y+76),fill='#243047',width=1); y+=116
card(d,(64,595,1216,658),CARD2,18)
text(d,(88,615),'Common load: 100 N · aluminium 6061 · same supports · meshTrusted=false for all three',18,MUTED)
slides.append(im)

# 5 — trade study
im=canvas(); d=ImageDraw.Draw(im); header(d,'computed trade study','12 mm ranks first under declared weights','35% mass · 40% estimated safety factor · 25% displacement')
base_y=222
for i,name in enumerate(study['ranking']):
    score=study['scores'][name]; v=evidence['variants'][name]; y=base_y+i*115
    col=BLUE if i==0 else '#64748b'
    text(d,(84,y),f"{i+1}",31,col,True)
    text(d,(140,y),f"{v['thicknessMm']} mm",28,WHITE,True)
    d.rounded_rectangle((300,y+2,1020,y+34),16,fill='#25324a')
    d.rounded_rectangle((300,y+2,300+int(720*score),y+34),16,fill=col)
    text(d,(1050,y-1),f"{score:.3f}",27,WHITE,True)
    text(d,(300,y+48),f"mass {v['mass']['massKg']*1000:.1f} g  ·  SF {v['fea']['minSafetyFactorEstimate']:.1f} est.  ·  disp. {v['fea']['maxDisplacementMm']:.3f} mm est.",17,MUTED)
card(d,(64,592,1216,657),CARD2,18)
text(d,(88,611),'Sensitivity: winner unchanged for every tested ±20% single-weight perturbation.',18,WHITE,True)
slides.append(im)

# 6 — boundary
im=canvas(); d=ImageDraw.Draw(im); header(d,'decision boundary','Recommendation: 12 mm within this tested set','Not an optimum. Not a release approval.')
card(d,(64,182,1216,410),CARD,26,AMBER)
pill(d,(96,218),'WARN',AMBER)
text(d,(210,221),'Structural evidence is not trusted for release',27,WHITE,True)
wrap(d,(96,286),'The solver used a 376-brick in-process voxel mesh. Curved faces, holes, and stress concentrations are approximate.',1040,22,MUTED,False,10)
card(d,(64,444,1216,652),CARD2,26)
text(d,(96,477),'Next discriminating test',21,BLUE,True)
wrap(d,(96,516),'Run 8 mm and 12 mm with CalculiX + gmsh, or halve mesh size and check convergence. If 8 mm keeps the required margin and 0.176 mm displacement is acceptable, it saves 33.3% mass.',1060,21,WHITE,False,9)
text(d,(96,620),'Approval gate remains closed: no export, quote, print, order, or external transfer.',16,AMBER,True)
slides.append(im)

slide_dir=ROOT/'slides'; slide_dir.mkdir(exist_ok=True)
for i,slide in enumerate(slides,1): slide.save(slide_dir/f'{i:02d}.png',optimize=True)
concat=ROOT/'slides.txt'
with concat.open('w') as f:
    for i in range(1,len(slides)+1):
        f.write(f"file 'slides/{i:02d}.png'\n")
        f.write('duration 3\n' if i<len(slides) else 'duration 4\n')
    f.write(f"file 'slides/{len(slides):02d}.png'\n")
out=ROOT/'manufacturing-evidence-demo.mp4'
subprocess.run(['ffmpeg','-y','-f','concat','-safe','0','-i',str(concat),'-vf','fps=30,format=yuv420p','-c:v','libx264','-preset','medium','-crf','20','-movflags','+faststart',str(out)],check=True)
print(out)
