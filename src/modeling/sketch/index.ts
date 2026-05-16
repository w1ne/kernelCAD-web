// src/modules/sketch/index.ts
//
// `sketch` namespace API. Currently exposes one method, `text(content, opts)`,
// which registers a sketch-kind FeatureRecord whose metadata encodes the
// rendered string + opts. The OCCT lowerer dispatches on `metadata.textContent`.

import type { CaptureSession } from '../capture/captureSession';
import { Sketch } from '../capture/sketch';
import { KernelError } from '../../shared/intent/kernelError';
import { toParam } from '../../shared/runtime/editableHelpers';
import type { Editable } from '../../shared/runtime/paramRef';
import type { Param } from '../../shared/intent/types';
import type { DiagnosticCode } from '../../shared/diagnostics/codes';

export interface SketchTextOpts {
  /** Logical font family name OR a `fontPath('/path/to/font.ttf')` value.
   *  Omit for the bundled Liberation Sans. */
  font?: string;
  /** Glyph cap height in mm. Required. Positive finite. */
  size: Editable<number>;
  /** Horizontal alignment relative to `position`. Default 'left'. */
  align?: 'left' | 'center' | 'right';
  /** XY anchor in the sketch's local plane (mm). Default [0, 0]. */
  position?: [Editable<number>, Editable<number>];
  /** CCW rotation in degrees, around `position`. Default 0. */
  rotation?: Editable<number>;
}

export interface SketchModule {
  text(content: string, opts: SketchTextOpts): Sketch;
}

interface TextMetadata {
  textContent: string;
  textOpts: {
    size: Param;
    align: 'left' | 'center' | 'right';
    position: { x: Param; y: Param };
    rotation: Param;
  };
  /** Logical font family or undefined (= bundled default). */
  fontFamily?: string;
}

export function createSketchModule(session: CaptureSession): SketchModule {
  return {
    text(content, opts): Sketch {
      if (typeof content !== 'string') {
        throw new KernelError(
          'feature.invalid-args',
          `sketch.text: content must be a string; got ${typeof content}.`,
          undefined,
          'Pass a string literal or variable to sketch.text(content, opts).',
        );
      }
      // eslint-disable-next-line no-control-regex
      if (content.length === 0 || /^[\s\x00-\x1F\x7F]*$/.test(content)) {
        throw new KernelError(
          'sketch.text.empty-content' as DiagnosticCode,
          `sketch.text: content must contain at least one printable glyph (got ${JSON.stringify(content)}).`,
          undefined,
          'sketch.text(content) requires a non-empty string with at least one printable glyph.',
        );
      }
      if (opts == null || typeof opts !== 'object') {
        throw new KernelError(
          'feature.invalid-args',
          `sketch.text: opts must be an object with a numeric size.`,
          undefined,
          'Pass { size: <mm>, ... } as the second argument.',
        );
      }
      const align = opts.align ?? 'left';
      if (align !== 'left' && align !== 'center' && align !== 'right') {
        throw new KernelError(
          'feature.invalid-args',
          `sketch.text: align must be 'left' | 'center' | 'right' (got ${JSON.stringify(align)}).`,
          undefined,
          "Pass align: 'left' | 'center' | 'right' (default 'left').",
        );
      }
      const positionXY = opts.position ?? [0, 0];
      const metadata: TextMetadata = {
        textContent: content,
        textOpts: {
          size: toParam(opts.size, 'mm'),
          align,
          position: {
            x: toParam(positionXY[0], 'mm'),
            y: toParam(positionXY[1], 'mm'),
          },
          rotation: toParam(opts.rotation ?? 0, 'unitless'),
        },
        fontFamily: opts.font,
      };
      return session.createSketch({
        kind: 'sketch',
        inputs: {},
        params: {},
        metadata: metadata as unknown as Record<string, unknown>,
      });
    },
  };
}
