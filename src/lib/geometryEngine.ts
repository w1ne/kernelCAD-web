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
return replicad.makeBox(10, 10, 10);
`;

type PendingMessage = {
    resolve: (val: unknown) => void;
    reject: (err: unknown) => void;
};

export class GeometryEngine {
    private worker: Worker | null = null;
    private pendingMessages = new Map<string, PendingMessage>();
    private static instance: GeometryEngine | null = null;
    private isInitialized = false;
    private initPromise: { resolve: () => void; reject: (err: unknown) => void } | null = null;

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
        if (this.isInitialized) return;

        if (!this.worker) {
            try {
                this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
                this.worker.onmessage = this.handleMessage.bind(this);
                this.worker.onerror = this.handleError.bind(this);
            } catch (error) {
                console.error("Failed to initialize Geometry Worker:", error);
                throw error;
            }
        }

        if (!this.initPromise) {
            const promise = new Promise<void>((resolve, reject) => {
                this.initPromise = { resolve, reject };
            });

            // Send an initial message to the worker to confirm readiness
            this.worker?.postMessage({ type: 'INIT', id: 'init' });
            await promise;
        } else {
            // Already initializing, wait for it
            const promise = new Promise<void>((resolve) => {
                const oldResolve = this.initPromise!.resolve;
                this.initPromise!.resolve = () => {
                    oldResolve();
                    resolve();
                };
            });
            await promise;
        }
    }

    /**
     * Terminate the worker instance
     */
    public terminate(): void {
        this.worker?.terminate();
        this.worker = null;
        this.pendingMessages.clear();
        this.isInitialized = false;
        this.initPromise = null;
    }

    /**
     * Handle incoming messages from the worker
     */
    private handleMessage(event: MessageEvent<unknown>): void {
        try {
            const response = WorkerResponseSchema.parse(event.data);

            // Handle initialization success separately to resolve initPromise
            if (response.type === 'SUCCESS' && response.id === 'init') {
                this.isInitialized = true;
                if (typeof window !== 'undefined') {
                    window.isEngineReady = true;
                }
                if (this.initPromise) {
                    this.initPromise.resolve();
                    this.initPromise = null;
                }
                return;
            }

            const { id } = response;
            const pending = this.pendingMessages.get(id);

            if (pending) {
                if (isSuccessResponse(response)) {
                    pending.resolve(response.geometries || response.blob);
                } else {
                    pending.reject(new Error(response.error));
                }
                this.pendingMessages.delete(id);
            }
        } catch (err) {
            console.error("Worker Protocol Violation:", err);
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
            this.pendingMessages.set(id, {
                resolve: (val: unknown) => resolve(val as T),
                reject
            });
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
