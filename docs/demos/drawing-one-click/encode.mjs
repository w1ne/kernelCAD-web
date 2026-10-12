// Encode actual captured UI frames; shorten pauses without changing their content.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const base=fileURLToPath(new URL('./',import.meta.url));
const receipt=JSON.parse(await readFile(base+'receipt.json','utf8'));
const speed=0.75;
const entries=receipt.samples.map((time,i)=>`file '${base}frames/${String(i).padStart(5,'0')}.jpg'\nduration ${((receipt.samples[i+1]??time+2)-time)*speed}\n`);
entries.push(`file '${base}frames/${String(receipt.samples.length-1).padStart(5,'0')}.jpg'\n`);
await writeFile(base+'frames.ffconcat','ffconcat version 1.0\n'+entries.join(''));
const origin=receipt.samples[0];
const cuts=receipt.stages.filter(s=>['01-export','03-settings','05-edited','06-downloaded'].includes(s.name));
const labels=['Drawing (PDF) downloads directly','Optional drawing settings and preview','Edit the callout and its spacing','Download PDF uses the current settings'];
const filters=['pad=1440:1180:0:0:color=0x111827',
  "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:fontsize=21:fontcolor=0xb8c8dc:x=20:y=1150:text='LOCAL Studio + live CAD backend · illustrative design · pauses shortened'",
  ...cuts.map((s,i)=>`drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:fontsize=24:fontcolor=white:x=20:y=1114:text='${labels[i]}':enable='between(t,${Math.max(0,(s.seconds-origin)*speed)},${cuts[i+1]?(cuts[i+1].seconds-origin)*speed:1000})'`),
];
const run=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',base+'frames.ffconcat','-vf',filters.join(','),'-r','24','-c:v','libx264','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart','-y',base+'demo.mp4'],{stdio:'inherit'});
if(run.status!==0) process.exit(run.status??1);
