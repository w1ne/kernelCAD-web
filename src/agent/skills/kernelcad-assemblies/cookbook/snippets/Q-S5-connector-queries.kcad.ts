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
// the `query({ mode: 'evaluate' })` MCP tool.

const arm = assembly('attach');
// `box(w, d, h)` has its corner at the origin, so the base's top face is
// z = 10 and the bracket's bottom face is z = 0. Each connector is at the
// centre of the face that seats: the fastened mate puts the bracket on top
// of the base with a shared face and no shared volume.
arm.part('base', box(20, 20, 10))
   .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [10, 10, 10] }, normal: [0, 0, 1] });
arm.part('bracket', box(10, 10, 5))
   .connector('flange', { type: 'frame', origin: { kind: 'vec3', value: [5, 5, 0] }, normal: [0, 0, 1] });

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
