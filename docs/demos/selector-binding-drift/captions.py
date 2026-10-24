from PIL import Image, ImageDraw, ImageFont
F=lambda n,s: ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/{n}.ttf", s)
bold, reg, mono = F("DejaVuSans-Bold",34), F("DejaVuSans",25), F("DejaVuSansMono",22)
scenes=[
 ("w30.pose-35-30.png","w = 30","filleted face: plate top (box_1)",(520,440),(600,500),
  [("Selector: { byNormal: 'Z', minArea: 700, maxArea: 900 }",mono,(20,20,20)),
   ("It binds to the plate top (800 mm2). The fillet is on the plate top.",reg,(20,20,20))],(30,110,40)),
 ("w50.pose-35-30.png","w = 50","filleted face: boss top (box_2)",(650,160),(860,110),
  [("Same script, same selector. Now it binds to the boss top (box_2).",reg,(20,20,20)),
   ("WARN selector.binding-changed: was PLANE face 'top' of box_1,",mono,(170,30,30)),
   ("now PLANE face 'top' of box_2. The model still builds.",mono,(170,30,30))],(190,40,40)),
 ("w34.pose-35-30.png","w = 34","filleted face: plate top (box_1)",(520,440),(600,500),
  [("Same selector, same face, only resized.",reg,(20,20,20)),
   ("INFO selector.binding-moved: area 800 -> 880, centroid moved 2 mm.",mono,(30,80,150)),
   ("No warning: the fillet followed the edit as intended.",reg,(20,20,20))],(30,80,150)),
]
for i,(img,title,label,tip,lab,lines,col) in enumerate(scenes):
    im=Image.open(img).convert("RGB"); d=ImageDraw.Draw(im,"RGBA")
    d.rectangle((0,0,1280,70),fill=(255,255,255,230)); d.text((24,16),"Selector binding drift   |   "+title,font=bold,fill=(20,20,20))
    d.line((lab[0],lab[1],tip[0],tip[1]),fill=col,width=4); d.ellipse((tip[0]-9,tip[1]-9,tip[0]+9,tip[1]+9),outline=col,width=4)
    lx,ly=(lab[0]+8,lab[1]-16) if lab[1]<300 else (lab[0]-60,lab[1]+4)
    w=d.textlength(label,font=reg); d.rectangle((lx-6,ly-4,lx+w+6,ly+34),fill=(255,255,255,235)); d.text((lx,ly),label,font=reg,fill=col)
    h=34*len(lines)+30; d.rectangle((0,720-h,1280,720),fill=(255,255,255,235))
    for j,(t,f,c) in enumerate(lines): d.text((24,720-h+14+34*j),t,font=f,fill=c)
    im.save(f"s{i+1}.png")
