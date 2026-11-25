// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Vec3 } from '../shared/intent/types';
import type { KernelCadApi } from './api';
import type { Shape } from './capture/proxy';
import type { CaptureSession } from './capture/captureSession';
import { buildWeldmentFrame } from './weldment/frame';
import { buildGusset } from './weldment/gusset';
import { buildStructuralMember } from './weldment/member';
import type {
  GussetOptions,
  StructuralMemberOptions,
  WeldmentFrameOptions,
  WeldmentFrameResult,
  WeldmentMemberSpec,
} from './weldment/types';

export type {
  AngleProfile,
  CChannelProfile,
  FlatBarProfile,
  GussetOptions,
  RectTubeProfile,
  RoundTubeProfile,
  SquareTubeProfile,
  StructuralMemberOptions,
  StructuralProfile,
  TrimPlaneSpec,
  WeldmentCutItem,
  WeldmentFrameOptions,
  WeldmentFrameResult,
  WeldmentMemberSpec,
  WeldmentTrimMode,
} from './weldment/types';

export function makeWeldmentMethods(
  session: CaptureSession,
  api: () => KernelCadApi,
): Pick<KernelCadApi, 'structuralMember' | 'weldmentFrame' | 'gusset'> {
  return {
    structuralMember(from: Vec3, to: Vec3, opts: StructuralMemberOptions): Shape {
      return buildStructuralMember(api(), from, to, opts);
    },
    weldmentFrame(
      members: readonly WeldmentMemberSpec[],
      opts?: WeldmentFrameOptions,
    ): WeldmentFrameResult {
      return buildWeldmentFrame(session, api(), members, opts);
    },
    gusset(corner: Vec3, dirA: Vec3, dirB: Vec3, opts: GussetOptions): Shape {
      return buildGusset(api(), corner, dirA, dirB, opts);
    },
  };
}
