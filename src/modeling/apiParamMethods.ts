// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { CaptureSession } from './capture/captureSession';
import { makePath } from './capture/sketch';
import { helix, tagHelixRail, type HelixOptions } from './helix';
import {
  makeParamRef,
  isParamRef,
  makeTypedParamRef,
  type ParamRef,
  type TypedParamRef,
} from '../shared/runtime/paramRef';
import type { ParamMetadata } from '../shared/runtime/paramTable';
import { currentValue, toParam } from '../shared/runtime/editableHelpers';
import {
  selectEdges as selectEdgesBackend,
  selectEdge as selectEdgeBackend,
} from '../kernel/backends/occt/edgeQueries';
import { select } from './selection/shapeList';
import { KernelError } from '../shared/intent/kernelError';
import type { KernelCadApi } from './api';

export function makeParamMethods(
  session: CaptureSession,
): Pick<KernelCadApi, 'param' | 'params' | 'path' | 'helix' | 'selectEdges' | 'select' | 'selectEdge'> {
  return {
    param: ((
      name: string,
      defaultValue: number | boolean | string,
      meta?: ParamMetadata,
    ): ParamRef<number> | ParamRef<boolean> | TypedParamRef<string> => {
      // Prevent re-wrapping if the agent accidentally passes a ParamRef
      // (would otherwise silently shadow a previously declared name).
      if (isParamRef(defaultValue)) {
        throw new KernelError(
          'feature.invalid-args',
          `param('${name}'): defaultValue cannot be a ParamRef; pass a literal number, boolean, or string.`,
          undefined,
          `invalid-args.param.invalid-default — param '${name}' default cannot itself be a ParamRef.`,
        );
      }
      if (typeof defaultValue === 'string') {
        const type = meta?.choices ? 'choice' : 'string';
        session.paramTable.declare(name, type, defaultValue, meta);
        return makeTypedParamRef(name, type, defaultValue);
      }
      const type = typeof defaultValue === 'boolean' ? 'boolean' : 'number';
      session.paramTable.declare(name, type, defaultValue, meta);
      return makeParamRef(name, type as 'number' | 'boolean', defaultValue) as ParamRef<number> | ParamRef<boolean>;
    }) as KernelCadApi['param'],
    params(decl) {
      const out: Record<string, ParamRef<number | boolean>> = {};
      for (const [name, value] of Object.entries(decl)) {
        const type = typeof value === 'boolean' ? 'boolean' : 'number';
        session.paramTable.declare(name, type, value);
        out[name] = makeParamRef(name, type as 'number' | 'boolean', value);
      }
      return out as { [K in keyof typeof decl]: ParamRef<typeof decl[K]> };
    },
    path() {
      return makePath(session);
    },
    helix(opts) {
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
      return select(selectEdgesBackend(lowered, query));
    },
    select,
    selectEdge: async (shape, query) => {
      const lowered = await shape.lower();
      return selectEdgeBackend(lowered, query);
    },
  };
}
