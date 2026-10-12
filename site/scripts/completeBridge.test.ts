import { describe, it, expect } from 'vitest';
import type { ShapeBackend } from '../../src/kernel/backends/backend';
import type { SceneBackend } from '../../src/kernel/backends/sceneBackend';
import type { FeatureRecord } from '../../src/shared/intent/featureRecord';
import type { FeatureMesh, MeshFeaturesResult } from '../../src/modeling/capture/featureMeshing';
import type { CaptureSession } from '../../src/modeling/capture/captureSession';
import { meshShape } from '../../src/kernel/backends/occt/meshing';
import { emitSceneBackendFanout } from '../../src/modeling/capture/featureMeshingPhases';
import { Transform } from '../../src/shared/runtime/se3';
import { assertCompleteBridgeGeometry } from './completeBridge';

const record = (id: string, kind: FeatureRecord['kind'] = 'box'): FeatureRecord => ({
  id, kind, inputs: {}, params: {}, transforms: [], suppressed: false,
});
const shape = (count: number): ShapeBackend => ({
  getReplicadShape: () => ({ faces: Array.from({length:count}, () => ({})) }),
} as unknown as ShapeBackend);
const face = (faceId: number) => ({
  faceId, vertices: new Float32Array([0,0,0,1,0,0,0,1,0]),
  normals: new Float32Array([0,0,1,0,0,1,0,0,1]), indices: new Uint32Array([0,1,2]),
});
const partMesh = (name: string): FeatureMesh => ({
  featureId: `assembly__${name}`, featureKind:'assemblyModel', predecessors:['assembly'],
  assemblyFeatureId:'assembly', assemblyPartName:name, faces:[face(0),face(1)],
});
function fixture() {
  const scene: SceneBackend = { target:'occt', _kind:'scene', assemblyName:'current', parts:[
    { name:'good', shape:shape(2), worldTransform:Transform.identity() },
    { name:'other', shape:shape(2), worldTransform:Transform.identity() },
  ] };
  const result: MeshFeaturesResult = {
    features:[partMesh('good'),partMesh('other')], shapes:new Map([['assembly',scene as unknown as ShapeBackend]]),
    failedFeatureIds:[], bounds:{min:[0,0,0],max:[1,1,0]}, materialShadowingWarnings:[], colorShadowingWarnings:[],
  };
  const session: Pick<CaptureSession,'assemblies'> = { assemblies:new Map([['current',{__tendons:()=>[]}]]) };
  return {result,session,records:[record('assembly','assemblyModel')]};
}
const check = (f: ReturnType<typeof fixture>) => assertCompleteBridgeGeometry(f.records,f.result,f.session,'selected');
describe('selected complete bridge geometry',()=>{
  it('accepts every current declared part and face',()=>expect(()=>check(fixture())).not.toThrow());
  it('rejects the actual native fan-out partial-part counterexample with no failed IDs',()=>{
    const f=fixture();f.result.features=[];
    const scene=f.result.shapes!.get('assembly') as unknown as SceneBackend;
    emitSceneBackendFanout('assembly','assemblyModel',scene,{
      emitFeature:mesh=>f.result.features.push(mesh),
      bounds:{minX:Infinity,minY:Infinity,minZ:Infinity,maxX:-Infinity,maxY:-Infinity,maxZ:-Infinity},
      failedFeatureIds:f.result.failedFeatureIds,
      cachedAssemblyPartMeshes:new Map([['assembly',new Map([['good',{faces:[face(0),face(1)]}]])]]),
      assembliesIn:f.session.assemblies,collectTendonMeshes:()=>[],attachPlanarUVs:()=>{},
      extractRawShape:()=>null,meshIdentityFields:()=>({}),metadataNameOf:()=>undefined,recordById:new Map(),
    });
    expect(f.result.features).toHaveLength(1);
    expect(f.result.failedFeatureIds).toEqual([]);
    expect(()=>check(f)).toThrow(/other.*mesh/);
  });
  it('rejects a silently missing part while another part remains valid',()=>{
    const f=fixture();f.result.features.pop();expect(()=>check(f)).toThrow(/other.*mesh/);
  });
  it('rejects actual core meshing that silently catches one native face failure',()=>{
    const f=fixture();const good=face(0);
    const raw={faces:[
      {mesh:()=>({vertices:Array.from(good.vertices),normals:Array.from(good.normals),triangles:Array.from(good.indices)})},
      {mesh:()=>{throw new Error('deliberate native face failure');}},
    ]};
    const meshed=meshShape(raw,{tolerance:.1,angularTolerance:.3});
    expect(meshed!.faces).toHaveLength(1);expect(f.result.failedFeatureIds).toEqual([]);
    const scene=f.result.shapes!.get('assembly') as unknown as SceneBackend;
    const native={getReplicadShape:()=>raw} as unknown as ShapeBackend;
    f.result.shapes=new Map([['assembly',{...scene,parts:scene.parts.map(part=>part.name==='other'?{...part,shape:native}:part)} as unknown as ShapeBackend]]);
    f.result.features[1].faces=meshed!.faces;
    expect(()=>check(f)).toThrow(/other.*face/);
  });
  it('rejects a missing face inside one otherwise present part',()=>{
    const f=fixture();f.result.features[1].faces.pop();expect(()=>check(f)).toThrow(/other.*face/);
  });
  it('rejects an empty part mesh while another part remains valid',()=>{
    const f=fixture();f.result.features[1].faces=[];expect(()=>check(f)).toThrow(/other.*face/);
  });
  it('rejects an empty individual face while other faces remain valid',()=>{
    const f=fixture();f.result.features[1].faces[1].indices=new Uint32Array();expect(()=>check(f)).toThrow(/other.*triangle/);
  });
  it('rejects duplicated face IDs hiding a missing native face',()=>{
    const f=fixture();f.result.features[1].faces[1].faceId=0;expect(()=>check(f)).toThrow(/other.*face/);
  });
  it('checks active native owners, excluding construction inputs and unrelated cached/session assemblies',()=>{
    const f=fixture();
    const source=record('source'), construction=record('part','assemblyPart');construction.inputs.shape={kind:'feature',id:'source'};
    f.records.unshift(source,construction);f.result.shapes=new Map([...(f.result.shapes ?? []),['source',shape(6)]]);
    f.session.assemblies.set('unused',{__tendons:()=>[{}]});
    expect(()=>check(f)).not.toThrow();
  });
  it('rejects declared synthetic tendons on the active scene explicitly',()=>{
    const f=fixture();f.session.assemblies.set('current',{__tendons:()=>[{}]});expect(()=>check(f)).toThrow(/tendon.*unsupported/);
  });
  it('validates standalone box topology without requiring construction meshes',()=>{
    const f=fixture();f.records=[record('box')];f.result.shapes=new Map([['box',shape(6)]]);
    f.result.features=[{featureId:'box',featureKind:'box',predecessors:[],faces:Array.from({length:6},(_,i)=>face(i))}];
    expect(()=>check(f)).not.toThrow();f.result.features[0].faces.pop();expect(()=>check(f)).toThrow(/box.*face/);
  });
  it('rejects duplicate native part ownership even when one matching mesh survives',()=>{
    const f=fixture();const scene=f.result.shapes!.get('assembly') as unknown as SceneBackend;
    f.result.shapes=new Map([['assembly',{...scene,parts:[scene.parts[0],scene.parts[0]]} as unknown as ShapeBackend]]);
    f.result.features=[partMesh('good')];expect(()=>check(f)).toThrow(/duplicate native part/);
  });
  it('rejects duplicated parts and unmatched physical groups',()=>{
    const f=fixture();f.result.features.push(partMesh('good'));expect(()=>check(f)).toThrow(/duplicated/);
    const unexpected=fixture();unexpected.result.features.push(partMesh('extra'));expect(()=>check(unexpected)).toThrow(/unmatched/);
  });
  it('excludes suppressed and virtual records but rejects missing active owner shapes',()=>{
    const f=fixture();f.records.unshift({...record('suppressed'),suppressed:true},{...record('virtual'),metadata:{virtual:true}});
    expect(()=>check(f)).not.toThrow();f.records.unshift(record('missing'));expect(()=>check(f)).toThrow(/missing.*native shape/);
  });
  it('fails closed when native ownership or all physical geometry is unavailable',()=>{
    const f=fixture();f.result.shapes=undefined;expect(()=>check(f)).toThrow(/native/);
    const empty=fixture();empty.result.features=[];expect(()=>check(empty)).toThrow();
  });
});
