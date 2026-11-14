#!/usr/bin/env python3
"""Decode and sample the authored MP4 for a retained visual inspection."""
import hashlib, json, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[3]; BUNDLE=Path(__file__).resolve().parent
VIDEO=BUNDLE/'beverage-cap-elevator-semantic-review.mp4'; REVIEW=BUNDLE/'video-review'; REVIEW.mkdir(exist_ok=True)
probe=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_name,width,height,r_frame_rate,pix_fmt','-of','json',str(VIDEO)],check=True,capture_output=True,text=True)
meta=json.loads(probe.stdout); stream=meta['streams'][0]
if (stream['width'],stream['height'],stream['codec_name'],stream['pix_fmt']) != (1280,720,'h264','yuv420p'):
    raise SystemExit(f'unexpected video format: {stream}')
# Sample the middle of each authored slide; decode through ffmpeg, then save PNGs.
samples=[]
for i,seconds in enumerate((1.5,4.5,7.5,10.5,13.5),1):
    path=REVIEW/f'sample-{i:02d}.png'
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',str(seconds),'-i',str(VIDEO),'-frames:v','1',str(path)],check=True)
    with Image.open(path) as frame:
        if frame.size != (1280,720): raise SystemExit(f'invalid sample size {frame.size}')
    samples.append({'second':seconds,'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
thumbs=[]
for row in samples:
    im=Image.open(REVIEW/row['file']).convert('RGB'); im.thumbnail((480,270))
    thumbs.append(im.copy())
sheet=Image.new('RGB',(1000,930),'#101923'); draw=ImageDraw.Draw(sheet); font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',18)
for i,im in enumerate(thumbs):
    x=20+(i%2)*490; y=28+(i//2)*295; sheet.paste(im,(x,y)); draw.text((x,y+272),f"sample {i+1} · {samples[i]['second']} s",fill='#eef3f5',font=font)
sheet.save(REVIEW/'contact-sheet.png',optimize=True)
record={'invocation':'python3 artifacts/catalog-demos/beverage-cap-elevator-semantic-review-20261110/inspect_video.py','video':str(VIDEO.relative_to(ROOT)),'videoSha256':hashlib.sha256(VIDEO.read_bytes()).hexdigest(),'durationSeconds':float(meta['format']['duration']),'stream':stream,'samples':samples,'contactSheet':str((REVIEW/'contact-sheet.png').relative_to(BUNDLE))}
(BUNDLE/'video-inspection.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
print(f"Decoded and sampled {len(samples)} frames; {record['durationSeconds']:.2f}s, {stream['width']}x{stream['height']} {stream['codec_name']} {stream['pix_fmt']}.")
