// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Canonical registry of kernelCAD's out-of-scope capability claims.
//
// WHY THIS FILE EXISTS
// --------------------
// The Out of Scope block in kernelcad-authoring/SKILL.md used to be hand-written
// prose. It drifted: rational NURBS weights (v0.14.0), STEP/BREP export,
// dimensioned `svg-drawing` sheets, and the whole motion-simulation lane all
// shipped while the list still told agents they errored. Agents read that list
// and refused to emit code for features the kernel had. Meanwhile
// kernelcad-nurbs/SKILL.md carried the *correct* rational-NURBS status — two
// skill files stating opposite facts, with no single owner.
//
// So: claims live here, SKILL.md is generated from here (see
// scripts/buildOutOfScopeSection.ts), and every claim carries a machine-checked
// probe wherever one is expressible (see tests/unit/skill/skillOutOfScopeTruth.test.ts).
//
// THE INVERSION
// -------------
// A probe asserts the claim is STILL TRUE. When a feature ships, its probe stops
// holding and the build fails, demanding the claim be retracted. Drift becomes a
// red test instead of a silent lie.
//
// The predecessor guard grepped this block for four hardcoded words
// (Hole/cutout/Assemblies/joints) that had long since left it. It passed
// unconditionally for months over three false claims, then false-positived on
// the phrase "hole callouts" the first time someone wrote something true. Do not
// reintroduce keyword matching here.
//
// ADDING A CLAIM
// --------------
// Prefer `enum-absent`. It is the shape most capabilities ship as (a new value in
// a tool's schema enum), so it is the shape that actually catches drift — all
// three of the historical misses would have been caught by one. Reach for
// `manual` only when the capability could ship without any registry surface
// changing (a new *parameter* on an existing call), and say so in `justification`.

import { TOOL_REGISTRY } from '../mcp/toolRegistry';

/**
 * A falsification check: it asserts the claim is still true.
 *
 * - `enum-absent` — `value` must NOT appear in tool `tool`'s
 *   `inputSchema.properties[property].enum`. Machine-checked.
 * - `manual` — no registry surface would change if this shipped, so no probe can
 *   see it. `justification` must say what was checked and how.
 */
export type OutOfScopeProbe =
  | { kind: 'enum-absent'; tool: string; property: string; value: string }
  | { kind: 'manual'; justification: string };

export interface OutOfScopeClaim {
  /** Stable kebab-case id. Appears in the gate's failure message. */
  id: string;
  /** Rendered verbatim into SKILL.md as a bullet. Keep it one line. */
  claim: string;
  /** At least one. All must hold for the claim to survive. */
  probes: OutOfScopeProbe[];
}

/**
 * Every claim the authoring skill makes about what kernelCAD cannot do.
 *
 * Verified against the shipped surface on 2026-07-16.
 */
export const OUT_OF_SCOPE_CLAIMS: readonly OutOfScopeClaim[] = [
  {
    id: 'tracked-refs',
    claim:
      'Tracked face/edge refs (only canonical refs and inline queries work) — deferred',
    probes: [
      {
        kind: 'manual',
        justification:
          "FaceRef/EdgeRef carry a `kind: 'tracked'` variant (shared/intent/types.ts) but nothing " +
          "resolves it: `kind === 'tracked'` has no match anywhere in src/, resolveFaceRef.ts handles " +
          'only canonical + created and returns feature.face-ref.not-resolvable otherwise, and no ' +
          'authoring path exists in modeling/api.ts or listApi.ts. Typed-but-unimplemented, so no ' +
          'registry enum would change if it shipped. Re-verify by grepping for a tracked resolver.',
      },
    ],
  },
  {
    id: 'asymmetric-chamfer',
    claim: 'Asymmetric chamfer (only symmetric 45° supported) — deferred',
    probes: [
      {
        kind: 'manual',
        justification:
          'chamfer is `(distance, edges?: EdgeSelector) => Shape` — a single distance. Asymmetry ' +
          'would arrive as a new *parameter* on the existing call, not as a new tool or enum value, ' +
          'so no registry surface would move. Re-verify against the chamfer signature in listApi.ts.',
      },
    ],
  },
  {
    id: 'bom-extraction',
    claim: 'BOM extraction — deferred',
    probes: [{ kind: 'enum-absent', tool: 'inspect', property: 'of', value: 'bom' }],
  },
  {
    id: 'multi-view-pdf',
    claim:
      "Multi-view PDF sheets — deferred; `export({ format: 'svg-drawing' })` ships an SVG sheet instead",
    probes: [{ kind: 'enum-absent', tool: 'export', property: 'format', value: 'pdf' }],
  },
  {
    id: 'feature-level-dimensioning',
    claim:
      'Section views and param-bound (auto-updating) dimensions on `svg-drawing` — deferred; ' +
      'authored feature dimensioning DOES ship (`options.annotations`: linear / radius / diameter / ' +
      'angular / leader notes, anchored by EdgeQuery / FaceQuery or an explicit point), as do the ' +
      'automatic bounding-box dimensions and the title block',
    probes: [
      {
        kind: 'manual',
        justification:
          "svg-drawing is already in export's format enum, and its dimensioning lives inside the " +
          'per-format `options` bag rather than as a new enum value, so no probe can see it. ' +
          'Re-verify by reading the svg-drawing options in referenceExportTools.ts — `annotations` ' +
          'is documented there, while `section` and param binding are absent.',
      },
    ],
  },
  {
    id: 'nurbs-surface-ops',
    claim:
      'NURBS surface extend/untrim/blend, surface-surface intersection, lattice/quilt — deferred',
    probes: [
      { kind: 'enum-absent', tool: 'add_surface', property: 'kind', value: 'extend' },
      { kind: 'enum-absent', tool: 'add_surface', property: 'kind', value: 'untrim' },
      { kind: 'enum-absent', tool: 'add_surface', property: 'kind', value: 'blend' },
      { kind: 'enum-absent', tool: 'add_surface', property: 'kind', value: 'intersect' },
      { kind: 'enum-absent', tool: 'add_surface', property: 'kind', value: 'lattice' },
    ],
  },
];

/** Result of checking one probe. `ok: false` means the claim is stale. */
export interface ProbeResult {
  claimId: string;
  ok: boolean;
  /** Present when `ok` is false — actionable remediation for the gate message. */
  reason?: string;
}

/**
 * Read a tool's schema enum out of the live registry.
 *
 * Returns `undefined` when the tool or property is absent — the caller treats
 * that as a registry-drift error rather than a passing probe, so a renamed tool
 * can never quietly satisfy an `enum-absent` claim.
 */
function lookupEnum(tool: string, property: string): readonly string[] | undefined {
  const entry = TOOL_REGISTRY.find((e) => e.definition.name === tool);
  if (!entry) return undefined;
  const schema = entry.definition.inputSchema as
    | { properties?: Record<string, { enum?: readonly string[] }> }
    | undefined;
  return schema?.properties?.[property]?.enum;
}

/**
 * Check every probe on every claim.
 *
 * Pure over the live TOOL_REGISTRY — no OCCT boot, no CLI, no filesystem — so
 * this runs in milliseconds inside the ordinary unit-test shard.
 */
export function checkOutOfScopeClaims(
  claims: readonly OutOfScopeClaim[] = OUT_OF_SCOPE_CLAIMS,
): ProbeResult[] {
  const results: ProbeResult[] = [];
  for (const claim of claims) {
    for (const probe of claim.probes) {
      if (probe.kind === 'manual') continue;

      const values = lookupEnum(probe.tool, probe.property);
      if (values === undefined) {
        results.push({
          claimId: claim.id,
          ok: false,
          reason:
            `probe targets ${probe.tool}.${probe.property}, which is not in TOOL_REGISTRY — ` +
            `the tool or property was renamed. Repoint the probe (a probe that cannot find its ` +
            `target must never pass silently).`,
        });
        continue;
      }
      if (values.includes(probe.value)) {
        results.push({
          claimId: claim.id,
          ok: false,
          reason:
            `'${probe.value}' is now a live value of ${probe.tool}.${probe.property} — this ` +
            `capability SHIPPED, so the claim is stale. Delete claim '${claim.id}' from ` +
            `OUT_OF_SCOPE_CLAIMS and run \`npm run skill:out-of-scope\` to regenerate SKILL.md.`,
        });
        continue;
      }
      results.push({ claimId: claim.id, ok: true });
    }
  }
  return results;
}
