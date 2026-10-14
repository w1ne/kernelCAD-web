"""Render only captured returned meshes; no geometry is invented or edited."""
from pathlib import Path
import json, math
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).parent
OUT = ROOT / 'evidence'
FONT = '/System/Library/Fonts/Supplemental/Arial.ttf'
def font(n): return ImageFont.truetype(FONT, n)
def project_mesh(data, size, az, el):
    v=data['mesh']['vertices']; indices=data['mesh']['triangles']
    pts=[v[i:i+3] for i in range(0,len(v),3)]
    center=[(min(p[j] for p in pts)+max(p[j] for p in pts))/2 for j in range(3)]
    a,e=math.radians(az),math.radians(el)
    right=(-math.sin(a),math.cos(a),0)
    up=(-math.cos(a)*math.sin(e),-math.sin(a)*math.sin(e),math.cos(e))
    view=(math.cos(a)*math.cos(e),math.sin(a)*math.cos(e),math.sin(e))
    dot=lambda x,y:sum(a*b for a,b in zip(x,y))
    q=[]
    for p in pts:
        d=[p[i]-center[i] for i in range(3)]
        q.append((dot(d,right),dot(d,up),dot(d,view)))
    extent=max(max(p[0] for p in q)-min(p[0] for p in q),max(p[1] for p in q)-min(p[1] for p in q))
    scale=size*.84/extent
    img=Image.new('RGB',(size,size),'#162330');draw=ImageDraw.Draw(img)
    faces=[]
    for i in range(0,len(indices),3):
        ids=indices[i:i+3]; ps=[pts[j] for j in ids]
        u=[ps[1][j]-ps[0][j] for j in range(3)];w=[ps[2][j]-ps[0][j] for j in range(3)]
        n=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]]
        length=math.sqrt(dot(n,n))
        if length<1e-15: continue
        light=.32+.68*abs(dot(n,(.3,-.4,.866))/length)
        color=tuple(int(c*light) for c in (115,190,220))
        xy=[(size/2+q[j][0]*scale,size/2-q[j][1]*scale) for j in ids]
        faces.append((sum(q[j][2] for j in ids),xy,color))
    for _,xy,color in sorted(faces,key=lambda f:f[0]): draw.polygon(xy,fill=color)
    return img

def slide(name,title,lines):
    data=json.loads((OUT/f'{name}.json').read_text())
    canvas=Image.new('RGB',(1280,720),'#101923');draw=ImageDraw.Draw(canvas)
    draw.text((42,32),title,font=font(39),fill='white')
    draw.text((42,88),'LOCAL VALIDATION · recorded build results · no deployment or hardware acceptance',font=font(19),fill='#a2b6c8')
    canvas.paste(project_mesh(data,510,45,28),(720,150))
    for i,line in enumerate(lines): draw.text((42,162+i*47),line,font=font(25),fill='#dde7ef')
    draw.text((42,540),f"Returned volume: {data['volume']:.6f} mm³",font=font(24),fill='#86d9c4')
    if 'durationMs' in data: draw.text((42,585),f"Local build: {data['durationMs']/1000:.3f} s (not a benchmark)",font=font(21),fill='#a2b6c8')
    draw.text((42,659),'kernel: smlib → guards → accepted candidate or explicit OCCT fallback',font=font(22),fill='#a2b6c8')
    canvas.save(OUT/f'{name}-slide.png')
    for label,az,el in [('top',0,90),('front',-90,0),('iso',45,28)]: project_mesh(data,700,az,el).save(OUT/f'{name}-{label}.png')

slide('gear','Opt-in smooth gear build',[
    '1. Build gear.kcad.ts with kernel: smlib',
    '2. Screen profile segments / curve samples',
    '3. Build independent OCCT reference',
    '4. Check native and returned volume + area',
    'Native extrusion candidate accepted',
    '20 teeth · module 1.75 mm · width 5 mm',
    'Sketch node uses documented OCCT fallback',
])
slide('fillet','Guarded constant-radius fillet',[
    '1. Extrude the four-point profile',
    '2. Normalize base STEP through OCCT',
    '3. Match selected edges uniquely',
    '4. Run native G1 fillet, radius 0.5 mm',
    '5. Compare native + STEP result to OCCT',
    'Extrusion and fillet candidates accepted',
    'No fallback diagnostics in this build',
])
slide('fallback','Legacy STEP: fallback is explicit',[
    '1. Import original legacy GT2 STEP',
    '2. Rewrite STEP with OCCT before SMLib',
    '3. Check whole-import volume + area',
    '4. Re-export candidate; check again',
    'VOLUME_MISMATCH: +0.438083%',
    'Returned shape is the OCCT reference',
    'Named warning + guard record retained',
])
(OUT/'slides.txt').write_text("file 'gear-slide.png'\nduration 5\nfile 'fillet-slide.png'\nduration 5\nfile 'fallback-slide.png'\nduration 5\nfile 'fallback-slide.png'\n")
print('Rendered actual captured meshes: top, front, iso and workflow slides')
