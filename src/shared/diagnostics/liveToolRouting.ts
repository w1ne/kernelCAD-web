// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Wire-boundary routing of diagnostic hints to LIVE MCP tools.
//
// The introspection family (list_edges, list_faces, …) was collapsed into
// `inspect({ of })`; the registry hints and nextActions name the live call.
// Some emit sites below the registry (kernel selection, naming) still write
// the retired names into their own message/hint prose. Rewriting them here,
// where every agent-facing surface fills `nextAction`, means an agent never
// receives a call to a tool that no longer exists — whatever layer wrote it.
//
// The authoritative retired → replacement map is
// src/agent/mcp/retiredToolNames.ts (agent layer, not importable from here);
// a test asserts every key below is retired there.

import type { NextAction } from './nextAction';

/** Retired introspection tool name → the live call that replaces it. */
export const RETIRED_INTROSPECTION_CALLS: Readonly<Record<string, string>> = {
  list_face_labels: "inspect({ of: 'face-labels' })",
  list_faces: "inspect({ of: 'faces' })",
  list_edges: "inspect({ of: 'edges' })",
  get_edges_of: "inspect({ of: 'face-edges', face_name })",
  list_features: "inspect({ of: 'features' })",
  list_topology: "inspect({ of: 'topology' })",
  list_mates: "inspect({ of: 'mates' })",
  list_assemblies: "inspect({ of: 'assemblies' })",
  inspect_robot: "inspect({ of: 'robot' })",
  list_part_categories: "inspect({ of: 'part-categories' })",
};

const RETIRED_NAME_PATTERN = new RegExp(
  String.raw`\b(${Object.keys(RETIRED_INTROSPECTION_CALLS).join('|')})\b`,
  'g',
);

/** Replace every retired introspection tool name in `text` with its live call. */
export function routeRetiredToolMentions(text: string): string {
  return text.replace(RETIRED_NAME_PATTERN, (name) => RETIRED_INTROSPECTION_CALLS[name] ?? name);
}

/** Selection-family codes whose subject (edges vs faces) is only known at the emit site. */
const SELECTION_CODES = new Set(['feature.selection.no-match']);

/**
 * The per-code default for a selection miss inspects edges. A face query
 * that matched nothing must send the agent to the faces instead: the emit
 * sites say which in their message ("Face query matched zero faces",
 * "matched zero faces at the consumer", "face ref …").
 */
export function refineSelectionNextAction(
  code: string,
  message: string,
  fallback: NextAction | undefined,
): NextAction | undefined {
  if (!SELECTION_CODES.has(code)) return fallback;
  const aboutFaces = /\bfaces?\b|faceLabels|FaceQuery/i.test(message) && !/\bedge query\b|\bselectEdge/i.test(message);
  return aboutFaces ? { kind: 'call-tool', tool: 'inspect', args: { of: 'faces' } } : fallback;
}
