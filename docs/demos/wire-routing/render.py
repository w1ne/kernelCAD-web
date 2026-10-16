from pathlib import Path
import json, math
from PIL import Image, ImageDraw, ImageFont
BASE = Path(__file__).parent
result = json.loads((BASE/'result.json').read_text())
W,H=1280,720
font='/System/Library/Fonts/Supplemental/Arial.ttf'
F=lambda s: ImageFont.truetype(font,s)
frames=[]

def frame(title, sub, mode):
    im=Image.new('RGB',(W,H),'#101820'); d=ImageDraw.Draw(im)
    d.text((55,38),'kernelCAD  /  MCP ROUTE ANALYSIS',font=F(20),fill='#67d4c0')
    d.text((55,85),title,font=F(38),fill='#f1f5f9')
    d.text((55,142),sub,font=F(21),fill='#a8b5c4')
    # board coordinates mapped into a convenient top-down analysis view
    sx,sy=5.7,5.7; ox,oy=300,235
    def xy(x,y): return (ox+x*sx, oy+(80-y)*sy)
    d.rounded_rectangle((ox-16,oy-12,ox+80*sx+16,oy+80*sy+12),radius=14,fill='#182632',outline='#527080',width=2)
    for p in [p for p in []]: pass
    for ob in handoff['parts']:
        pos=(ob.get('position_mm') or {}).get('value'); size=(ob.get('physical') or {}).get('bbox_mm')
        if not pos or not size: continue
        x,y=pos; w,h,_=size; a=xy(x-w/2,y+h/2); b=xy(x+w/2,y-h/2)
        d.rounded_rectangle((a[0],a[1],b[0],b[1]),radius=5,fill='#314554',outline='#7391a4',width=2)
        d.text((a[0]+5,a[1]+4),ob['ref'],font=F(15),fill='#f1f5f9')
    if mode:
        colors=['#f2b84b','#55c7ee','#ea7b8c','#9bdf83','#c0a5f5']
        for i,r in enumerate(result['routes'][:4]):
            raw=r['points_mm']; low=[min(p[0] for p in raw),min(p[1] for p in raw)]; high=[max(p[0] for p in raw),max(p[1] for p in raw)]
            span=max(1,high[0]-low[0],high[1]-low[1]); scale=100/span
            pts=[(850+(p[0]-low[0])*scale, 270+(p[1]-low[1])*scale+i*45) for p in raw]
            d.line(pts,fill=colors[i%len(colors)],width=4,joint='curve')
            for p in pts: d.ellipse((p[0]-3,p[1]-3,p[0]+3,p[1]+3),fill=colors[i%len(colors)])
    d.rounded_rectangle((830,220,1225,585),radius=18,fill='#182632',outline='#334956',width=2)
    lines=[('Handoff wires',str(len(handoff['wires']))),('Route estimates',str(len(result['routes']))),('Unresolved endpoints',str(result['unresolved_wire_count'])),('Clearance collisions',str(sum(bool(r['collisions']) for r in result['routes'])))]
    yy=250
    for label,value in lines:
        d.text((865,yy),label,font=F(20),fill='#a8b5c4'); d.text((865,yy+30),value,font=F(34),fill='#f1f5f9'); yy+=82
    d.text((55,655),'LOCAL FIXTURE ANALYSIS  ·  NOT DEPLOYED  ·  NOT PHYSICAL ACCEPTANCE',font=F(17),fill='#92a5b4')
    return im
handoff=json.loads((BASE/'../../../tests/fixtures/argon/handoff-drawbot.json').resolve().read_text())
frames=[frame('From pin pairs to route estimates','LabWired handoff · grow monitor · coordinates in millimetres',False),frame('Orthogonal routes with clearance checks','Known part bounding boxes become axis-aligned keep-outs',True),frame('Unresolved endpoints stay visible','Null positions are reported instead of guessed',True)]
# Repeat frames to make a readable ~7-second, 12 fps video.
frames=[im for im,n in [(frames[0],24),(frames[1],36),(frames[2],24)] for _ in range(n)]
frames[0].save(BASE/'demo.gif',save_all=True,append_images=frames[1:],duration=83,loop=0,format='GIF')
