// Joint-pose ParamRef discriminator — Slice 2C.
//
// A joint pose is mechanically just a `ParamRef<number>` living in the
// session's ParamTable: `arm.mate(...).revolute({ pose: param('shoulder', 0) })`
// pushes the pose through the same `params.update` codepath as any geometry
// param. The Studio UI, though, needs to distinguish "this is an assembly
// joint angle" from "this is a regular numeric param" so it can render the
// right control — sliders with limit marks in JointsTab vs the catch-all
// scrub input in ParamsTab.
//
// `ParamRef` instances are `Object.freeze`'d (see `paramRef.ts`), so we can't
// stamp a `kind` property onto them. A `WeakSet` registry sidesteps that:
// `makeJointPoseParamRef` registers the freshly-minted ref, and
// `isJointPoseParamRef` checks membership. The WeakSet doesn't pin refs in
// memory — they can still be collected when the script tears down a session.

import { isParamRef, makeParamRef, ParamRef } from './paramRef';

const jointPoseRegistry = new WeakSet<ParamRef<number>>();

/**
 * Create a numeric `ParamRef` that's tagged as a joint pose. Use this in
 * place of `makeParamRef(name, 'number')` when authoring the pose argument
 * to `arm.mate(...)` so the Studio shell can surface it in JointsTab.
 */
export function makeJointPoseParamRef(name: string): ParamRef<number> {
  const ref = makeParamRef<number>(name, 'number');
  jointPoseRegistry.add(ref);
  return ref;
}

/**
 * True iff `value` is a joint-pose ParamRef created by
 * `makeJointPoseParamRef`. Regular numeric ParamRefs (e.g. from
 * `param('width', 100)`) return `false`.
 */
export function isJointPoseParamRef(value: unknown): value is ParamRef<number> {
  if (!isParamRef(value)) return false;
  if (value._type !== 'number') return false;
  return jointPoseRegistry.has(value as ParamRef<number>);
}
