// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { CaptureSession } from './capture/captureSession';
import { validateFaceLabels } from './capture/faceLabels';
import { KernelError } from '../shared/intent/kernelError';
import { validateThickness, validateKFactor } from './sheetMetal';
import { sphere as sdfSphere, box as sdfBox, cylinder as sdfCylinder, torus as sdfTorus } from './sdf/primitives';
import { smoothBlend as sdfSmoothBlend } from './sdf/smoothBlend';
import { materialize as sdfMaterialize } from './sdf/materialize';
import { mm, ul } from './apiSupport';
import type { KernelCadApi } from './api';

type CaptureShapeMethods = Pick<KernelCadApi, 'sheetMetal' | 'sdf'>;

type CaptureRecordMethods = Pick<
  KernelCadApi,
  | 'referenceImage'
  | 'setRenderEnvironment'
  | 'setCameraTarget'
  | 'setCameraDistance'
  | 'animationView'
  | 'dfmSpec'
>;

function makeCaptureShapeMethods(session: CaptureSession): CaptureShapeMethods {
  return {
    sheetMetal(profile, opts) {
      // Capture-time validation. Evaluate Editable inputs once.
      const thicknessParam = mm(opts.thickness);
      const kFactorParam = ul(opts.kFactor);
      const tNum = thicknessParam.evaluated;
      const kNum = kFactorParam.evaluated;
      // Throws feature.invalid-args / feature.sheetMetal.kfactor-invalid.
      validateThickness(tNum);
      validateKFactor(kNum);
      const faceLabels = validateFaceLabels(opts.faceLabels, 'sheetMetal');
      return session.createShape({
        kind: 'sheetMetal',
        params: {
          thickness: thicknessParam,
          kFactor: kFactorParam,
        },
        inputs: { sketch: { kind: 'feature', id: profile.id } },
        // Sketch plane is captured so flattenPattern() can project back
        // without re-deriving. Slice-1 sketches lower on the XY plane.
        metadata: {
          sketchPlane: 'xy',
          ...(faceLabels ? { faceLabels } : {}),
        },
      });
    },

    sdf: {
      sphere: sdfSphere,
      box: sdfBox,
      cylinder: sdfCylinder,
      torus: sdfTorus,
      smoothBlend: sdfSmoothBlend,
      materialize: (field, opts) => sdfMaterialize({ session }, field, opts),
      bind: (name, field) => {
        if (typeof name !== 'string' || name.length === 0) {
          throw new KernelError(
            'feature.invalid-args',
            `sdf.bind: name must be a non-empty string; got ${JSON.stringify(name)}.`,
            undefined,
            'invalid-args.sdf.bind.name — pass a non-empty string identifier.',
          );
        }
        session.sdfFields.set(name, field);
      },
    },
  };
}

function makeCaptureRecordMethods(session: CaptureSession): CaptureRecordMethods {
  return {
    referenceImage(path, opts) {
      const id = session.addReferenceImage({ path, ...opts });
      const record = session.getRecords().find(r => r.id === id)!;
      // Cast metadata — ReferenceImageMetadata is stored under the [key: string]: unknown
      // index signature of FeatureMetadata, so we re-surface it with proper typing here.
      const metadata = record.metadata as unknown as import('../shared/intent/referenceImageRecord').ReferenceImageMetadata;
      return { id, metadata };
    },

    setRenderEnvironment(spec) {
      const id = session.addRenderEnvironment(spec);
      const record = session.getRecords().find(r => r.id === id)!;
      const metadata = record.metadata as unknown as import('../shared/intent/renderEnvironmentRecord').RenderEnvironmentMetadata;
      return { id, metadata };
    },

    setCameraTarget(x, y, z) {
      const id = session.addCameraTarget({ x, y, z });
      const record = session.getRecords().find(r => r.id === id)!;
      const metadata = record.metadata as unknown as import('../shared/intent/cameraTargetRecord').CameraTargetMetadata;
      return { id, metadata };
    },

    setCameraDistance(distance) {
      // Inherit the most recently captured camera target (last-wins ordering
      // matches what the renderer applies). When no setCameraTarget call
      // has happened yet, default to the world origin — the renderer will
      // still respect the distance override and orbit the pose around (0,
      // 0, 0).
      const records = session.getRecords();
      let target: [number, number, number] = [0, 0, 0];
      for (const r of records) {
        if (r.kind !== 'cameraTarget') continue;
        const meta = r.metadata as unknown as import('../shared/intent/cameraTargetRecord').CameraTargetMetadata;
        if (Array.isArray(meta.target) && meta.target.length === 3) {
          target = [meta.target[0], meta.target[1], meta.target[2]];
        }
      }
      const id = session.addCameraTarget({ x: target[0], y: target[1], z: target[2], distance });
      const record = session.getRecords().find(r => r.id === id)!;
      const metadata = record.metadata as unknown as import('../shared/intent/cameraTargetRecord').CameraTargetMetadata;
      return { id, metadata };
    },

    animationView(spec) {
      const id = session.addAnimationView(spec);
      const record = session.getRecords().find(r => r.id === id)!;
      const metadata = record.metadata as unknown as import('../shared/intent/animationViewRecord').AnimationViewMetadata;
      return { id, metadata };
    },

    dfmSpec(spec) {
      const id = session.addDfmSpec(spec);
      const record = session.getRecords().find(r => r.id === id)!;
      const metadata = record.metadata as unknown as import('../shared/intent/dfmSpecRecord').DfmSpecMetadata;
      return { id, metadata };
    },
  };
}

export function makeCaptureMethods(
  session: CaptureSession,
): Pick<
  KernelCadApi,
  | 'sheetMetal'
  | 'sdf'
  | 'referenceImage'
  | 'setRenderEnvironment'
  | 'setCameraTarget'
  | 'setCameraDistance'
  | 'animationView'
  | 'dfmSpec'
> {
  return {
    ...makeCaptureShapeMethods(session),
    ...makeCaptureRecordMethods(session),
  };
}
