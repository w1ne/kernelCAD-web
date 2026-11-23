// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { CaptureSession } from './capture/captureSession';
import { makePath } from './capture/sketch';
import { helix, tagHelixRail, type HelixOptions } from './helix';
import {
  bindParamCoercion,
  makeParamRef,
  isParamRef,
  makeTypedParamRef,
  type ParamRef,
  type TypedParamRef,
} from '../shared/runtime/paramRef';
import type { ParamMetadata } from '../shared/runtime/paramTable';
import { isColorParamDefault } from '../shared/runtime/paramColor';
import { currentValue, toParam } from '../shared/runtime/editableHelpers';
import {
  selectEdges as selectEdgesBackend,
  selectEdge as selectEdgeBackend,
} from '../kernel/backends/occt/edgeQueries';
import { select } from './selection/shapeList';
import { KernelError } from '../shared/intent/kernelError';
import type { KernelCadApi } from './api';
import type { AssetMetadataInput, AssetPresets } from '../shared/assets/assetSchema';
import { invalidArgs } from '../shared/intent/invalidArgs';

const HELIX_KEYS = new Set(['radius', 'pitch', 'turns', 'axis', 'pointsPerTurn', 'startAngle']);
const HELIX_AXES = new Set(['X', 'Y', 'Z']);
const HELIX_EXAMPLE = "helix({ radius: 5, pitch: 2, turns: 8, axis: 'Z' })";

// `helix({ ..., lefthand: true })` dropped the key and returned a right-hand
// rail, and `axis: 'x'` fell through to the Y-axis branch.
function assertHelixOptions(opts: unknown): void {
  if (opts === null || typeof opts !== 'object' || Array.isArray(opts)) {
    invalidArgs({
      api: 'helix(opts)',
      path: 'opts',
      got: opts,
      showType: true,
      requires: 'an options object { radius, pitch, turns, axis?, pointsPerTurn?, startAngle? }',
      example: HELIX_EXAMPLE,
    });
  }
  const unknownKeys = Object.keys(opts).filter((key) => !HELIX_KEYS.has(key));
  if (unknownKeys.length > 0) {
    invalidArgs({
      api: 'helix(opts)',
      path: 'opts',
      gotText: `unknown keys: ${unknownKeys.join(', ')}`,
      requires: `only ${[...HELIX_KEYS].join(', ')}; helix() has no handedness option`,
      example: HELIX_EXAMPLE,
    });
  }
  const axis = (opts as { axis?: unknown }).axis;
  if (axis !== undefined && !HELIX_AXES.has(axis as string)) {
    invalidArgs({
      api: 'helix(opts)',
      path: 'opts.axis',
      got: axis,
      requires: "'X', 'Y' or 'Z' (upper case)",
      example: HELIX_EXAMPLE,
    });
  }
}

type BatchParamDeclaration = number | boolean | ({ default: number | boolean | string } & ParamMetadata);

export function makeParamMethods(
  session: CaptureSession,
): Pick<KernelCadApi, 'param' | 'params' | 'meta' | 'presets' | 'path' | 'helix' | 'selectEdges' | 'select' | 'selectEdge'> {
  return {
    param: ((
      name: string,
      defaultValue: number | boolean | string,
      meta?: ParamMetadata,
    ): ParamRef<number> | ParamRef<boolean> | TypedParamRef<string> => {
      return declareParam(session, name, defaultValue, meta);
    }) as KernelCadApi['param'],
    params(decl: Record<string, BatchParamDeclaration>) {
      const out: Record<string, ParamRef<number | boolean> | TypedParamRef<string>> = {};
      for (const [name, declaration] of Object.entries(decl)) {
        if (typeof declaration === 'number' || typeof declaration === 'boolean') {
          out[name] = declareParam(session, name, declaration);
          continue;
        }
        if (declaration === null || typeof declaration !== 'object' || Array.isArray(declaration) || !('default' in declaration)) {
          throw new KernelError(
            'feature.invalid-args',
            `params(): '${name}' must be a number/boolean shorthand or an object with a default value.`,
          );
        }
        const { default: defaultValue, ...meta } = declaration;
        if (typeof defaultValue !== 'number' && typeof defaultValue !== 'boolean' && typeof defaultValue !== 'string') {
          throw new KernelError('feature.invalid-args', `params(): '${name}.default' must be a number, boolean, or string.`);
        }
        out[name] = declareParam(session, name, defaultValue, meta as ParamMetadata);
      }
      return out as ReturnType<KernelCadApi['params']>;
    },
    meta(input: AssetMetadataInput) {
      session.setAssetMetadata(input);
    },
    presets(input: AssetPresets) {
      session.setAssetPresets(input);
    },
    path() {
      return makePath(session);
    },
    helix(opts) {
      assertHelixOptions(opts);
      const table = session.paramTable;
      const numeric: HelixOptions = {
        radius: currentValue(opts.radius, table),
        pitch: currentValue(opts.pitch, table),
        turns: currentValue(opts.turns, table),
        axis: opts.axis,
        pointsPerTurn: opts.pointsPerTurn,
        startAngle: opts.startAngle === undefined ? undefined : currentValue(opts.startAngle, table),
      };
      return tagHelixRail(helix(numeric), {
        radius: toParam(opts.radius, 'mm'),
        pitch: toParam(opts.pitch, 'mm'),
        turns: toParam(opts.turns, 'unitless'),
        startAngle: toParam(opts.startAngle ?? 0, 'unitless'),
        axis: opts.axis ?? 'Z',
        pointsPerTurn: opts.pointsPerTurn ?? 32,
      });
    },
    selectEdges: async (shape, query = {}) => {
      const lowered = await shape.lower();
      return select(selectEdgesBackend(lowered, resolveQueryParams(query)));
    },
    select,
    selectEdge: async (shape, query) => {
      const lowered = await shape.lower();
      return selectEdgeBackend(lowered, resolveQueryParams(query));
    },
  };
}

/**
 * A selector query is resolved against the geometry as built right now, so a
 * numeric param() inside it reads as its current value, the same as in plain
 * JS math (`r + 4`): the coercion marks the param, and an edit to it re-runs
 * the script. Everything else in the query passes through untouched.
 */
function resolveQueryParams<T>(value: T): T {
  if (isParamRef(value) && value._type === 'number') return Number(value) as unknown as T;
  if (Array.isArray(value)) return value.map(resolveQueryParams) as unknown as T;
  // Plain object from any realm: a script's literals come from its sandbox, so
  // the prototype is that realm's Object.prototype, whose own prototype is null.
  if (typeof value === 'object' && value !== null && Object.getPrototypeOf(Object.getPrototypeOf(value) ?? {}) === null) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveQueryParams(v)])) as T;
  }
  return value;
}

function declareParam(
  session: CaptureSession,
  name: string,
  defaultValue: number | boolean | string,
  meta?: ParamMetadata,
): ParamRef<number> | ParamRef<boolean> | TypedParamRef<string> {
  // Prevent re-wrapping if the agent accidentally passes a ParamRef (would
  // otherwise silently shadow a previously declared name).
  if (isParamRef(defaultValue)) {
    throw new KernelError(
      'feature.invalid-args',
      `param('${name}'): defaultValue cannot be a ParamRef; pass a literal number, boolean, or string.`,
      undefined,
      `invalid-args.param.invalid-default — param '${name}' default cannot itself be a ParamRef.`,
    );
  }
  if (typeof defaultValue === 'string') {
    const type = meta?.choices ? 'choice' : isColorParamDefault(defaultValue, meta) ? 'color' : 'string';
    const entry = session.paramTable.declare(name, type, defaultValue, meta);
    return makeTypedParamRef(name, type, entry.value as string);
  }
  const type = typeof defaultValue === 'boolean' ? 'boolean' : 'number';
  session.paramTable.declare(name, type, defaultValue, meta);
  const ref = makeParamRef(name, type as 'number' | 'boolean', defaultValue) as ParamRef<number> | ParamRef<boolean>;
  if (type === 'number') {
    // Plain JS math on the ref (`w + 4`) reads the current value and marks
    // the param, so edits to it re-run the script (see updateModelParams).
    bindParamCoercion(ref, {
      valueOf: (n) => session.paramTable.get(n).value as number,
      noteCoerced: (n) => session.coercedParams.add(n),
    });
  }
  return ref;
}
