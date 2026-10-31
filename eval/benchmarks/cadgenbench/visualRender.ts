// SPDX-License-Identifier: MIT
// Browser-free orthographic preview of the candidate STEP for agent review.
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { importStepCached } from '../../../src/modeling/parts/stepParseCache';
import type { AgentImage } from '../../types';
import { withOcctLock } from './validity';

export function formatExtents(bounds: {min: readonly number[]; max: readonly number[]}): string {
  if (bounds.min.length !== 3 || bounds.max.length !== 3) throw new Error('Preview bounds must have three axes');
  const sizes = bounds.min.map((v,i) => bounds.max[i]-v);
  if (sizes.some(v => !Number.isFinite(v) || v < 0)) throw new Error('Preview bounds are invalid');
  return `Mesh extents: X ${sizes[0].toFixed(2)}  Y ${sizes[1].toFixed(2)}  Z ${sizes[2].toFixed(2)} mm`;
}

type Point = [number, number, number];
type PreviewMesh = { vertices: Point[]; triangles: ArrayLike<number>; extents: string };

export function sharedFrame(...sets: Point[][]): {centerX:number; centerY:number; scale:number} {
  const points = sets.flat();
  if (!points.length || points.some(p => !Number.isFinite(p[0]) || !Number.isFinite(p[1]))) throw new Error('Invalid preview points');
  let minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity;
  for (const p of points) { minX=Math.min(minX,p[0]); maxX=Math.max(maxX,p[0]); minY=Math.min(minY,p[1]); maxY=Math.max(maxY,p[1]); }
  return {centerX:(minX+maxX)/2, centerY:(minY+maxY)/2, scale:440/Math.max(maxX-minX,maxY-minY,1e-9)};
}

async function loadMesh(stepPath: string): Promise<PreviewMesh> {
  const backend = await importStepCached(readFileSync(stepPath));
  const extents = formatExtents(backend.boundingBox({exact:true}));
  const mesh = backend.getReplicadShape().mesh({ tolerance: 0.25, angularTolerance: 0.3 });
  if (!mesh.triangles.length || mesh.triangles.length / 3 > 100_000) throw new Error('preview mesh is empty or exceeds the triangle budget');
  const vertices: Point[] = [];
  for (let i=0; i<mesh.vertices.length; i+=3) vertices.push([mesh.vertices[i],mesh.vertices[i+1],mesh.vertices[i+2]]);
  return {vertices, triangles: mesh.triangles, extents};
}

async function renderMeshes(meshes: PreviewMesh[]): Promise<AgentImage[][]> {
    const views: Array<{ name:string; project:(p:[number,number,number])=>[number,number,number] }> = [
      {name:'front (-Y)', project:([x,y,z])=>[x,z,-y]},
      {name:'right (+X)', project:([x,y,z])=>[y,z,x]},
      {name:'top (+Z)', project:([x,y,z])=>[x,y,z]},
      {name:'iso', project:([x,y,z])=>[(x-y)*0.707,(x+y)*-0.408+z*0.816,(x+y+z)*0.577]},
    ];
    const output: AgentImage[][] = meshes.map(() => []);
    for (const view of views) {
      const projected = meshes.map(mesh => mesh.vertices.map(view.project));
      const {scale, centerX, centerY} = sharedFrame(...projected);
      for (let index=0; index<meshes.length; index++) {
        const mesh = meshes[index], vertices = mesh.vertices, pts = projected[index];
      const triangles: Array<{depth:number; path:string; shade:number}> = [];
      for(let i=0;i<mesh.triangles.length;i+=3){
        const p=[pts[mesh.triangles[i]],pts[mesh.triangles[i+1]],pts[mesh.triangles[i+2]]];
        if(p.some(x=>!x)) throw new Error('invalid mesh index');
        const a=vertices[mesh.triangles[i]], b=vertices[mesh.triangles[i+1]], c=vertices[mesh.triangles[i+2]];
        const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
        const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
        const len=Math.hypot(...n) || 1;
        const shade=Math.round(135+75*Math.abs((n[0]*0.3+n[1]*0.4+n[2]*0.866)/len));
        const path=p.map(x=>`${(256+(x[0]-centerX)*scale).toFixed(2)},${(256-(x[1]-centerY)*scale).toFixed(2)}`).join(' ');
        triangles.push({depth:(p[0][2]+p[1][2]+p[2][2])/3,path,shade});
      }
      triangles.sort((a,b)=>a.depth-b.depth);
      const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="white"/><g>${triangles.map(t=>`<polygon points="${t.path}" fill="rgb(${t.shade},${t.shade},${t.shade})"/>`).join('')}</g><text x="12" y="24" font-family="sans-serif" font-size="18" fill="#172635">${view.name}</text><text x="12" y="498" font-family="sans-serif" font-size="14" fill="#172635">${mesh.extents}</text></svg>`;
      const png=await sharp(Buffer.from(svg)).png().toBuffer();
      output[index].push({mediaType:'image/png',data:png.toString('base64')});
      }
    }
    return output;
}

export async function renderCandidateViews(stepPath: string): Promise<AgentImage[]> {
  return withOcctLock(async () => { await initOcct(); return (await renderMeshes([await loadMesh(stepPath)]))[0]; });
}

export async function renderCandidateComparison(firstPath: string, secondPath: string): Promise<[AgentImage[], AgentImage[]]> {
  return withOcctLock(async () => {
    await initOcct();
    const result = await renderMeshes([await loadMesh(firstPath), await loadMesh(secondPath)]);
    return [result[0], result[1]];
  });
}
