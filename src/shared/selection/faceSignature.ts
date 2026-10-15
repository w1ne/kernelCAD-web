// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { GeometryResult } from '../worker/workerTypes';
import type { FaceSignature, SharedSelection } from './sharedSelection';

export function signatureForSelection(geometries: readonly GeometryResult[], selection: SharedSelection): FaceSignature | null {
  if (!selection || selection.kind !== 'face') return null;
  const geometry = geometries[selection.shapeIndex];
  const faceIndex = geometry?.faces.findIndex(candidate => candidate.faceId === selection.id) ?? -1;
  const face = faceIndex >= 0 ? geometry?.faces[faceIndex] : undefined;
  const owner = ownerForFace(geometry, faceIndex, selection.featureId);
  if (!face || !owner) return null;
  const bounds = boundsOf(face.vertices);
  const { area, centroid, normal } = faceMetrics(face.vertices, face.indices);
  if (!(area>0) || !bounds.every(Number.isFinite)) return null;
  return {owner,surface:face.plane?'plane':face.cylinder?'cylinder':'other',area,
    centroid,normal,bounds:bounds as FaceSignature['bounds']};
}

function ownerForFace(geometry: GeometryResult | undefined, faceIndex: number, fallback: string | null): string | null {
  return (faceIndex >= 0 ? geometry?.faceOwners?.[faceIndex] : undefined) || geometry?.featureId || fallback;
}

function boundsOf(vertices: Float32Array): number[] {
  const bounds = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (let i = 0; i < vertices.length; i += 3) {
    for (let axis = 0; axis < 3; axis++) {
      const value = vertices[i + axis]!;
      bounds[axis] = Math.min(bounds[axis]!, value);
      bounds[axis + 3] = Math.max(bounds[axis + 3]!, value);
    }
  }
  return bounds;
}

function faceMetrics(vertices: Float32Array, indices: Uint32Array) {
  let area = 0, x = 0, y = 0, z = 0, nx = 0, ny = 0, nz = 0;
  for (let i = 0; i + 2 < indices.length; i += 3) {
    const a=indices[i]!*3,b=indices[i+1]!*3,c=indices[i+2]!*3;
    const abx=vertices[b]!-vertices[a]!, aby=vertices[b+1]!-vertices[a+1]!, abz=vertices[b+2]!-vertices[a+2]!;
    const acx=vertices[c]!-vertices[a]!, acy=vertices[c+1]!-vertices[a+1]!, acz=vertices[c+2]!-vertices[a+2]!;
    const cx=aby*acz-abz*acy, cy=abz*acx-abx*acz, cz=abx*acy-aby*acx;
    nx += cx; ny += cy; nz += cz;
    const triangleArea=Math.hypot(cx,cy,cz)/2;
    area+=triangleArea;
    x+=triangleArea*(vertices[a]!+vertices[b]!+vertices[c]!)/3;
    y+=triangleArea*(vertices[a+1]!+vertices[b+1]!+vertices[c+1]!)/3;
    z+=triangleArea*(vertices[a+2]!+vertices[b+2]!+vertices[c+2]!)/3;
  }
  const normalLength = Math.hypot(nx,ny,nz);
  const normalStrength = normalLength / (2 * area);
  const normal = normalStrength >= 0.1
    ? [nx/normalLength,ny/normalLength,nz/normalLength] as [number,number,number]
    : null;
  return { area, centroid: [x/area,y/area,z/area] as [number,number,number], normal };
}

function near(a:number,b:number,tolerance:number):boolean{return Math.abs(a-b)<=tolerance;}
export function remapFaceSignature(geometries: readonly GeometryResult[], signature: FaceSignature): SharedSelection | null {
  const matches: SharedSelection[]=[];
  for(let shapeIndex=0;shapeIndex<geometries.length;shapeIndex++){
    const geometry=geometries[shapeIndex]!;
    for(let faceIndex=0;faceIndex<geometry.faces.length;faceIndex++){
      const face=geometry.faces[faceIndex]!;
      const selection:SharedSelection={shapeIndex,kind:'face',id:face.faceId,featureId:geometry.faceOwners?.[faceIndex]||geometry.featureId||null};
      const candidate=signatureForSelection(geometries,selection);
      if(!candidate||candidate.owner!==signature.owner||candidate.surface!==signature.surface)continue;
      if(!matchesSignature(candidate,signature))continue;
      matches.push(selection);
    }
  }
  return matches.length===1?matches[0]!:null;
}

function matchesSignature(candidate: FaceSignature, signature: FaceSignature): boolean {
  const length=Math.max(1,Math.hypot(...signature.bounds.slice(3).map((v,i)=>v-signature.bounds[i]!)));
  const positionTolerance=Math.max(1e-5,length*0.001);
  const areaMatches=near(candidate.area,signature.area,Math.max(1e-6,signature.area*0.001));
  const centroidMatches=candidate.centroid.every((value,index)=>near(value,signature.centroid[index]!,positionTolerance));
  const normalMatches=hasDistinguishingNormal(candidate, signature);
  const boundsMatch=candidate.bounds.every((value,index)=>near(value,signature.bounds[index]!,positionTolerance));
  return candidate.owner===signature.owner&&candidate.surface===signature.surface&&areaMatches&&centroidMatches&&normalMatches&&boundsMatch;
}

function hasDistinguishingNormal(candidate: FaceSignature, signature: FaceSignature): boolean {
  if (!candidate.normal || !signature.normal) return false;
  return Math.hypot(...candidate.normal.map((value,index)=>value-signature.normal![index]!))<=0.02;
}
