// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { CaptureSession } from './capture/captureSession';
import type { KernelCadApi } from './api';
import { buildSpurGearPair } from './spurGearPair';

export function makeSpurGearPairMethod(
  session: CaptureSession,
  self: () => KernelCadApi,
): KernelCadApi['spurGearPair'] {
  return (opts) => buildSpurGearPair(session, self(), opts);
}
