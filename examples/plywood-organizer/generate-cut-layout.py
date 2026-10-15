"""Generate nominal laser profiles from organizer.kcad.ts constants.
No kerf compensation. Labels are a separate, explicitly non-cut group.
Run: python3 generate-cut-layout.py          (writes the SVGs + evidence JSON)
     python3 generate-cut-layout.py --check  (prints the panel placements as JSON, writes nothing)
"""
import re, json, hashlib, sys
from pathlib import Path
from xml.sax.saxutils import escape
root=Path(__file__).parent
source=(root/'organizer.kcad.ts').read_text()
def value(name):
    return float(re.search(rf'const {name} = ([0-9.]+);',source)[1])
w,d,t,h,c,e=[value(n) for n in ['width','depth','thickness','wallHeight','slotClearance','endClearance']]
s=t+c; ll=w-2*t-2*e; sl=d-2*t-2*e
MARGIN=8; GAP=8; SHEET_WIDTH=328
parts=[('base',w,d,None),('front',w,h,None),('back',w,h,None),('left',d-2*t,h,None),('right',d-2*t,h,None),('long-divider',ll,h,'top'),('short-divider',sl,h,'bottom')]
def pack(parts):
    """Shelf packing: tallest panels first, left to right, new shelf when the sheet width runs out."""
    placed=[]; x=y=MARGIN; shelf=0
    for name,a,b,n in sorted(parts,key=lambda p:(-p[2],-p[1])):
        if x>MARGIN and x+a>SHEET_WIDTH-MARGIN:
            x=MARGIN; y+=shelf+GAP; shelf=0
        if x+a>SHEET_WIDTH-MARGIN: raise SystemExit(f'{name} ({a:g} mm) does not fit the {SHEET_WIDTH} mm sheet')
        placed.append((name,a,b,x,y,n)); x+=a+GAP; shelf=max(shelf,b)
    return placed, y+shelf+MARGIN
def assert_no_overlap(panels):
    """Cut outlines must keep at least GAP between panels so no edge is cut twice."""
    for i,(n1,a1,b1,x1,y1,_) in enumerate(panels):
        for n2,a2,b2,x2,y2,_ in panels[i+1:]:
            apart = x1+a1+GAP<=x2+1e-9 or x2+a2+GAP<=x1+1e-9 or y1+b1+GAP<=y2+1e-9 or y2+b2+GAP<=y1+1e-9
            assert apart, f'panels {n1} and {n2} overlap or are closer than {GAP} mm'
panels,layout_height=pack(parts)
assert_no_overlap(panels)
layout=[SHEET_WIDTH,layout_height]
if '--check' in sys.argv:
    print(json.dumps({'layoutSizeMm':layout,'gapMm':GAP,'panels':[{'name':n,'x':x,'y':y,'w':a,'h':b} for n,a,b,x,y,_ in panels]}))
    sys.exit(0)
def outline(a,b,notch):
    l=(a-s)/2; r=(a+s)/2
    if notch=='top': return [(0,0),(l,0),(l,b/2),(r,b/2),(r,0),(a,0),(a,b),(0,b)]
    if notch=='bottom': return [(0,0),(a,0),(a,b),(r,b),(r,b/2),(l,b/2),(l,b),(0,b)]
    return [(0,0),(a,0),(a,b),(0,b)]
contours=[];labels=[]
for name,a,b,x,y,n in panels:
    points=' '.join(f'{px+x:g},{py+y:g}' for px,py in outline(a,b,n))
    contours.append(f'<polygon id="{name}" points="{points}"/>')
    labels.append(f'<text x="{x+3:g}" y="{y+7:g}">{name}: {a:g} × {b:g} mm</text>')
def svg(width,height,cut,text):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}mm" height="{height}mm" viewBox="0 0 {width} {height}">
<title>Nominal uncompensated plywood profiles — digital example</title>
<g id="cut-nominal" fill="none" stroke="#000" stroke-width="0.1">{''.join(cut)}</g>
<g id="labels-do-not-cut" fill="#245b80" font-family="sans-serif" font-size="3.6">{''.join(text)}</g>
</svg>'''
(root/'organizer-nominal.svg').write_text(svg(layout[0],f'{layout[1]:g}',contours,labels))
# Five open slots cut into the top edge of one coupon body.
slots=[t-0.2,t,t+0.2,t+0.4,t+0.6]
points=[(5,5)]
for i,slot in enumerate(slots):
    left=15+i*24; right=left+slot
    points += [(left,5),(left,25),(right,25),(right,5)]
points += [(145,5),(145,55),(5,55)]
cut=[f'<polygon points="{" ".join(f"{x:g},{y:g}" for x,y in points)}"/>', '<rect x="5" y="65" width="20" height="20"/>']
labels=[f'<text x="{14+i*24}" y="34">{slot:.2f}</text>' for i,slot in enumerate(slots)]
labels += ['<text x="8" y="44">Slot width mm — sample range, test same-sheet strip</text>','<text x="30" y="77">20 × 20 mm kerf test square</text>']
(root/'fit-coupon-nominal.svg').write_text(svg(150,90,cut,labels))
(root/'cut-layout-evidence.json').write_text(json.dumps({'sourceSha256':hashlib.sha256(source.encode()).hexdigest(),'units':'mm','kerfCompensation':False,'layoutSizeMm':layout,'requiresBedCheck':True,'panelCount':len(panels),'panels':[{'name':n,'lengthMm':a,'heightMm':b,'notch':v} for n,a,b,x,y,v in panels],'couponSlotWidthsMm':slots,'scope':'Nominal 2D design contours derived from the same source constants; laser software import, machine settings and physical fit unverified.'},indent=2))
