// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { z } from 'zod';

export const MARKUP_SNAPSHOT_VERSION = 1 as const;
export const MARKUP_NOTE_MAX_LENGTH = 280;

const number = z.number().finite();
export const modelPointSchema = z.tuple([number, number, number]);

/** Mesh-local topology identity. It is useful context for the current model,
 *  but shapeIndex/id may change when the source is rebuilt. */
export const topologyRefSchema = z.object({
  shapeIndex: z.number().int().nonnegative(),
  kind: z.enum(['face', 'edge']),
  id: z.number().int().nonnegative(),
  featureId: z.string().min(1).optional(),
}).strict();

export const markupCameraSchema = z.object({
  position: modelPointSchema,
  target: modelPointSchema,
  up: modelPointSchema,
  projection: z.literal('perspective'),
  fov: number.positive().max(180),
  zoom: number.positive(),
}).strict();

export const markupMeasurementSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['distance', 'diameter']),
  endpoints: z.tuple([modelPointSchema, modelPointSchema]),
  refs: z.array(topologyRefSchema),
  value: number.nonnegative(),
  units: z.literal('mm'),
}).strict();

export const markupNoteSchema = z.object({
  id: z.string().min(1),
  text: z.string().trim().min(1).max(MARKUP_NOTE_MAX_LENGTH),
  anchor: modelPointSchema,
  refs: z.array(topologyRefSchema),
  strokePoints: z.array(modelPointSchema).optional(),
}).strict();

export const markupSnapshotSchema = z.object({
  schemaVersion: z.literal(MARKUP_SNAPSHOT_VERSION),
  camera: markupCameraSchema,
  selection: z.object({ topologyRefs: z.array(topologyRefSchema) }).strict(),
  measurements: z.array(markupMeasurementSchema),
  notes: z.array(markupNoteSchema),
}).strict();

export type ModelPoint = z.infer<typeof modelPointSchema>;
export type TopologyRef = z.infer<typeof topologyRefSchema>;
export type MarkupCamera = z.infer<typeof markupCameraSchema>;
export type MarkupMeasurement = z.infer<typeof markupMeasurementSchema>;
export type MarkupNote = z.infer<typeof markupNoteSchema>;
export type MarkupSnapshot = z.infer<typeof markupSnapshotSchema>;

export function serializeMarkupSnapshot(snapshot: MarkupSnapshot): string {
  return JSON.stringify(markupSnapshotSchema.parse(snapshot));
}

/** Inline a compact replayable context block in the existing prompt channel. */
export function attachMarkupSnapshotToPrompt(prompt: string, snapshot: MarkupSnapshot): string {
  const json = serializeMarkupSnapshot(snapshot);
  const longestFence = Math.max(0, ...(json.match(/`+/g) ?? []).map((run) => run.length));
  const fence = '`'.repeat(Math.max(3, longestFence + 1));
  return `${prompt}\n\nStudio markup snapshot JSON (schemaVersion ${snapshot.schemaVersion}):\n${fence}json\n${json}\n${fence}`;
}

export function parseMarkupSnapshot(serialized: string | unknown): MarkupSnapshot {
  const value = typeof serialized === 'string' ? JSON.parse(serialized) as unknown : serialized;
  return markupSnapshotSchema.parse(value);
}

/** Validation also clones the JSON-shaped data, making this the shared replay
 *  boundary for snapshots loaded from disk or received with an agent prompt. */
export function replayMarkupSnapshot(snapshot: MarkupSnapshot): MarkupSnapshot {
  return markupSnapshotSchema.parse(snapshot);
}

export function makeDistanceMeasurement(input: {
  id: string;
  a: ModelPoint;
  b: ModelPoint;
  refs: TopologyRef[];
}): MarkupMeasurement {
  const [ax, ay, az] = input.a;
  const [bx, by, bz] = input.b;
  return markupMeasurementSchema.parse({
    id: input.id,
    type: 'distance',
    endpoints: [input.a, input.b],
    refs: input.refs,
    value: Math.hypot(bx - ax, by - ay, bz - az),
    units: 'mm',
  });
}

export function makeDiameterMeasurement(input: {
  id: string;
  a: ModelPoint;
  b: ModelPoint;
  refs: TopologyRef[];
  value: number;
}): MarkupMeasurement {
  return markupMeasurementSchema.parse({
    id: input.id,
    type: 'diameter',
    endpoints: [input.a, input.b],
    refs: input.refs,
    value: input.value,
    units: 'mm',
  });
}
