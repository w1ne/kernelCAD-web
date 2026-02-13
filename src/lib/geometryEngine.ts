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
    timeoutId: ReturnType<typeof setTimeout>;
};

export interface GeometryEngineDiagnostics {
    initFailures: number;
    workerCrashes: number;
    protocolViolations: number;
    requestTimeouts: number;
    requestsSent: number;
    requestsResolved: number;
    requestsRejected: number;
}

export class GeometryEngine {
    private worker: Worker | null = null;
    private pendingMessages = new Map<string, PendingMessage>();
    private static instance: GeometryEngine | null = null;
    private isInitialized = false;
    private initPromise: Promise<void> | null = null;
    private initResolve: (() => void) | null = null;
    private initReject: ((err: unknown) => void) | null = null;
    private requestSequence = 0;
    private diagnostics: GeometryEngineDiagnostics = {
        initFailures: 0,
        workerCrashes: 0,
        protocolViolations: 0,
        requestTimeouts: 0,
        requestsSent: 0,
        requestsResolved: 0,
        requestsRejected: 0,
    };

    private static readonly INIT_TIMEOUT_MS = 20000;
    private static readonly REQUEST_TIMEOUT_MS = 30000;

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

        if (this.initPromise) {
            await this.initPromise;
            return;
        }

        this.initPromise = new Promise<void>((resolve, reject) => {
            this.initResolve = resolve;
            this.initReject = reject;
        });

        const timeoutId = setTimeout(() => {
            this.failInitialization(new Error('Geometry worker initialization timed out.'));
            this.terminate('Geometry worker initialization timed out.');
        }, GeometryEngine.INIT_TIMEOUT_MS);

        // Send an initial message to the worker to confirm readiness
        this.worker?.postMessage({ type: 'INIT', id: 'init' });

        try {
            await this.initPromise;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Terminate the worker instance
     */
    public terminate(reason = 'Geometry worker terminated.'): void {
        this.failInitialization(new Error(reason));
        this.rejectAllPending(new Error(reason));
        this.worker?.terminate();
        this.worker = null;
        this.isInitialized = false;
    }

    public getDiagnostics(): Readonly<GeometryEngineDiagnostics> {
        return { ...this.diagnostics };
    }

    public resetDiagnostics(): void {
        this.diagnostics = {
            initFailures: 0,
            workerCrashes: 0,
            protocolViolations: 0,
            requestTimeouts: 0,
            requestsSent: 0,
            requestsResolved: 0,
            requestsRejected: 0,
        };
    }

    private resetInitializationState(): void {
        this.initPromise = null;
        this.initResolve = null;
        this.initReject = null;
    }

    private failInitialization(err: Error): void {
        if (this.initReject) {
            this.diagnostics.initFailures += 1;
            this.initReject(err);
        }
        this.resetInitializationState();
    }

    private completeInitialization(): void {
        this.isInitialized = true;
        if (typeof window !== 'undefined') {
            window.isEngineReady = true;
        }
        if (this.initResolve) {
            this.initResolve();
        }
        this.resetInitializationState();
    }

    private rejectAllPending(err: Error): void {
        for (const [, pending] of this.pendingMessages) {
            clearTimeout(pending.timeoutId);
            pending.reject(err);
            this.diagnostics.requestsRejected += 1;
        }
        this.pendingMessages.clear();
    }

    /**
     * Handle incoming messages from the worker
     */
    private handleMessage(event: MessageEvent<unknown>): void {
        try {
            const response = WorkerResponseSchema.parse(event.data);

            // Handle initialization responses separately
            if (response.id === 'init') {
                if (response.type === 'SUCCESS') {
                    this.completeInitialization();
                } else {
                    this.failInitialization(new Error(response.error));
                }
                return;
            }

            const { id } = response;
            const pending = this.pendingMessages.get(id);

            if (pending) {
                clearTimeout(pending.timeoutId);
                if (isSuccessResponse(response)) {
                    pending.resolve(response.geometries || response.blob);
                    this.diagnostics.requestsResolved += 1;
                } else {
                    pending.reject(new Error(response.error));
                    this.diagnostics.requestsRejected += 1;
                }
                this.pendingMessages.delete(id);
            }
        } catch (err) {
            console.error("Worker Protocol Violation:", err);
            this.diagnostics.protocolViolations += 1;
            this.terminate('Worker protocol violation.');
        }
    }

    /**
     * Handle worker errors
     */
    private handleError(error: ErrorEvent): void {
        console.error("Geometry Worker Error:", error);
        this.diagnostics.workerCrashes += 1;
        this.terminate('Geometry worker crashed.');
    }

    /**
     * Post a message to the worker and await response
     */
    private async postToWorker<T>(message: WorkerRequest): Promise<T> {
        await this.initialize();
        return new Promise<T>((resolve, reject) => {
            const id = message.id;
            this.diagnostics.requestsSent += 1;
            const timeoutId = setTimeout(() => {
                this.pendingMessages.delete(id);
                this.diagnostics.requestTimeouts += 1;
                this.diagnostics.requestsRejected += 1;
                reject(new Error(`Worker request timed out (${message.type})`));
            }, GeometryEngine.REQUEST_TIMEOUT_MS);
            this.pendingMessages.set(id, {
                resolve: (val: unknown) => resolve(val as T),
                reject,
                timeoutId
            });
            this.worker?.postMessage(message);
        });
    }

    private nextRequestId(): string {
        this.requestSequence += 1;
        return `req_${this.requestSequence}`;
    }

    /**
     * Execute CAD code
     */
    public executeCode(code: string): Promise<ExecutionResult> {
        const id = this.nextRequestId();
        return this.postToWorker<ExecutionResult>({ type: 'EXECUTE', id, code });
    }

    /**
     * Export to STEP
     */
    public exportSTEP(code: string): Promise<Blob> {
        const id = this.nextRequestId();
        return this.postToWorker<Blob>({ type: 'EXPORT_STEP', id, code });
    }

    /**
     * Export to STL
     */
    public exportSTL(code: string): Promise<Blob> {
        const id = this.nextRequestId();
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
