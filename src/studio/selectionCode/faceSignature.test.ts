// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import type { GeometryResult } from '../../shared/worker/workerTypes';
import { remapFaceSignature, signatureForSelection } from './faceSignature';

function geom(offset=0, ids=[4]): GeometryResult {
  return { featureId:'extrude_1', faces:ids.map(faceId=>({faceId, plane:{origin:[offset,0,0] as [number,number,number],normal:[0,0,1] as [number,number,number]},
    vertices:new Float32Array([offset,0,0,offset+1,0,0,offset,1,0]),indices:new Uint32Array([0,1,2]),normals:new Float32Array([0,0,1,0,0,1,0,0,1])})) };
}
const pick={shapeIndex:0,kind:'face' as const,id:4,featureId:'extrude_1'};

describe('shared face signature remapping',()=>{
  it('uses face iteration position for owners when BREP ids are not array indexes',()=>{
    const geometry:GeometryResult={featureId:'fallback',faceOwners:['first-owner','second-owner'],faces:[
      ...geom(0,[10]).faces,...geom(2,[30]).faces,
    ]};
    const pick={shapeIndex:0,kind:'face' as const,id:30,featureId:'second-owner'};
    const signature=signatureForSelection([geometry],pick)!;
    expect(signature.owner).toBe('second-owner');
    expect(remapFaceSignature([geometry],signature)).toMatchObject({id:30,featureId:'second-owner'});
  });
  it('uses oriented triangle normals to distinguish same-signature faces with opposite orientation',()=>{
    const forward=geom(0,[4]);
    const reverse:GeometryResult={...geom(0,[5]),faces:geom(0,[5]).faces.map(face=>({...face,indices:new Uint32Array([0,2,1])}))};
    const signature=signatureForSelection([forward],pick)!;
    expect(remapFaceSignature([forward,reverse],signature)).toEqual(pick);
  });
  it('retains a face with unchanged geometry',()=>{
    const meshes=[geom()]; const signature=signatureForSelection(meshes,pick)!;
    expect(remapFaceSignature(meshes,signature)).toEqual(pick);
  });
  it('retains a uniquely matching face after a small parameter-driven move',()=>{
    const signature=signatureForSelection([geom()],pick)!;
    expect(remapFaceSignature([geom(0.001)],signature)).toMatchObject({kind:'face',id:4,featureId:'extrude_1'});
  });
  it('does not treat a nearby distinct face as a match using a broad absolute tolerance',()=>{
    const signature=signatureForSelection([geom()],pick)!;
    expect(remapFaceSignature([geom(0.1)],signature)).toBeNull();
  });
  it('refuses remapping when the oriented mesh provides no distinguishing normal',()=>{
    const geometry=geom();
    geometry.faces[0]!.indices=new Uint32Array([0,1,2,0,2,1]);
    const signature=signatureForSelection([geometry],pick)!;
    expect(signature.normal).toBeNull();
    expect(remapFaceSignature([geometry],signature)).toBeNull();
  });
  it('marks a nearly canceled aggregate orientation as unavailable',()=>{
    const geometry=geom();
    geometry.faces[0]!.indices=new Uint32Array([
      ...Array.from({length:10},()=>[0,1,2]).flat(),
      ...Array.from({length:9},()=>[0,2,1]).flat(),
    ]);
    expect(signatureForSelection([geometry],pick)?.normal).toBeNull();
  });
  it('clears deleted and ambiguous faces',()=>{
    const signature=signatureForSelection([geom()],pick)!;
    expect(remapFaceSignature([],signature)).toBeNull();
    expect(remapFaceSignature([geom(0,[4,5])],signature)).toBeNull();
  });
});
