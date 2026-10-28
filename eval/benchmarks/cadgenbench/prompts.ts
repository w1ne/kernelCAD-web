// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/benchmarks/cadgenbench/prompts.ts
//
// Task prompts for the two CADGenBench task families. The benchmark prompt
// (description.yaml / edit_description.txt) is passed through verbatim; the
// rest states the submission contract and general modeling checks for a
// kernelCAD `.kcad.ts` script (one closed solid, millimetres, recommended pose).
// No per-task engineering hints.

import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import type { StepInspectReport } from '../../../src/kernel/import/inspectStep';
import type { AgentImage } from '../../types';
import type { CadGenBenchTask } from './dataset';

/** File name the editing script imports; the harness copies input.step next to the script. */
export const EDIT_INPUT_NAME = 'input.step';

const CONTRACT = `## Output contract

- Return the complete script in ONE fenced \`\`\`ts code block.
- Units are millimetres.
- The script must return exactly ONE closed solid. It is exported to STEP and
  rejected unless it is a well-formed, watertight B-rep that tessellates into a
  closed manifold: no open surfaces, no separate bodies, no zero-thickness walls.`;

export function generationPrompt(task: CadGenBenchTask): string {
  const n = task.images.length;
  return `# CADGenBench generation task ${task.id}

${task.description}

The ${n === 1 ? 'attached image is the engineering drawing' : `${n} attached images are the engineering drawings`} of one
mechanical part. Build that part as a kernelCAD \`.kcad.ts\` script.

- Take every dimension from the drawing. Where the drawing leaves a size
  implicit, infer it from the stated dimensions and the view proportions.
- Model every feature the drawing shows: holes, counterbores, slots, pockets,
  fillets, chamfers. Draw a threaded hole as a plain hole of the drawn size.
- Before writing geometry, make a compact dimension ledger in script comments:
  record primary extents, axis/origin, each feature's size, location and count,
  and which values are inferred. Reconcile the views and section cuts instead
  of treating an outline in one view as the whole part.
- Before returning, cross-check the script against that ledger: units, radii
  versus diameters, spacing, wall thickness, feature count, blind versus
  through features, and whether all openings actually pass through material.
  A drawn diameter is the bore diameter, not the radius. A cut that does not
  intersect the body is a failed feature.
  Keep unsupported details as explicit assumptions rather than invented facts.
- End the comments with the posed solid's bounding sizes in millimetres, and
  the volume when you can compute it from those dimensions:
  \`// ledger: extents <X> <Y> <Z>; volume <mm3>\`
  X, Y, Z are the bounding-box sizes after the pose below, longest along X.
- Pose (recommended by the benchmark): bounding-box centre at the origin,
  longest extent along X, middle along Y, shortest along Z; if the part has an
  obvious mounting face, put it on the -Z side with its normal along -Z.

${CONTRACT}
`;
}

function fmt(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(3).replace(/\.?0+$/, '');
}

/** Short text summary of the starting solid for an editing prompt. */
export function describeStartingSolid(report: StepInspectReport): string {
  const lines: string[] = [];
  for (const s of report.solids) {
    const { min, max } = s.bboxExact;
    lines.push(
      `- solid ${s.index}: bbox min (${min.map(fmt).join(', ')}) max (${max.map(fmt).join(', ')}), ` +
        `volume ${fmt(s.volumeMm3)} mm³, ${s.faceCount} faces`,
    );
    for (const h of s.holes.slice(0, 40)) {
      lines.push(
        `  - ${h.kind} hole ⌀${fmt(h.diameterMm)} depth ${fmt(h.depthMm)} at (${h.axisOrigin.map(fmt).join(', ')}) ` +
          `axis (${h.axisDirection.map(fmt).join(', ')})`,
      );
    }
    if (s.holes.length > 40) lines.push(`  - … ${s.holes.length - 40} more holes`);
  }
  return lines.join('\n');
}

export function editingPrompt(task: CadGenBenchTask, report: StepInspectReport | null): string {
  const solid = report ? describeStartingSolid(report) : '(inspection unavailable)';
  const renders = task.images.length > 0 ? `\nThe attached images are renders of the starting solid.\n` : '';
  return `# CADGenBench editing task ${task.id}

Change request:

> ${task.description.replace(/\n/g, '\n> ')}

The starting solid is \`./${EDIT_INPUT_NAME}\` next to the script. Import it with
\`const base = await lib.fromSTEP('./${EDIT_INPUT_NAME}');\`, apply exactly the
requested change (booleans, features), and return the edited solid.

- Leave everything the request does not mention unchanged.
- Keep the input's coordinate frame: do not move, rotate or re-centre the part.
- Identify the target face or feature using the request and input observations;
  record its position, orientation and relevant dimensions in script comments.
  Compute the requested direction and magnitude before editing. Distinguish an
  inward move into a pocket from removal of material, and preserve unrelated
  holes and faces. Do not claim a measurement or verification you did not run.
- The measurements below are the import \`lib.fromSTEP\` edits. On every attempt, return one fenced script. State an uncertain dimension as an assumption and still apply the requested change. Returning the unchanged solid is rejected.

Starting solid:
${solid}
${renders}
${CONTRACT}
`;
}

const MEDIA_TYPES: Record<string, AgentImage['mediaType']> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export function loadImages(paths: string[]): AgentImage[] {
  return paths.map((p) => {
    const mediaType = MEDIA_TYPES[extname(p).toLowerCase()];
    if (!mediaType) throw new Error(`unsupported image type: ${p}`);
    return { mediaType, data: readFileSync(p).toString('base64') };
  });
}
