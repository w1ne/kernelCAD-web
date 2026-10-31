// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { z } from 'zod';

/** Mesh-local topology indices plus an optional persistent edge identity. */
export const sharedSelectionItemSchema = z.object({
  shapeIndex: z.number().int().nonnegative(),
  kind: z.enum(['face', 'edge']),
  id: z.number().int().nonnegative(),
  featureId: z.string().min(1).nullable(),
  stableId: z.string().regex(/^s[0-9a-f]{16}$/).optional(),
  ref: z.string().startsWith('@kc[').optional(),
}).strict().nullable();
/** Backward-compatible primary selection field. */
export const sharedSelectionSchema = sharedSelectionItemSchema;
export type SharedSelection = z.infer<typeof sharedSelectionSchema>;
export type SharedSelectionItem = Exclude<SharedSelection, null>;
export const faceSignatureSchema = z.object({
  owner: z.string().min(1), surface: z.enum(['plane', 'cylinder', 'other']), area: z.number().finite().nonnegative(),
  centroid: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]),
  normal: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]).nullable(),
  bounds: z.tuple([z.number().finite(), z.number().finite(), z.number().finite(), z.number().finite(), z.number().finite(), z.number().finite()]),
}).strict();
export type FaceSignature = z.infer<typeof faceSignatureSchema>;
export const selectionResultSchema = z.object({
  ok: z.boolean(),
  selection: sharedSelectionSchema,
  selections: z.array(sharedSelectionItemSchema.unwrap()).optional(),
  revision: z.number().int().nonnegative(),
  modelGeneration: z.number().int().nonnegative(),
  pendingSignature: faceSignatureSchema.nullable().optional(),
  error: z.string().optional(),
});
export type SelectionResult = z.infer<typeof selectionResultSchema>;
