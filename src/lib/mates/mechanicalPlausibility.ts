import type { Assembly } from '../../capture/assembly';
import type { Vec3 } from '../../intent/types';
import { parseConnectorRef } from './mate';

export interface MechanicalPlausibilityDiagnostic {
  readonly code: 'assembly.mechanical.connector-not-in-solid';
  readonly severity: 'error';
  readonly message: string;
  readonly hint: string;
  readonly mateName: string;
  readonly partName: string;
  readonly connectorName: string;
  readonly connectorRef: string;
  readonly distanceMm: number;
  readonly bbox: { min: Vec3; max: Vec3 };
}

export interface MechanicalPlausibilityResult {
  readonly diagnostics: readonly MechanicalPlausibilityDiagnostic[];
  readonly checkedMateConnectorCount: number;
}

const CONNECTOR_SOLID_TOL_MM = 6;

export async function reviewMechanicalPlausibility(
  arm: Assembly,
): Promise<MechanicalPlausibilityResult> {
  const diagnostics: MechanicalPlausibilityDiagnostic[] = [];
  const partsByName = new Map(arm.__parts().map((part) => [part.name, part]));
  const boundsByPartName = new Map<string, { min: Vec3; max: Vec3 }>();
  let checkedMateConnectorCount = 0;

  for (const mate of arm.__mates()) {
    for (const connectorRef of [mate.a, mate.b]) {
      const parsed = parseConnectorRef(connectorRef);
      const part = partsByName.get(parsed.partName);
      const connector = part?.mateConnectors.find((c) => c.name === parsed.connectorName);
      if (part === undefined || connector === undefined || connector.origin.kind !== 'vec3') continue;

      checkedMateConnectorCount += 1;
      let bbox = boundsByPartName.get(part.name);
      if (bbox === undefined) {
        bbox = (await part.originalShape.lower()).boundingBox();
        boundsByPartName.set(part.name, bbox);
      }

      const distanceMm = distanceOutsideExpandedBbox(connector.origin.value, bbox, CONNECTOR_SOLID_TOL_MM);
      if (distanceMm === 0) continue;

      diagnostics.push({
        code: 'assembly.mechanical.connector-not-in-solid',
        severity: 'error',
        mateName: mate.name,
        partName: part.name,
        connectorName: parsed.connectorName,
        connectorRef,
        distanceMm,
        bbox,
        message: `Mate '${mate.name}' connector '${connectorRef}' is ${distanceMm.toFixed(1)} mm away from modeled material on part '${part.name}'.`,
        hint: `mechanical-plausibility.connector-not-in-solid — move '${connectorRef}' onto the part's modeled bearing/bracket/knuckle, or add support geometry around that connector so the mate has a physical load path.`,
      });
    }
  }

  return { diagnostics, checkedMateConnectorCount };
}

function distanceOutsideExpandedBbox(
  point: Vec3,
  bbox: { min: Vec3; max: Vec3 },
  toleranceMm: number,
): number {
  let d2 = 0;
  for (let axis = 0; axis < 3; axis++) {
    const min = bbox.min[axis] - toleranceMm;
    const max = bbox.max[axis] + toleranceMm;
    const value = point[axis];
    if (value < min) {
      d2 += (min - value) ** 2;
    } else if (value > max) {
      d2 += (value - max) ** 2;
    }
  }
  return Math.sqrt(d2);
}
