// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Q-S5 — Connector Queries for mate-side targeting
//
// Demonstrates: `q.connector(...)` composed with `q.ownedByPart(...)` and
// `q.withLabel(...)` to identify the connector on a specific part by
// label. This is the pattern an agent uses when writing
// `arm.mate(name, aRef, bRef, type)` — the connector refs themselves are
// strings today, but the Query form ships ahead of consumer integration
// so the agent can author the descriptor once and reuse it for diagnostics.
//
// Once mate-side consumer integration lands (a later slice), both sides of
// `arm.mate(...)` accept a `Query<ConnectorMarker>` directly; today the
// Query is a descriptor the agent can serialize to JSON and pass through
// the `evaluate_query` MCP tool.

const arm = assembly('attach');
arm.part('base', box(20, 20, 10))
   .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 5] }, normal: [0, 0, 1] });
arm.part('bracket', box(10, 10, 5))
   .connector('flange', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, -2.5] }, normal: [0, 0, 1] });

// The base side: "the connector on the 'base' part labelled 'mount'".
const baseSide = q.connector()
  .and(q.ownedByPart(q.part().and(q.withFeatureName('base'))))
  .and(q.withLabel('mount'));
if (baseSide.target !== 'connector') throw new Error('Q-S5: base target');

// The bracket side: structurally identical, different part name + label.
const bracketSide = q.connector()
  .and(q.ownedByPart(q.part().and(q.withFeatureName('bracket'))))
  .and(q.withLabel('flange'));
if (bracketSide.target !== 'connector') throw new Error('Q-S5: bracket target');

// Today the string form remains the consumer surface — the Query form is
// a parallel descriptor for diagnostics and future direct consumption.
arm.mate('attach', 'base.mount', 'bracket.flange', 'fastened');

return arm.model();
