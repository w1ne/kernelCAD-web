// Encode real captured dialog frames, preserve original frame timestamps/archive.
import { readFile, writeFile, mkdir, rm, rename } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const kind=process.argv[2];if(!['plate','bearing'].includes(kind))throw Error('Expected plate or bearing');
const out=resolve(new URL('./'+kind+'/',import.meta.url).pathname);
const receipt=JSON.parse(await readFile(out+'/receipt.json','utf8'));if(!receipt.success)throw Error('Refuse failed capture');
const originalSamples=receipt.samples;
const firstStage=receipt.stages.find(s=>s.name===(kind==='plate'?'01-complete':'01-pending'));
const selected=originalSamples.map((time,index)=>({time,index})).filter(s=>s.time>=firstStage.seconds);
const samples=selected.map(s=>s.time);if(!samples.length)throw Error('No real workflow frames');
const speed=0.8;const origin=samples[0];
await writeFile(out+'/frames.ffconcat','ffconcat version 1.0\n'+samples.map((t,i)=>`file 'frames/${String(selected[i].index).padStart(5,'0')}.jpg'\nduration ${((samples[i+1]??t+2)-t)*speed}\n`).join('')+`file 'frames/${String(selected.at(-1).index).padStart(5,'0')}.jpg'\n`);
const captions=kind==='plate'?[
 ['01-complete','Four required measurements covered'],['02-hidden','Hidden X pitch blocks reviewed export'],['03-ordinary','Ordinary incomplete PDF remains available'],['04-reviewed','Restore, refresh, then Mark reviewed'],['05-exported','Export reviewed PDF downloads actual bytes'],
]:[
 ['01-pending','Two diameters covered; one decision unresolved'],['02-draft','Write intent and provenance'],['03-recorded','Record decision, then refresh'],['04-complete','Zero unresolved decisions in refreshed report'],['05-exported','Mark reviewed and export actual PDF'],
];
const filters=[
 'pad=1152:1140:0:0:color=0x111827',
 "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:fontsize=18:fontcolor=0xb8c8dc:x=18:y=1108:text='LOCAL Studio source checkout · illustrative design · real frames · pauses shortened'",
 ...captions.map(([name,label],i)=>{const stage=receipt.stages.find(s=>s.name===name);const next=receipt.stages.find(s=>s.name===captions[i+1]?.[0]);return `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:fontsize=24:fontcolor=white:x=18:y=1070:text='${label}':enable='between(t,${Math.max(0,(stage.seconds-origin)*speed)},${next?(next.seconds-origin)*speed:10000})'`;}),
];
let run=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-f','concat','-safe','0','-i','frames.ffconcat','-vf',filters.join(','),'-r','24','-c:v','libx264','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart','-y','demo.mp4'],{cwd:out,stdio:'inherit'});if(run.status!==0)process.exit(run.status??1);
run=spawnSync('ffmpeg',['-v','error','-i','demo.mp4','-f','null','-'],{cwd:out,stdio:'inherit'});if(run.status!==0)throw Error('Full decode failed');
const probe=spawnSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json','demo.mp4'],{cwd:out,encoding:'utf8'});if(probe.status!==0)throw Error('ffprobe failed');
await writeFile(out+'/ffprobe.json',probe.stdout);
// Preserve all real frames compactly before removing the owned loose frames.
await rm(out+'/frames.current.zip',{force:true});
run=spawnSync('zip',['-q','-r','frames.current.zip','frames','frames.ffconcat'],{cwd:out,stdio:'inherit'});if(run.status!==0)throw Error('Frame archive failed');
run=spawnSync('unzip',['-tq','frames.current.zip'],{cwd:out,stdio:'inherit'});if(run.status!==0)throw Error('Frame archive integrity failed');
await rename(out+'/frames.current.zip',out+'/frames.zip');
const video=await readFile(out+'/demo.mp4');await writeFile(out+'/video.json',JSON.stringify({command:`node docs/demos/functional-drafting/encode.mjs ${kind}`,input:'actual owned-tab dialog screenshots',frameCount:samples.length,originalFrameCount:originalSamples.length,originalSampleTimes:originalSamples,encodedSourceIndices:selected.map(s=>s.index),startAt:firstStage.name,pausesFactor:speed,bytes:video.length,sha256:createHash('sha256').update(video).digest('hex'),fullDecodeExit:0,frameArchive:'frames.zip',limits:['Local Studio recording, not a deployed or physical acceptance claim.']},null,2)+'\n');
await mkdir(out+'/video-frames',{recursive:true});
const duration=Number(JSON.parse(probe.stdout).format.duration);for(let i=0;i<3;i++){
 run=spawnSync('ffmpeg',['-v','error','-ss',String(duration*(i+1)/4),'-i','demo.mp4','-frames:v','1','-y',`video-frames/${i+1}.png`],{cwd:out,stdio:'inherit'});if(run.status!==0)throw Error('Representative frame failed');
}
await rm(out+'/frames',{recursive:true});console.log(`${kind}: ${samples.length} real frames, ${duration.toFixed(2)}s, ${video.length} bytes, full decode and archive integrity pass`);
