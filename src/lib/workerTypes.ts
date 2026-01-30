/**
 * Type-Safe Worker Protocol
 * 
 * Discriminated unions for worker messages to ensure type safety
 * between the main thread and geometry worker.
 */

// ============================================================================
// Request Messages (Main Thread → Worker)
// ============================================================================

export interface ExecuteRequest {
    type: 'EXECUTE';
    id: string;
    code: string;
}

export interface ExportSTEPRequest {
    type: 'EXPORT_STEP';
    id: string;
    code: string;
}

export interface ExportSTLRequest {
    type: 'EXPORT_STL';
    id: string;
    code: string;
}

export type WorkerRequest = ExecuteRequest | ExportSTEPRequest | ExportSTLRequest;

// ============================================================================
// Response Messages (Worker → Main Thread)
// ============================================================================

export interface FaceGeometry {
    vertices: Float32Array;
    indices: Uint32Array;
    normals: Float32Array;
    faceId: number;
    plane?: {
        origin: [number, number, number];
        normal: [number, number, number];
    };
}

export interface GeometryResult {
    faces: FaceGeometry[];
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

export interface ErrorResponse {
    type: 'ERROR';
    id: string;
    error: string;
}

export type WorkerResponse = SuccessResponse | ErrorResponse;

// ============================================================================
// Type Guards
// ============================================================================

export function isExecuteRequest(msg: WorkerRequest): msg is ExecuteRequest {
    return msg.type === 'EXECUTE';
}

export function isExportRequest(msg: WorkerRequest): msg is ExportSTEPRequest | ExportSTLRequest {
    return msg.type === 'EXPORT_STEP' || msg.type === 'EXPORT_STL';
}

export function isSuccessResponse(msg: WorkerResponse): msg is SuccessResponse {
    return msg.type === 'SUCCESS';
}

export function isErrorResponse(msg: WorkerResponse): msg is ErrorResponse {
    return msg.type === 'ERROR';
}
