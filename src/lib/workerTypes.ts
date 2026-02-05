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

// ============================================================================
// Request Messages (Main Thread → Worker)
// ============================================================================

export const ExecuteRequestSchema = z.object({
    type: z.literal('EXECUTE'),
    id: z.string(),
    code: z.string(),
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
    faceId: z.number(),
    plane: z.object({
        origin: z.tuple([z.number(), z.number(), z.number()]),
        normal: z.tuple([z.number(), z.number(), z.number()]),
        xDir: z.tuple([z.number(), z.number(), z.number()]).optional(),
        yDir: z.tuple([z.number(), z.number(), z.number()]).optional(),
    }).optional(),
});

export const GeometryResultSchema = z.object({
    faces: z.array(FaceGeometrySchema),
    volume: z.number().optional(),
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

export const ErrorResponseSchema = z.object({
    type: z.literal('ERROR'),
    id: z.string(),
    error: z.string(),
});

export const WorkerResponseSchema = z.discriminatedUnion('type', [
    SuccessResponseSchema,
    ErrorResponseSchema
]);

export type WorkerResponse = z.infer<typeof WorkerResponseSchema>;
export type FaceGeometry = z.infer<typeof FaceGeometrySchema>;
export type GeometryResult = z.infer<typeof GeometryResultSchema>;
export type SketchGeometry = z.infer<typeof SketchGeometrySchema>;
export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

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

export function isErrorResponse(msg: WorkerResponse): msg is ErrorResponse {
    return msg.type === 'ERROR';
}
