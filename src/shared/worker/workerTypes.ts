// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Type-Safe Worker Protocol
 * 
 * Discriminated unions for worker messages to ensure type safety
 * between the main thread and geometry worker.
 */

// ============================================================================
// Request Messages (Main Thread → Worker)
// ============================================================================

import { z } from 'zod';
import type { PBRMaterial } from '../intent/material';

// ============================================================================
// Request Messages (Main Thread → Worker)
// ============================================================================

export const ExecuteRequestSchema = z.object({
    type: z.literal('EXECUTE'),
    id: z.string(),
    code: z.string(),
    /** Mesh-quality tier for this pass. `'coarse'` is the fast first-paint
     *  preview of an edit (`COARSE_MESH_OPTIONS`); omitted = display quality.
     *  The Studio edit loop sends a coarse pass, then a display pass that
     *  replaces it. */
    meshQuality: z.enum(['coarse']).optional(),
});

export const InitRequestSchema = z.object({
    type: z.literal('INIT'),
    id: z.string(),
});

export const ExportSTEPRequestSchema = z.object({
    type: z.literal('EXPORT_STEP'),
    id: z.string(),
    code: z.string(),
});

export const ExportSTLRequestSchema = z.object({
    type: z.literal('EXPORT_STL'),
    id: z.string(),
    code: z.string(),
});

export const WorkerRequestSchema = z.discriminatedUnion('type', [
    InitRequestSchema,
    ExecuteRequestSchema,
    ExportSTEPRequestSchema,
    ExportSTLRequestSchema,
]);

export type WorkerRequest = z.infer<typeof WorkerRequestSchema>;
export type ExecuteRequest = z.infer<typeof ExecuteRequestSchema>;
export type ExportSTEPRequest = z.infer<typeof ExportSTEPRequestSchema>;

// ============================================================================
// Response Messages (Worker → Main Thread)
// ============================================================================

const Float32ArraySchema = z.instanceof(Float32Array);
const Uint32ArraySchema = z.instanceof(Uint32Array);

export const FaceGeometrySchema = z.object({
    vertices: Float32ArraySchema,
    indices: Uint32ArraySchema,
    normals: Float32ArraySchema,
    /** Bbox-planar UVs (one (u,v) per vertex). Generated lazily in featureMeshing.ts. */
    uv: Float32ArraySchema.optional(),
    faceId: z.number(),
    plane: z.object({
        origin: z.tuple([z.number(), z.number(), z.number()]),
        normal: z.tuple([z.number(), z.number(), z.number()]),
        xDir: z.tuple([z.number(), z.number(), z.number()]).optional(),
        yDir: z.tuple([z.number(), z.number(), z.number()]).optional(),
    }).optional(),
    cylinder: z.object({
        origin: z.tuple([z.number(), z.number(), z.number()]),
        axis: z.tuple([z.number(), z.number(), z.number()]),
        radius: z.number(),
    }).optional(),
});

export const GeometryResultSchema = z.object({
    faces: z.array(FaceGeometrySchema),
    mesh: z.object({ positions: Float32ArraySchema, normals: Float32ArraySchema, indices: Uint32ArraySchema }).optional(),
    volume: z.number().optional(),
    edges: Float32ArraySchema.optional(),
    edgeRanges: z.array(z.number()).optional(),
    edgeOwners: z.array(z.string()).optional(),
    edgeStableIds: z.array(z.string()).optional(),
    color: z.string().optional(),
    transform: z.array(z.number()).length(16).optional(),
    assemblyFeatureId: z.string().optional(),
    assemblyPartName: z.string().optional(),
});

export const SketchGeometrySchema = z.object({
    id: z.string(),
    name: z.string(),
    vertices: Float32ArraySchema,
});

export const ExecutionResultSchema = z.object({
    geometries: z.array(GeometryResultSchema),
    sketches: z.array(SketchGeometrySchema),
});

export const SuccessResponseSchema = z.object({
    type: z.literal('SUCCESS'),
    id: z.string(),
    geometries: ExecutionResultSchema.optional(),
    blob: z.instanceof(Blob).optional(),
});

/** Fast first-paint frame of an EXECUTE that asked for the coarse tier. Sent
 *  BEFORE the final SUCCESS on the same request id: the script ran once, the
 *  worker is just tessellating twice. Carries geometries only (the final frame
 *  owns the sketches) so no typed-array buffer is transferred twice. */
export const ExecutePreviewResponseSchema = z.object({
    type: z.literal('EXECUTE_PREVIEW'),
    id: z.string(),
    geometries: ExecutionResultSchema,
});

export const ErrorResponseSchema = z.object({
    type: z.literal('ERROR'),
    id: z.string(),
    error: z.string(),
});

export const WorkerResponseSchema = z.discriminatedUnion('type', [
    SuccessResponseSchema,
    ExecutePreviewResponseSchema,
    ErrorResponseSchema
]);

export interface FaceGeometry {
    vertices: Float32Array;
    indices: Uint32Array;
    normals: Float32Array;
    /** Bbox-planar UVs (one (u,v) per vertex). Generated lazily in featureMeshing.ts. */
    uv?: Float32Array;
    faceId: number;
    plane?: {
        origin: [number, number, number];
        normal: [number, number, number];
        xDir?: [number, number, number];
        yDir?: [number, number, number];
    };
    cylinder?: {
        origin: [number, number, number];
        axis: [number, number, number];
        radius: number;
    };
}

export interface GeometryResult {
    faces: FaceGeometry[];
    mesh?: { positions: Float32Array; normals: Float32Array; indices: Uint32Array };
    volume?: number;
    edges?: Float32Array;
    color?: string;
    material?: PBRMaterial;
    /** Column-major 4x4 local-to-world matrix for viewport-side assembly posing. */
    transform?: number[];
    assemblyFeatureId?: string;
    assemblyPartName?: string;
    /** FeatureRecord id of the feature this mesh shows. Absent on the legacy
     *  in-browser worker path. */
    featureId?: string;
    /** Per-face owning feature id, indexed by `FaceGeometry.faceId`: the
     *  feature whose script call created the face (face lineage). Absent
     *  when every face belongs to `featureId`. */
    faceOwners?: string[];
    /** Per-edge vertex ranges into `edges`, as flat `[start, count]` pairs in
     *  vertex units (one pair per BREP edge). */
    edgeRanges?: number[];
    /** Owning feature id per `edgeRanges` pair. Absent when every edge
     *  belongs to `featureId`. */
    edgeOwners?: string[];
    /** Persistent geometry-derived ID aligned with each `edgeRanges` pair. */
    edgeStableIds?: string[];
}

export interface SketchGeometry {
    id: string;
    name: string;
    vertices: Float32Array;
}

export interface ExecutionResult {
    geometries: GeometryResult[];
    sketches: SketchGeometry[];
}

export interface SuccessResponse {
    type: 'SUCCESS';
    id: string;
    geometries?: ExecutionResult;
    blob?: Blob;
}

export interface ExecutePreviewResponse {
    type: 'EXECUTE_PREVIEW';
    id: string;
    geometries: ExecutionResult;
}

export interface ErrorResponse {
    type: 'ERROR';
    id: string;
    error: string;
}

export type WorkerResponse = SuccessResponse | ExecutePreviewResponse | ErrorResponse;

// ============================================================================
// Type Guards
// ============================================================================

export function isExecuteRequest(msg: WorkerRequest): msg is ExecuteRequest {
    return msg.type === 'EXECUTE';
}

export function isExportRequest(msg: WorkerRequest): msg is ExportSTEPRequest | z.infer<typeof ExportSTLRequestSchema> {
    return msg.type === 'EXPORT_STEP' || msg.type === 'EXPORT_STL';
}

export function isSuccessResponse(msg: WorkerResponse): msg is SuccessResponse {
    return msg.type === 'SUCCESS';
}

export function isExecutePreviewResponse(msg: WorkerResponse): msg is ExecutePreviewResponse {
    return msg.type === 'EXECUTE_PREVIEW';
}

export function isErrorResponse(msg: WorkerResponse): msg is ErrorResponse {
    return msg.type === 'ERROR';
}
