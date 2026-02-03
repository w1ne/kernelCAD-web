// Geometry Engine: Class-based implementation
import type {
    WorkerRequest,
    ExecutionResult,
    GeometryResult,
    SketchGeometry,
    FaceGeometry
} from './workerTypes';

import {
    WorkerResponseSchema,
    isSuccessResponse
} from './workerTypes';

// Re-export types for consumers
export type { ExecutionResult, GeometryResult, SketchGeometry, FaceGeometry };

export const defaultCode = `
// You can use standard Replicad API here.
// The variable 'replicad' is available in the scope.
// Helpers available: startSketch(), makeCompound(), fillet(), chamfer()
// You must return a Shape or an array of Shapes.

const { Sketcher } = replicad;

function drawPart() {
  const base = new Sketcher()
    .hLine(40)
    .vLine(40)
    .hLine(-40)
    .close()
    .extrude(20);

  // Apply a fillet to all edges
  const filleted = base.fillet(2);

  // Create a cylinder using standard API
  const cyl = replicad.makeCylinder(10, 30).translate(0, 0, 10);

  // Cut the cylinder from the base
  return [filleted.cut(cyl)];
}

return drawPart();
`;

type PendingMessage = {
    resolve: (val: any) => void;
    reject: (err: any) => void;
};

export class GeometryEngine {
    private worker: Worker | null = null;
    private pendingMessages = new Map<string, PendingMessage>();
    private static instance: GeometryEngine | null = null;

    constructor() { }

    /**
     * Get the singleton instance of GeometryEngine
     */
    public static getInstance(): GeometryEngine {
        if (!GeometryEngine.instance) {
            GeometryEngine.instance = new GeometryEngine();
        }
        return GeometryEngine.instance;
    }

    /**
     * Initialize the worker if not already initialized
     */
    public async initialize(): Promise<void> {
        if (this.worker) return;

        try {
            // Initialize worker
            this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
            this.worker.onmessage = this.handleMessage.bind(this);
            this.worker.onerror = this.handleError.bind(this);
        } catch (error) {
            console.error("Failed to initialize Geometry Worker:", error);
            throw error;
        }
    }

    /**
     * Terminate the worker instance
     */
    public terminate(): void {
        this.worker?.terminate();
        this.worker = null;
        this.pendingMessages.clear();
    }

    /**
     * Handle incoming messages from the worker
     */
    private handleMessage(event: MessageEvent<unknown>): void {
        try {
            // Strictly validate the incoming message structure
            const response = WorkerResponseSchema.parse(event.data);
            const { id } = response;
            const pending = this.pendingMessages.get(id);

            if (pending) {
                if (isSuccessResponse(response)) {
                    // response.geometries and response.blob are mutually exclusive but typed correctly by the guard
                    pending.resolve(response.geometries || response.blob);
                } else {
                    pending.reject(new Error(response.error));
                }
                this.pendingMessages.delete(id);
            }
        } catch (err) {
            console.error("Worker Protocol Violation:", err);
            // Protocol error - we might not know the ID so we can't reject specific promise
        }
    }

    /**
     * Handle worker errors
     */
    private handleError(error: ErrorEvent): void {
        console.error("Geometry Worker Error:", error);
        // We could reject all pending messages here if the worker crashes
    }

    /**
     * Post a message to the worker and await response
     */
    private async postToWorker<T>(message: WorkerRequest): Promise<T> {
        await this.initialize();
        return new Promise<T>((resolve, reject) => {
            const id = message.id;
            this.pendingMessages.set(id, { resolve, reject });
            this.worker?.postMessage(message);
        });
    }

    /**
     * Execute CAD code
     */
    public executeCode(code: string): Promise<ExecutionResult> {
        const id = Math.random().toString(36).substr(2, 9);
        return this.postToWorker<ExecutionResult>({ type: 'EXECUTE', id, code });
    }

    /**
     * Export to STEP
     */
    public exportSTEP(code: string): Promise<Blob> {
        const id = Math.random().toString(36).substr(2, 9);
        return this.postToWorker<Blob>({ type: 'EXPORT_STEP', id, code });
    }

    /**
     * Export to STL
     */
    public exportSTL(code: string): Promise<Blob> {
        const id = Math.random().toString(36).substr(2, 9);
        return this.postToWorker<Blob>({ type: 'EXPORT_STL', id, code });
    }
}

// Global Singleton (for backward compatibility and specific use cases)
export const geometryEngine = GeometryEngine.getInstance();

// Export standalone functions for backward compatibility if needed, 
// but preferred usage is via the class instance or Context.
export const init = () => geometryEngine.initialize();
export const executeCode = (code: string) => geometryEngine.executeCode(code);
export const exportSTEP = (code: string) => geometryEngine.exportSTEP(code);
export const exportSTL = (code: string) => geometryEngine.exportSTL(code);
