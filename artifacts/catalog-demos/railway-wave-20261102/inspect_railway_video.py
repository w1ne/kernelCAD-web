#!/usr/bin/env python3
"""Decode the final railway demo and record video/contact-sheet evidence."""
import argparse
import json
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[3];BUNDLE=Path(__file__).resolve().parent
VIDEO=BUNDLE/'railway-kit.mp4';REVIEW=BUNDLE/'video-review'
parser=argparse.ArgumentParser();parser.add_argument('--manual-inspection-passed',action='store_true');args=parser.parse_args()
if not VIDEO.is_file():raise SystemExit(f'missing video: {VIDEO}')
REVIEW.mkdir(parents=True,exist_ok=True)
for old in REVIEW.glob('decoded-*.png'):old.unlink()
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(VIDEO),'-vf','fps=1/3,scale=320:-1','-frames:v','8',str(REVIEW/'decoded-%02d.png')],check=True)
frames=sorted(REVIEW.glob('decoded-*.png'))
if len(frames)!=8:raise SystemExit(f'expected 8 frames, found {len(frames)}')
thumbs=[Image.open(p).convert('RGB') for p in frames];cw,ch,cols=320,180,2
sheet=Image.new('RGB',(cw*cols,ch*4),'#111923');draw=ImageDraw.Draw(sheet);font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',14)
for i,frame in enumerate(thumbs):
 frame.thumbnail((cw,ch-22),Image.Resampling.LANCZOS);x,y=(i%cols)*cw,(i//cols)*ch;sheet.paste(frame,(x,y));draw.text((x+6,y+ch-20),f'frame {i+1:02d}',fill='#eef3f5',font=font)
sheet.save(REVIEW/'contact-sheet.png',optimize=True)
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(VIDEO)],text=True));stream=next(s for s in probe['streams'] if s['codec_type']=='video')
report={'video':str(VIDEO.relative_to(ROOT)),'bytes':VIDEO.stat().st_size,'sha256':subprocess.check_output(['sha256sum',str(VIDEO)],text=True).split()[0],'codec':stream['codec_name'],'width':stream['width'],'height':stream['height'],'pixelFormat':stream['pix_fmt'],'durationSeconds':float(probe['format']['duration']),'decodedFrameSamples':[str(p.relative_to(ROOT)) for p in frames],'contactSheet':str((REVIEW/'contact-sheet.png').relative_to(ROOT)),'manualVisualInspection':args.manual_inspection_passed}
(REVIEW/'video-inspection.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
