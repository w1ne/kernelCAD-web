# Edge picking design

**Status:** Approved by the supervisor on 2026-10-20.

## Goal

Let Studio users pick one or more BREP edges, let MCP clients read and set the
same selection, and let fillet/chamfer operations target those exact edges.

## Design

Studio will use the existing BREP edge hit testing and hover overlay. A
screen-scaled hit threshold decides whether a click targets an edge or the
underlying face. A plain click replaces the topology selection; Shift/Ctrl
toggles an item. Hover remains orange and selected topology remains teal. Edge
selection does not enter sketch-on-face mode.

Each edge receives a deterministic stable ID from its exact curve type,
length, and normalized geometric samples. This ID is independent of edge
traversal order, stable across repeat evaluations, and stable across unrelated
edits while the edge geometry itself remains unchanged. If geometry changes,
the ID changes. Ambiguous geometry signatures are rejected when resolving an
operation ref. The local edge-range index remains available for drawing the
selection.

The shared selection response retains the existing primary `selection` field
and adds `selections` for the complete set. Each picked edge includes its
stable ID and an operation-ready `@kc[shape/edge/s…]` ref. The selection write
tool accepts both the existing single-pick form and the full set. Fillet and
chamfer selector inputs accept one or multiple such refs, which resolve
against the current BREP before kernel execution.

## Verification and docs

Tests will cover deterministic edge IDs, geometric hit-to-edge resolution,
modifier multi-selection, MCP selection round-tripping, and actual OCCT fillet
and chamfer outcomes. A Playwright check will cover an actual Studio edge
click if the available local browser session supports the existing harness.
The shared-selection guide, MCP tool contracts, and skill description will
document the ID scheme and selection flow. A small MP4 demo bundle will retain
its source, invocation/settings, and verification evidence.

Public copy describes native kernelCAD behavior. Dated comparisons remain in
the ignored `kernelCAD-private` directory. No commit, push, or deployment is
part of this work.
