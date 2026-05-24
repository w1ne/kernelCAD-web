// src/kinematic/checkLoadCapacity.ts
//
// T6 closed-form Euler-Bernoulli load-capacity check.
//
// Two modes per D5:
//   - 'stub' re-exports the v0.7.4 substrate (mate-side `maxLoad` magnitude
//     vs `externalLoads` on the bound parts; no stress calc).
//   - 'beam' (default) runs the closed-form Euler-Bernoulli path: for each
//     loaded part with a declared cross-section + material, compute
//     σ = M·c / I where M = |F| · L_freeSpan (cantilever moment arm) and
//     compare against the material's yield stress. K6 fires when σ exceeds
//     yield (or SF falls below `safetyFactorThreshold`), K7 fires when the
//     part isn't approximable as a single-mate cantilever, K8 fires when a
//     load applies to a part with no declared material.
//
// v1 closed-form assumptions:
//   - cantilever boundary condition (root mate fixed, load at tip);
//   - load applied along the part's bending axis (force magnitude folded
//     into the moment);
//   - uniform cross-section along the part length;
//   - small deflection (linear-elastic regime up to yield).
//
// Out-of-applicability triggers (each fires K7, severity 'warn', and the
// part is not added to `result.elements` — its data would be unreliable):
//   - no declared `crossSection` on the part;
//   - more than one mate on the part (so the cantilever assumption fails);
//   - zero mates on the part (no root reference for the moment arm).
//
// Real FEA (multi-mate, swept volumes, non-uniform sections, NURBS
// cross-section beams, deflection limit gates) is deferred to a v2
// workstream tracked under the `kernelcad_framework_layer_wins` memory.

import type { Assembly } from '../modeling/capture/assembly';
import type {
  KinematicDiagnostic,
  LoadCapacityElementResult,
  LoadCapacityFailure,
  LoadCapacityOpts,
  LoadCapacityResult,
  LoadDeclaration,
  MaterialDeclarationEntry,
} from './types';
import { DIAGNOSTIC_REGISTRY, type DiagnosticCode } from '../shared/diagnostics/registry';
import { sectionProperties } from './beamGeometry';
import { resolveMaterialProps, type MaterialProps } from './beamMaterials';
import { validateJointLoadCapacity } from '../modeling/mates/jointLoadCapacity';

const DEFAULT_SF_THRESHOLD = 1.5;

/**
 * Static load capacity check. Closed-form Euler-Bernoulli beam analysis on
 * each declared (part, load, material, crossSection) tuple, dispatched in
 * 'beam' mode (default). The 'stub' mode re-exports the v0.7.4 mate-side
 * magnitude check for back-compat with existing assemblies that declared
 * `maxLoad` on a mate.
 *
 * Every result envelope carries `source: 'local'`; diagnostics are
 * structured records with `severity` / `nextAction` / `hint` lifted from
 * the central `DIAGNOSTIC_REGISTRY`.
 */
export async function checkLoadCapacity(
  arm: Assembly,
  loads: LoadDeclaration = {},
  opts?: LoadCapacityOpts,
): Promise<LoadCapacityResult> {
  const mode = opts?.mode ?? 'beam';
  if (mode === 'stub') {
    return runStubMode(arm, loads);
  }
  return runBeamMode(arm, loads, opts);
}

// ─────────────────────────────────────────────────────────────────────────
// 'stub' mode — re-exports the v0.7.4 substrate.
// ─────────────────────────────────────────────────────────────────────────

function runStubMode(
  arm: Assembly,
  loads: LoadDeclaration,
): LoadCapacityResult {
  // The substrate consumes a `Record<partName, { force?, torque? }>` shape
  // mirroring our `LoadDeclaration`; no envelope translation needed.
  const externalLoads = Object.keys(loads).length > 0 ? loads : undefined;
  const subDiags = validateJointLoadCapacity(arm, externalLoads);
  const diagnostics: KinematicDiagnostic[] = [];
  const failures: LoadCapacityFailure[] = [];

  // Substrate emits `assembly.joint.load-exceeded` with severity 'error' on
  // exceed, 'info' on topology-deferred sides. We surface 'error' rows as
  // structured failures and keep all diags in the envelope.
  for (const d of subDiags) {
    // Map the substrate's ValidatorDiagnostic into the kinematic envelope's
    // diagnostic shape. Substrate codes are catalogued already; pick up the
    // shared `nextAction` from the registry so every emitted code carries
    // the canonical recovery action. Substrate uses 'warning' for the
    // mid-tier severity; kinematic envelope uses 'warn'.
    const code = d.code as DiagnosticCode;
    const entry = DIAGNOSTIC_REGISTRY[code];
    const severity: 'info' | 'warn' | 'error' =
      d.severity === 'warning' ? 'warn' : d.severity;
    const elementName = d.mateName ?? d.partA ?? d.partB;
    diagnostics.push({
      code,
      severity,
      message: d.message,
      hint: entry.hintTemplate,
      nextAction: entry.nextAction,
      source: 'local',
      ...(elementName !== undefined ? { element: elementName } : {}),
    });
    if (d.severity === 'error' && d.mateName !== undefined) {
      failures.push({
        element: d.mateName,
        elementKind: 'mate',
        reason: 'joint-load-exceeded',
      });
    }
  }

  return {
    ok: failures.length === 0,
    safetyFactor: Number.POSITIVE_INFINITY,
    elements: [],
    failures,
    diagnostics,
    source: 'local',
  };
}

// ─────────────────────────────────────────────────────────────────────────
// 'beam' mode — closed-form Euler-Bernoulli.
// ─────────────────────────────────────────────────────────────────────────

function runBeamMode(
  arm: Assembly,
  loads: LoadDeclaration,
  opts: LoadCapacityOpts | undefined,
): LoadCapacityResult {
  const threshold = opts?.safetyFactorThreshold ?? DEFAULT_SF_THRESHOLD;
  const diagnostics: KinematicDiagnostic[] = [];
  const elements: LoadCapacityElementResult[] = [];
  const failures: LoadCapacityFailure[] = [];

  const loadedPartNames = Object.keys(loads);
  if (loadedPartNames.length === 0) {
    return {
      ok: true,
      safetyFactor: Number.POSITIVE_INFINITY,
      elements: [],
      failures: [],
      diagnostics: [],
      source: 'local',
    };
  }

  // K8: every loaded part must have a material declaration. No silent
  // default per D5.
  const missingMaterials = loadedPartNames.filter(
    (name) => opts?.materials === undefined || opts.materials[name] === undefined,
  );
  if (missingMaterials.length > 0) {
    diagnostics.push(
      buildDiag(
        'kinematic.no-material-declared',
        'error',
        `checkLoadCapacity({ mode: 'beam' }) requires opts.materials[partName] for every loaded part. Missing: ${missingMaterials.join(', ')}.`,
      ),
    );
    return {
      ok: false,
      safetyFactor: 0,
      elements: [],
      failures: [],
      diagnostics,
      source: 'local',
    };
  }

  const parts = arm.__parts();
  const mates = arm.__mates();
  const partByName = new Map(parts.map((p) => [p.name, p]));
  // Mate-count per part — single-mate parts satisfy the cantilever boundary
  // condition; >1 mate is multi-supported (beam-not-applicable in v1).
  const mateCount = new Map<string, number>();
  for (const m of mates) {
    const aPart = m.a.split('.')[0];
    const bPart = m.b.split('.')[0];
    if (aPart !== undefined) mateCount.set(aPart, (mateCount.get(aPart) ?? 0) + 1);
    if (bPart !== undefined) mateCount.set(bPart, (mateCount.get(bPart) ?? 0) + 1);
  }

  let worstSF = Number.POSITIVE_INFINITY;

  for (const partName of loadedPartNames) {
    const load = loads[partName]!;
    const matEntry: MaterialDeclarationEntry = opts!.materials![partName]!;
    const matResolved = resolveMaterialProps(matEntry);
    if (!matResolved.ok) {
      diagnostics.push(
        buildDiag(
          'kinematic.no-material-declared',
          'error',
          `Material declaration for '${partName}' uses material: 'custom' but is missing ${matResolved.missingField}. Both yieldStressMPa and youngsModulusGPa are required for custom materials.`,
          partName,
        ),
      );
      continue;
    }

    const part = partByName.get(partName);
    if (part === undefined) {
      diagnostics.push(
        buildDiag(
          'kinematic.load.beam-not-applicable',
          'warn',
          `Loaded part '${partName}' is not declared on this assembly; no closed-form beam check ran for it.`,
          partName,
        ),
      );
      continue;
    }

    if (part.crossSection === undefined) {
      diagnostics.push(
        buildDiag(
          'kinematic.load.beam-not-applicable',
          'warn',
          `Part '${partName}' has no declared crossSection; closed-form beam not applicable. Pass crossSection on arm.part(...) or switch to mode: 'stub'.`,
          partName,
        ),
      );
      continue;
    }

    const partMateCount = mateCount.get(partName) ?? 0;
    if (partMateCount === 0) {
      diagnostics.push(
        buildDiag(
          'kinematic.load.beam-not-applicable',
          'warn',
          `Part '${partName}' has no declared mate; the cantilever boundary requires exactly one root mate.`,
          partName,
        ),
      );
      continue;
    }
    if (partMateCount > 1) {
      diagnostics.push(
        buildDiag(
          'kinematic.load.beam-not-applicable',
          'warn',
          `Part '${partName}' is bound by ${partMateCount} mates; the v1 cantilever approximation requires exactly one. Decompose the part into single-mate segments or wait for v2 FEA.`,
          partName,
        ),
      );
      continue;
    }

    // Closed-form bending stress.
    const sec = sectionProperties(part.crossSection);
    const props: MaterialProps = matResolved.props;
    const forceMag = vec3Magnitude(load.force ?? [0, 0, 0]);
    const torqueMag = vec3Magnitude(load.torque ?? [0, 0, 0]);
    // Cantilever moment at the root = |F| · L_freeSpan; applied tip torque
    // adds directly. Both in N·m once `sec.lengthM` is metres.
    const momentNm = forceMag * sec.lengthM + torqueMag;
    const stressPa = (momentNm * sec.cM) / sec.iM4;
    const safetyFactor = stressPa > 0 ? props.yieldStressPa / stressPa : Number.POSITIVE_INFINITY;

    elements.push({
      partName,
      stressPa,
      yieldPa: props.yieldStressPa,
      safetyFactor,
    });
    if (safetyFactor < worstSF) worstSF = safetyFactor;

    if (safetyFactor < threshold) {
      failures.push({
        element: partName,
        elementKind: 'part',
        stress: stressPa,
        yieldStress: props.yieldStressPa,
        load: forceMag,
        capacity: (props.yieldStressPa * sec.iM4) / sec.cM,
        reason: 'stress-exceeds-yield',
      });
      diagnostics.push(
        buildDiag(
          'kinematic.load-exceeds-yield',
          'error',
          `Closed-form beam check: stress ${(stressPa / 1e6).toFixed(1)} MPa at '${partName}' exceeds yield ${(props.yieldStressPa / 1e6).toFixed(1)} MPa (safety factor ${safetyFactor.toFixed(2)} < threshold ${threshold}). Thicken the cross-section, switch to a stronger material, or shorten the moment arm.`,
          partName,
        ),
      );
    }
  }

  return {
    ok: failures.length === 0,
    safetyFactor: elements.length === 0 ? Number.POSITIVE_INFINITY : worstSF,
    elements,
    failures,
    diagnostics,
    source: 'local',
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers.
// ─────────────────────────────────────────────────────────────────────────

function buildDiag(
  code: DiagnosticCode,
  severity: 'info' | 'warn' | 'error',
  message: string,
  element?: string,
): KinematicDiagnostic {
  const entry = DIAGNOSTIC_REGISTRY[code];
  return {
    code,
    severity,
    message,
    hint: entry.hintTemplate,
    nextAction: entry.nextAction,
    source: 'local',
    ...(element !== undefined ? { element } : {}),
  };
}

function vec3Magnitude(v: readonly [number, number, number]): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}
