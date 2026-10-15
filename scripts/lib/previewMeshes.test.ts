// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Transform } from '../../src/shared/runtime/se3';
import type { CaptureSession } from '../../src/modeling/capture/captureSession';
import type { SceneBackend } from '../../src/kernel/backends/sceneBackend';
import { previewFeatureMeshes } from './previewMeshes';
const mock=vi.hoisted(()=>({mesh:vi.fn(),clean:vi.fn()}));
vi.mock('replicad',()=>({getOC:()=>({BRepTools:{Clean:mock.clean}})}));
vi.mock('../../src/kernel/backends/occt/meshing',()=>({meshShape:mock.mesh}));
const options={tolerance:2.5,angularTolerance:.85};
const face={faceId:0,vertices:new Float32Array([0,0,0,1,0,0,0,1,0]),normals:new Float32Array([1,0,0,1,0,0,1,0,0]),indices:new Uint32Array([0,1,2])};
function fixture(faceCount=1) {
  const raw={wrapped:{id:'topology'},faces:Array.from({length:faceCount},()=>({}))};
  const tail={_kind:'scene',assemblyName:'a',parts:[{name:'tube',shape:{getReplicadShape:()=>raw},color:'#ff0000',material:{baseColor:'#ff0000'},worldTransform:Transform.translation(3,4,5).compose(Transform.rotationAxisAngleDeg([0,0,1],90))}]} as unknown as SceneBackend;
  const session={assemblies:new Map()} as unknown as CaptureSession;
  return {tail,session,raw};
}
beforeEach(()=>{mock.mesh.mockReset().mockReturnValue({faces:[face]});mock.clean.mockClear();});
describe('explicit web preview',()=>{
  it('clears cached topology and bakes rotation/translation while retaining normals and style',()=>{
    const {tail,session,raw}=fixture();
    const [mesh]=previewFeatureMeshes(tail,session,options);
    expect(mock.clean).toHaveBeenCalledWith(raw.wrapped,true);
    expect(mock.mesh).toHaveBeenCalledWith(raw,options);
    expect(Array.from(mesh.faces[0].vertices)).toEqual([3,4,5,3,5,5,2,4,5]);
    expect(mesh.faces[0].normals[0]).toBeCloseTo(0);expect(mesh.faces[0].normals[1]).toBeCloseTo(1);
    expect(mesh.material).toEqual({baseColor:'#ff0000'});expect(mesh.displayName).toBe('tube');
    expect(Array.from(face.vertices)).toEqual([0,0,0,1,0,0,0,1,0]);
  });
  it('fails any missing part mesh rather than silently publishing a partial assembly',()=>{
    const {tail,session}=fixture();mock.mesh.mockReturnValue(null);
    expect(()=>previewFeatureMeshes(tail,session,options)).toThrow(/incomplete geometry/);
  });
  it('fails partial face meshing',()=>{
    const {tail,session}=fixture(2);
    expect(()=>previewFeatureMeshes(tail,session,options)).toThrow(/incomplete geometry/);
  });
  it('explicitly rejects assemblies with synthetic tendons',()=>{
    const {tail,session}=fixture();session.assemblies.set('a',{__tendons:()=>[{}]});
    expect(()=>previewFeatureMeshes(tail,session,options)).toThrow(/tendon.*unsupported/);
    expect(mock.mesh).not.toHaveBeenCalled();
  });
});
