// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/cfd/regime.ts
//
// Flow regime from the Reynolds number, and the turbulence model it implies.
// The thresholds are textbook engineering ones, stated in the reason string
// so the caller sees why a model was chosen:
//   internal (pipe / duct, Re on the equivalent inlet diameter):
//     Re < 2300 laminar; 2300..4000 transitional (k-omega SST, flagged);
//     > 4000 turbulent (k-omega SST).
//   external (Re on the equivalent frontal diameter):
//     Re < 1000 laminar steady solve (wake unsteadiness flagged above 200);
//     above that k-omega SST.

import type { CfdTurbulenceChoice } from '../../shared/intent/cfdStudyRecord';
import type { CfdTurbulenceModel } from './types';

export interface RegimeChoice {
  model: CfdTurbulenceModel;
  chosen: 'auto' | 'user';
  reason: string;
  /** A caveat worth a diagnostic (transitional pipe flow, unsteady wake,
   *  or a user choice that contradicts the Reynolds number). */
  caveat?: string;
}

export const PIPE_LAMINAR_RE = 2300;
export const PIPE_TURBULENT_RE = 4000;
export const EXTERNAL_LAMINAR_RE = 1000;
export const EXTERNAL_STEADY_WAKE_RE = 200;

function autoInternal(re: number): RegimeChoice {
  if (re < PIPE_LAMINAR_RE) return { model: 'laminar', chosen: 'auto', reason: `Re ${re.toFixed(0)} < ${PIPE_LAMINAR_RE}: laminar internal flow.` };
  if (re <= PIPE_TURBULENT_RE) {
    return {
      model: 'kOmegaSST',
      chosen: 'auto',
      reason: `Re ${re.toFixed(0)} is transitional (${PIPE_LAMINAR_RE}..${PIPE_TURBULENT_RE}); k-omega SST used.`,
      caveat: `Re ${re.toFixed(0)} is in the laminar-turbulent transition range, where neither a laminar nor a RANS model is reliable; treat the pressure drop as a +/-30% estimate.`,
    };
  }
  return { model: 'kOmegaSST', chosen: 'auto', reason: `Re ${re.toFixed(0)} > ${PIPE_TURBULENT_RE}: turbulent internal flow, k-omega SST.` };
}

function autoExternal(re: number): RegimeChoice {
  if (re < EXTERNAL_LAMINAR_RE) {
    const base: RegimeChoice = { model: 'laminar', chosen: 'auto', reason: `Re ${re.toFixed(0)} < ${EXTERNAL_LAMINAR_RE}: laminar external flow.` };
    return re > EXTERNAL_STEADY_WAKE_RE
      ? { ...base, caveat: `Re ${re.toFixed(0)} > ${EXTERNAL_STEADY_WAKE_RE}: a bluff-body wake usually sheds vortices here; this steady solve gives an approximate mean force, not the unsteady loads.` }
      : base;
  }
  return {
    model: 'kOmegaSST',
    chosen: 'auto',
    reason: `Re ${re.toFixed(0)} >= ${EXTERNAL_LAMINAR_RE}: turbulent external flow, k-omega SST (steady RANS, wall functions).`,
    caveat: 'Steady RANS on a snapped mesh without boundary layers: drag is an estimate (typically within 10-30%), lift on a near-symmetric body is mostly noise.',
  };
}

export function chooseTurbulence(flow: 'internal' | 'external', re: number, user: CfdTurbulenceChoice): RegimeChoice {
  const auto = flow === 'internal' ? autoInternal(re) : autoExternal(re);
  if (user === 'auto') return auto;
  const reason = `${user} requested; the Reynolds number (${re.toFixed(0)}) suggests ${auto.model}.`;
  return user === auto.model
    ? { model: user, chosen: 'user', reason }
    : { model: user, chosen: 'user', reason, caveat: `turbulence '${user}' contradicts Re ${re.toFixed(0)} (auto would pick ${auto.model}).` };
}

/** k and omega inlet values from intensity and a length scale (m). */
export function turbulenceInlet(speed: number, intensity: number, lengthM: number): { k: number; omega: number } {
  const k = Math.max(1.5 * (intensity * speed) ** 2, 1e-10);
  const l = Math.max(0.07 * lengthM, 1e-6);
  return { k, omega: Math.sqrt(k) / (0.09 ** 0.25 * l) };
}
