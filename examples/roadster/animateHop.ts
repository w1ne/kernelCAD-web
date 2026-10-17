// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Side-view frames of a hop. The only motion input is the dynamics samples.

import type { DynamicsSample } from '../../src/dynamics/run';

export interface AirborneFrame {
  readonly t: number;
  readonly heightM: number;
  readonly clearanceM: number;
  readonly tiltDeg: number;
}

export function airborneFrame(samples: readonly DynamicsSample[], restM: number): AirborneFrame {
  let best = samples[0];
  if (!best) throw new Error('animation needs at least one dynamics sample');
  for (const sample of samples) {
    if (sample.positionM[2] > best.positionM[2]) best = sample;
  }
  return {
    t: best.t,
    heightM: best.positionM[2],
    clearanceM: best.positionM[2] - restM,
    tiltDeg: best.tiltDeg,
  };
}

/** SVG filmstrip. One cell per sample. Height is the dynamics z, in metres. */
export function hopFilmstripSvg(samples: readonly DynamicsSample[], restM: number, lengthM: number): string {
  const frame = airborneFrame(samples, restM);
  const cellW = 140;
  const cellH = 120;
  const groundY = 100;
  const scale = 18;
  const bodyW = Math.min(90, lengthM * 8);
  const bodyH = 16;
  const cells = samples.map((sample, index) => {
    const clearance = sample.positionM[2] - restM;
    const x = 20 + index * cellW;
    const y = groundY - clearance * scale - bodyH;
    return `<g data-t="${sample.t.toFixed(3)}" data-height="${sample.positionM[2].toFixed(4)}" data-clearance="${clearance.toFixed(4)}" data-tilt="${sample.tiltDeg.toFixed(3)}">`
      + `<line x1="${x}" y1="${groundY}" x2="${x + cellW - 30}" y2="${groundY}" stroke="#444"/>`
      + `<g transform="translate(${x + 10} ${y}) rotate(${(-sample.tiltDeg).toFixed(2)} ${bodyW / 2} ${bodyH})">`
      + `<polygon points="0,${bodyH} ${bodyW * 0.2},${bodyH * 0.45} ${bodyW * 0.55},2 ${bodyW},${bodyH * 0.35} ${bodyW},${bodyH}" fill="#e8e8e8" stroke="#111"/>`
      + `</g></g>`;
  }).join('');
  const width = 20 + samples.length * cellW;
  return `<?xml version="1.0" encoding="UTF-8"?>\n`
    + `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${cellH}" viewBox="0 0 ${width} ${cellH}">`
    + `<title>Roadster hop peak ${frame.heightM.toFixed(3)} m at t=${frame.t.toFixed(2)} s, tilt ${frame.tiltDeg.toFixed(2)} deg</title>`
    + cells
    + `</svg>\n`;
}
