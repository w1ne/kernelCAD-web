// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/mechanismOrphan.ts
//
// Mechanism-truth criterion 4 — `mechanism.orphan-part` (graph
// reachability, no BREP). Split out of `mechanismTruth.ts` to keep that file
// under the size ratchet. Only a MECHANISM (any mate, joint, transmission,
// mechanical-joint intent, tendon, or a script-level solvedModel call) must
// have every part linked; a plain multi-part assembly is independent bodies
// and gets one info note instead of an error.

import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES } from '../../shared/diagnostics/registry';
import type { FeatureId } from '../../shared/intent/types';
import type { Assembly } from '../capture/assembly';
import { parseConnectorRef } from '../mates/mate';

function orphanError(message: string): CompilerDiagnostic {
  return {
    target: 'export-occt',
    code: 'mechanism.orphan-part',
    severity: 'error',
    message,
    hint: HINT_TEMPLATES['mechanism.orphan-part'].template,
    nextAction: HINT_TEMPLATES['mechanism.orphan-part'].nextAction,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Criterion 4 — mechanism.orphan-part (graph reachability)
// ─────────────────────────────────────────────────────────────────────────

/** Add a connection in both directions. Unknown part names are ignored,
 *  matching the optional-chaining lookups the walk has always used. */
function addUndirectedEdge(adj: Map<string, Set<string>>, a: string, b: string): void {
  adj.get(a)?.add(b);
  adj.get(b)?.add(a);
}

/** Mate edges: connectors address parts by name. */
function addMateEdges(
  adj: Map<string, Set<string>>,
  mates: ReturnType<Assembly['__mates']>,
): void {
  for (const m of mates) {
    const aPart = parseConnectorRef(m.a).partName;
    const bPart = parseConnectorRef(m.b).partName;
    addUndirectedEdge(adj, aPart, bPart);
  }
}

/** Joint-primitive edges. Joints address parts by FeatureId, not by name. */
function addJointEdges(
  adj: Map<string, Set<string>>,
  joints: ReturnType<Assembly['__joints']>,
  nameByPartId: Map<FeatureId, string>,
): void {
  for (const j of joints) {
    const aPart = nameByPartId.get(j.parentPartId);
    const bPart = nameByPartId.get(j.childPartId);
    if (aPart === undefined || bPart === undefined) continue;
    addUndirectedEdge(adj, aPart, bPart);
  }
}

/** `arm.part(name, shape, { connect: { to } })` places a part rigidly on a
 *  parent without declaring either a mate or a joint. That is a structural
 *  connection too — the v0.5 validator has always treated it as one
 *  (`validateAssembly`'s floating/orphan pass) — so the truth walk must
 *  agree rather than call the placed part an orphan. */
function addConnectEdges(
  adj: Map<string, Set<string>>,
  parts: ReturnType<Assembly['__parts']>,
  nameByPartId: Map<FeatureId, string>,
): void {
  for (const p of parts) {
    const parentName = p.connectParentId === undefined
      ? undefined
      : nameByPartId.get(p.connectParentId);
    if (parentName === undefined) continue;
    addUndirectedEdge(adj, p.name, parentName);
  }
}

function buildPartAdjacency(
  parts: ReturnType<Assembly['__parts']>,
  mates: ReturnType<Assembly['__mates']>,
  joints: ReturnType<Assembly['__joints']>,
): Map<string, Set<string>> {
  // Build adjacency: part-name → set of neighbor part-names.
  //
  // KC-04: kernelCAD has TWO assembly conventions and BOTH connect parts —
  // `.mate()` + connectors (`arm.__mates()`) and the joint primitives
  // `.revolute()/.prismatic()/.ball()` (`arm.__joints()`). This
  // walk used to read the mate edge list only, so a perfectly sound
  // joint-primitive mechanism reported every non-first part as
  // `mechanism.orphan-part` while `summarizeMechanismFitness` — which reads
  // the validator/envelope stream, not this walk — reported
  // `functional: true, repairMode: 'none'` in the SAME review_cad response.
  // Both cannot be right; joint edges are connections, so they belong here.
  const adj = new Map<string, Set<string>>();
  for (const p of parts) adj.set(p.name, new Set());
  addMateEdges(adj, mates);

  const nameByPartId = new Map<FeatureId, string>();
  for (const p of parts) nameByPartId.set(p.id, p.name);
  addJointEdges(adj, joints, nameByPartId);
  addConnectEdges(adj, parts, nameByPartId);
  return adj;
}

function collectReachablePartNames(
  adj: Map<string, Set<string>>,
  root: string,
): Set<string> {
  // BFS from parts[0]. Anything unreached is an orphan.
  const visited = new Set<string>();
  const queue: string[] = [root];
  visited.add(root);
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const next of adj.get(cur) ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return visited;
}

/**
 * True when the assembly declares motion or linkage: any mate, joint
 * primitive, transmission, mechanical-joint intent or tendon, or a
 * script-level `solvedModel(...)` call. A plain multi-part assembly
 * (enclosure base + lid, a keychain body + its text, parts laid out for
 * printing) declares none of these — it is a set of independent bodies,
 * not a mechanism, so "every part must be linked" does not apply to it.
 */
export function assemblyDeclaresMechanism(arm: Assembly): boolean {
  return arm.__mates().length > 0
    || arm.__joints().length > 0
    || arm.__transmissionIntents().length > 0
    || arm.__mechanicalJointIntents().length > 0
    || arm.__tendons().length > 0
    || arm.__solvedModelRequested();
}

export function checkOrphanParts(arm: Assembly): CompilerDiagnostic[] {
  const parts = arm.__parts();
  if (parts.length <= 1) return [];
  const adj = buildPartAdjacency(parts, arm.__mates(), arm.__joints());

  const root = parts[0].name;
  const visited = collectReachablePartNames(adj, root);
  const disconnected = parts.map((p) => p.name).filter((name) => !visited.has(name));
  if (disconnected.length === 0) return [];

  if (!assemblyDeclaresMechanism(arm)) {
    // Not a mechanism: independent bodies are valid. One info note, so an
    // author who DID mean to link them still sees why nothing was checked.
    return [{
      target: 'export-occt',
      code: 'mechanism.orphan-part',
      severity: 'info',
      message:
        `Assembly '${arm.name}' has ${parts.length} parts and no mates, joints or transmissions, ` +
        `so it is treated as independent bodies (not a mechanism); the part-linkage check was skipped. ` +
        `Add mates/joints only if the parts must move or stay attached to each other.`,
      hint:
        'No action needed for independent bodies (enclosure base + lid, print layouts, body + text). ' +
        'Link parts with mates/joints only when they form a mechanism.',
      nextAction: { kind: 'inspect-message' },
    }];
  }

  // One diagnostic per disconnected body, but every message names the full
  // disconnected-component roster + the required connector/mate patterns so
  // agents (ChatGPT) can fix gear/hinge assemblies without hunting docs.
  const disconnectedList = disconnected.map((n) => `'${n}'`).join(', ');
  const reachableList = [...visited].map((n) => `'${n}'`).join(', ');
  const out: CompilerDiagnostic[] = [];
  for (const name of disconnected) {
    out.push(orphanError(
      `Disconnected component: part '${name}' is not linked to the assembly graph. ` +
        `Root '${root}' reaches only [${reachableList}]; disconnected bodies: [${disconnectedList}]. ` +
        `No mate, joint, or connect edge links '${name}' into that graph. ` +
        `Fix: add connectors + mates/joints — shafts/hinges/gears use ` +
        `partRef.connector(name, { type: 'axis', origin: { kind: 'vec3', value: [x,y,z] }, axis: [ux,uy,uz] }) ` +
        `then arm.mate(..., 'revolute'); rigid mounts use type: 'frame' + mate(..., 'fastened'); ` +
        `or joint primitives arm.revolute/.prismatic/.ball/.fixed. ` +
        `Connector types are only frame|axis|planar|ball (no gear-contact type). ` +
        `If '${name}' is deliberately a free body next to the mechanism (a loose accessory, a display ` +
        `or print-layout part), do not invent a mate: pass { skipMechanismCheck: true } to evaluate_script.`,
    ));
  }
  return out;
}
