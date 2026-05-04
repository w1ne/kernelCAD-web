// src/capture/faceLabels.ts
// Shared capture-time validation for `faceLabels` option on creating ops.
// Kept in a separate module to avoid circular dependencies between
// captureSession.ts (imports Sketch) and sketch.ts (needs this validator).

import { KernelError } from '../intent/kernelError';
import type { FaceLabelsMap } from '../intent/featureRecord';

const CANONICAL_FACES = ['top', 'bottom', 'left', 'right', 'front', 'back'] as const;

/** Validate and return a FaceLabelsMap. Throws KernelError if raw is malformed.
 *  Returns undefined if raw is undefined (no faceLabels provided). */
export function validateFaceLabels(
  raw: unknown,
  featureKind: string,
): FaceLabelsMap | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new KernelError(
      'capture.faceLabels.invalid-shape',
      `faceLabels must be an object map; got ${Array.isArray(raw) ? 'array' : typeof raw}`,
      featureKind,
    );
  }
  const result: FaceLabelsMap = {};
  for (const [label, value] of Object.entries(raw)) {
    if (typeof label !== 'string' || label.length === 0) {
      throw new KernelError(
        'capture.faceLabels.invalid-key',
        `faceLabels keys must be non-empty strings; got '${label}'`,
        featureKind,
      );
    }
    if (typeof value === 'string') {
      if (!(CANONICAL_FACES as readonly string[]).includes(value)) {
        throw new KernelError(
          'capture.faceLabels.invalid-value',
          `faceLabels['${label}'] = '${value}' is not a canonical face name. Allowed: ${CANONICAL_FACES.join(', ')}.`,
          featureKind,
        );
      }
      result[label] = value as FaceLabelsMap[string];
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // FaceQuery — structural validation deferred to resolution time.
      result[label] = value as FaceLabelsMap[string];
    } else {
      throw new KernelError(
        'capture.faceLabels.invalid-value',
        `faceLabels['${label}'] must be a canonical face name or a FaceQuery descriptor; got ${typeof value}`,
        featureKind,
      );
    }
  }
  return result;
}
