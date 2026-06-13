// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { addMateSourceTool } from './addMateSource';
import { addMateCouplingSourceTool } from './addMateCouplingSource';
import { addTransmissionSourceTool } from './addTransmissionSource';

/**
 * The mate-graph relationship being authored into source.
 * NB: the discriminator is `relation`, NOT `kind` — `transmission` already
 * owns a `kind` param (direct-horn | link-rod | …), so a `kind` discriminator
 * would collide.
 */
export type MateRelation = 'mate' | 'coupling' | 'transmission';

export interface AddMateInput {
  /** Defaults to 'mate' (a typed mate between two connectors). */
  relation?: MateRelation;
  /**
   * Relation-specific params, forwarded verbatim (all durably edit source):
   * - mate:         { code, assembly_binding, name, a, b, type, pose?, limitsDeg?, limitsMm? }
   * - coupling:     { code, assembly_binding, driven, source, ratio, offset? }
   * - transmission: { code, assembly_binding, name, kind, sourceMate, drivenMates, path, ... }
   */
  [key: string]: unknown;
}

/**
 * Unified durable mate-authoring entrypoint. Replaces add_mate_source
 * (relation:'mate'), add_mate_coupling_source (relation:'coupling'), and
 * add_transmission_source (relation:'transmission'). All three insert source
 * text before the final return — the ephemeral active-session add_mate is gone.
 * Pure routing layer; forwards all params except `relation`.
 */
export function addMateAuthoringTool(input: AddMateInput): Promise<unknown> {
  const { relation = 'mate', ...rest } = input;
  switch (relation) {
    case 'mate':
      return addMateSourceTool(rest as unknown as Parameters<typeof addMateSourceTool>[0]);
    case 'coupling':
      return addMateCouplingSourceTool(rest as unknown as Parameters<typeof addMateCouplingSourceTool>[0]);
    case 'transmission':
      return addTransmissionSourceTool(rest as unknown as Parameters<typeof addTransmissionSourceTool>[0]);
    default:
      return Promise.reject(
        new Error(`Unknown mate relation: ${String(relation)}. Valid: mate, coupling, transmission.`),
      );
  }
}
