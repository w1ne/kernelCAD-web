// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { z } from 'zod';
import {
  MARKUP_NOTE_MAX_LENGTH,
  MARKUP_NOTE_MAX_STROKE_POINTS,
  MARKUP_SNAPSHOT_MAX_MEASUREMENTS,
  MARKUP_SNAPSHOT_MAX_NOTES,
  MARKUP_SNAPSHOT_MAX_REFS_PER_ITEM,
  MARKUP_SNAPSHOT_MAX_TOPOLOGY_REFS,
  STUDIO_AGENT_PROMPT_MAX_CHARS,
  STUDIO_AGENT_PROMPT_TOO_LARGE_MESSAGE,
} from './markupLimits';

export const MARKUP_SNAPSHOT_VERSION = 1 as const;
/** Absolute distance/endpoints agreement allowed when replaying markup (mm). */
export const MARKUP_DISTANCE_VALUE_TOLERANCE_MM = 1e-6;

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
  refs: z.array(topologyRefSchema).max(MARKUP_SNAPSHOT_MAX_REFS_PER_ITEM),
  value: number.nonnegative(),
  units: z.literal('mm'),
}).strict().superRefine((measurement, context) => {
  const [a, b] = measurement.endpoints;
  const endpointDistance = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  if (Math.abs(measurement.value - endpointDistance) > MARKUP_DISTANCE_VALUE_TOLERANCE_MM) {
    context.addIssue({
      code: 'custom',
      path: ['value'],
      message: `${measurement.type} value must match endpoint length within ${MARKUP_DISTANCE_VALUE_TOLERANCE_MM} mm.`,
    });
  }
});

export const markupNoteSchema = z.object({
  id: z.string().min(1),
  text: z.string().trim().min(1).max(MARKUP_NOTE_MAX_LENGTH),
  anchor: modelPointSchema,
  refs: z.array(topologyRefSchema).max(MARKUP_SNAPSHOT_MAX_REFS_PER_ITEM),
  strokePoints: z.array(modelPointSchema).max(MARKUP_NOTE_MAX_STROKE_POINTS).optional(),
}).strict();

export const markupSnapshotSchema = z.object({
  schemaVersion: z.literal(MARKUP_SNAPSHOT_VERSION),
  camera: markupCameraSchema,
  selection: z.object({ topologyRefs: z.array(topologyRefSchema).max(MARKUP_SNAPSHOT_MAX_TOPOLOGY_REFS) }).strict(),
  measurements: z.array(markupMeasurementSchema).max(MARKUP_SNAPSHOT_MAX_MEASUREMENTS),
  notes: z.array(markupNoteSchema).max(MARKUP_SNAPSHOT_MAX_NOTES),
}).strict().superRefine((snapshot, context) => {
  const validateUniqueIds = (items: readonly { id: string }[], field: 'notes' | 'measurements', label: 'note' | 'measurement') => {
    const seen = new Set<string>();
    items.forEach((item, index) => {
      if (seen.has(item.id)) {
        context.addIssue({
          code: 'custom',
          path: [field, index, 'id'],
          message: `Duplicate ${label} ID "${item.id}". ${label} IDs must be unique.`,
        });
      }
      seen.add(item.id);
    });
  };

  validateUniqueIds(snapshot.notes, 'notes', 'note');
  validateUniqueIds(snapshot.measurements, 'measurements', 'measurement');
});

export type ModelPoint = z.infer<typeof modelPointSchema>;
export type TopologyRef = z.infer<typeof topologyRefSchema>;
export type MarkupCamera = z.infer<typeof markupCameraSchema>;
export type MarkupMeasurement = z.infer<typeof markupMeasurementSchema>;
export type MarkupNote = z.infer<typeof markupNoteSchema>;
export type MarkupSnapshot = z.infer<typeof markupSnapshotSchema>;

/** Generate local snapshot item ids in browsers that do not expose the
 * secure-context-only `crypto.randomUUID()` method (for example, HTTP test
 * hosts), while using Web Crypto randomness whenever it is available. */
export function createMarkupId(prefix: string): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === 'function') return `${prefix}${cryptoApi.randomUUID()}`;
  if (typeof cryptoApi?.getRandomValues === 'function') {
    const words = cryptoApi.getRandomValues(new Uint32Array(4));
    const suffix = Array.from(words, (word) => word.toString(16).padStart(8, '0')).join('');
    return `${prefix}${suffix}`;
  }
  return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function serializeMarkupSnapshot(snapshot: MarkupSnapshot): string {
  return JSON.stringify(markupSnapshotSchema.parse(snapshot));
}

/**
 * Inline a replayable context block with every Studio prompt, including a
 * camera-only snapshot with empty markup arrays. The final string is checked
 * after appending the snapshot against the composer budget.
 */
export function attachMarkupSnapshotToPrompt(prompt: string, snapshot: MarkupSnapshot): string {
  const json = serializeMarkupSnapshot(snapshot);
  const longestFence = Math.max(0, ...(json.match(/`+/g) ?? []).map((run) => run.length));
  const fence = '`'.repeat(Math.max(3, longestFence + 1));
  const finalPrompt = `${prompt}\n\nStudio markup snapshot JSON (schemaVersion ${snapshot.schemaVersion}):\n${fence}json\n${json}\n${fence}`;
  if (finalPrompt.length > STUDIO_AGENT_PROMPT_MAX_CHARS) {
    throw new Error(STUDIO_AGENT_PROMPT_TOO_LARGE_MESSAGE);
  }
  return finalPrompt;
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
