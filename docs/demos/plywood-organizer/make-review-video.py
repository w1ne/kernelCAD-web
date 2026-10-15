from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import subprocess
ROOT=Path(__file__).resolve().parent
fontfile='/System/Library/Fonts/Supplemental/Arial.ttf'
font=ImageFont.truetype(fontfile,30);small=ImageFont.truetype(fontfile,22)
slides=[('render-iso.png','1. Evaluate the seven-panel assembly','Hosted MCP: valid geometry, seven parts, zero diagnostics.'),('render-top.png','2. Check the assembled panels','Independent native check: 21 panel pairs, no volume overlaps.'),('organizer-nominal.png','3. Prepare nominal cutting outlines','Seven separate panel contours. Millimetres; no kerf compensation.'),('fit-coupon-nominal.png','4. Test the fit on the actual laser','Physical test pending: measure stock, cut coupon, select fit.')]
for i,(name,title,caption) in enumerate(slides):
 canvas=Image.new('RGB',(1280,720),'white');draw=ImageDraw.Draw(canvas)
 im=Image.open(ROOT/name).convert('RGB');im.thumbnail((1200,540))
 canvas.paste(im,((1280-im.width)//2,80+(540-im.height)//2))
 draw.text((40,24),title,fill='#183047',font=font)
 draw.text((40,638),caption,fill='#183047',font=small)
 draw.text((40,675),'Original kernelCAD digital example — no physical cutting result claimed.',fill='#566777',font=small)
 canvas.save(ROOT/f'video-slide-{i}.png')
(ROOT/'video-frames.txt').write_text(''.join(f"file 'video-slide-{i}.png'\nduration 4\n" for i in range(4))+"file 'video-slide-3.png'\n")
subprocess.run(['ffmpeg','-y','-f','concat','-safe','0','-i',str(ROOT/'video-frames.txt'),'-vf','fps=24,format=yuv420p','-c:v','libx264','-movflags','+faststart',str(ROOT/'workflow-review.mp4')],check=True)
