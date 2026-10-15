// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Local visual replay of the real face signature/remap helper. Not a deployed app capture.
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import type { GeometryResult } from '../../../src/shared/worker/workerTypes';
import { remapFaceSignature, signatureForSelection } from '../../../src/studio/selectionCode/faceSignature';

const output=resolve('docs/demos/stable-face-selection/demo.mp4');
const selection={shapeIndex:0,kind:'face' as const,id:4,featureId:'extrude_1'};
function geometry(offset=0, ids=[4]):GeometryResult{return{featureId:'extrude_1',faces:ids.map(faceId=>({faceId,
  plane:{origin:[offset,0,0] as [number,number,number],normal:[0,0,1] as [number,number,number]},
  vertices:new Float32Array([offset,0,0,offset+1,0,0,offset,1,0]),indices:new Uint32Array([0,1,2]),
  normals:new Float32Array([0,0,1,0,0,1,0,0,1])}))};}
const old=[geometry()];
const signature=signatureForSelection(old,selection);
if(!signature)throw new Error('could not capture face signature');
const states=[
  ['Selected · generation 0','Face id 4 is selected in Studio.',true],
  ['Rebuild pending · generation 1','Agent tools receive null while the old id is hidden.',false],
  ['Unique match · generation 1',`Owner + signature resolved to face ${remapFaceSignature([geometry(0.1)],signature)?.id ?? 'none'}.`,true],
  ['No unique match · generation 1',`Deleted face result: ${remapFaceSignature([],signature)===null?'cleared':'unexpected match'}.`,false],
] as const;
const dir=await mkdtemp(join(tmpdir(),'kcw-face-selection-'));
try{
  for(let i=0;i<states.length;i++){
    const [title,detail,selected]=states[i]!;
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="100%" height="100%" fill="#10151d"/><text x="80" y="110" fill="#e8edf5" font-family="Arial" font-size="40">Stable face selection</text><text x="80" y="174" fill="#8fd3ff" font-family="Arial" font-size="30">${title}</text><path d="M390 300 L640 220 L890 300 L640 380 Z M390 300 L390 490 L640 570 L640 380 M640 380 L890 300 L890 490 L640 570" fill="#293747" stroke="#aab8c8" stroke-width="4"/><path d="M390 300 L640 220 L890 300 L640 380 Z" fill="${selected?'#7658d8':'#374454'}" fill-opacity=".75" stroke="${selected?'#c5b8ff':'#536273'}" stroke-width="5"/><text x="565" y="310" fill="#fff" font-family="Arial" font-size="26">${selected?'face 4':'pending'}</text><text x="80" y="650" fill="#c8d1de" font-family="Arial" font-size="24">${detail}</text><text x="80" y="690" fill="#8794a4" font-family="Arial" font-size="18">LOCAL PROTOCOL REPLAY · NOT DEPLOYED BEHAVIOR</text></svg>`;
    const svgPath=join(dir,`frame-${String(i).padStart(2,'0')}.svg`);
    const pngPath=join(dir,`frame-${String(i).padStart(2,'0')}.png`);
    await writeFile(svgPath,svg);
    execFileSync('rsvg-convert',['-o',pngPath,svgPath],{stdio:'inherit'});
  }
  execFileSync('ffmpeg',['-y','-loglevel','error','-framerate','1','-i',join(dir,'frame-%02d.png'),'-vf','scale=1280:720,format=yuv420p','-r','24','-t','4','-c:v','libx264','-pix_fmt','yuv420p',output],{stdio:'inherit'});
}finally{await rm(dir,{recursive:true,force:true});}
console.log(`Wrote ${output}`);
