// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { z } from 'zod';

/** Mesh-local topology indices. featureId is provenance, not a topology ref. */
export const sharedSelectionSchema = z.object({
  shapeIndex: z.number().int().nonnegative(),
  kind: z.enum(['face', 'edge']),
  id: z.number().int().nonnegative(),
  featureId: z.string().min(1).nullable(),
}).strict().nullable();
export type SharedSelection = z.infer<typeof sharedSelectionSchema>;
export const selectionResultSchema = z.object({
  ok: z.boolean(),
  selection: sharedSelectionSchema,
  revision: z.number().int().nonnegative(),
  modelGeneration: z.number().int().nonnegative(),
  error: z.string().optional(),
});
export type SelectionResult = z.infer<typeof selectionResultSchema>;
