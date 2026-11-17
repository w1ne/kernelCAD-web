// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Copy mates from an imported assembly. Part names are prefixed; connector
// names stay put so a single-dot connector ref still parses.

import { parseConnectorRef } from '../mates/mate';
import type { Assembly } from './assembly';
import { copyMateCapacity } from './assemblyMateCapacity';
import type { AssemblyState } from './assemblyState';

function copiedConfiguration(om: {
  aConfiguration?: { readonly source: string; readonly name: string };
  bConfiguration?: { readonly source: string; readonly name: string };
}): {
  aConfiguration?: { readonly source: string; readonly name: string };
  bConfiguration?: { readonly source: string; readonly name: string };
} {
  return {
    ...(om.aConfiguration !== undefined ? { aConfiguration: om.aConfiguration } : {}),
    ...(om.bConfiguration !== undefined ? { bConfiguration: om.bConfiguration } : {}),
  };
}

export function importSubAssemblyMates(state: AssemblyState, prefix: string, other: Assembly): void {
  const remapRef = (ref: string): string => {
    const { partName, connectorName } = parseConnectorRef(ref);
    return `${prefix}${partName}.${connectorName}`;
  };
  for (const om of other.__mates()) {
    state.mates.push({
      name: `${prefix}${om.name}`,
      a: remapRef(om.a),
      b: remapRef(om.b),
      type: om.type,
      ...(om.pose !== undefined ? { pose: om.pose } : {}),
      ...(om.limitsDeg !== undefined ? { limitsDeg: om.limitsDeg } : {}),
      ...(om.limitsMm !== undefined ? { limitsMm: om.limitsMm } : {}),
      ...(om.stiffnessNmmPerDeg !== undefined ? { stiffnessNmmPerDeg: om.stiffnessNmmPerDeg } : {}),
      ...(om.springRefDeg !== undefined ? { springRefDeg: om.springRefDeg } : {}),
      ...(om.dampingNmmsPerDeg !== undefined ? { dampingNmmsPerDeg: om.dampingNmmsPerDeg } : {}),
      ...(om.stiffnessNPerMm !== undefined ? { stiffnessNPerMm: om.stiffnessNPerMm } : {}),
      ...(om.springRefMm !== undefined ? { springRefMm: om.springRefMm } : {}),
      ...(om.dampingNsPerMm !== undefined ? { dampingNsPerMm: om.dampingNsPerMm } : {}),
      ...(om.capacity !== undefined ? { capacity: copyMateCapacity(om.capacity) } : {}),
      ...(om.maxLoad !== undefined
        ? {
            maxLoad: {
              ...(om.maxLoad.force !== undefined ? { force: om.maxLoad.force } : {}),
              ...(om.maxLoad.torque !== undefined ? { torque: om.maxLoad.torque } : {}),
            },
          }
        : {}),
      ...copiedConfiguration(om),
    });
  }
}
