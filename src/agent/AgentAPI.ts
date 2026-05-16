import { HeadlessKernel, type ExecutionResult } from '../modeling/HeadlessKernel';
import { featureRegistry } from '../modeling/features/FeatureRegistry';
import type { FeatureContext } from '../modeling/features/types';

export class AgentAPI {
    readonly kernel: HeadlessKernel;

    constructor() {
        this.kernel = new HeadlessKernel();
    }

    async init() {
        await this.kernel.initialize();
    }

    /**
     * Executes a registered feature (tool) by ID with arguments.
     * Arguments are validated against the feature's schema.
     */
    executeCommand(featureId: string, args: Record<string, unknown>) {
        // HeadlessKernel implements FeatureContext compatibility
        featureRegistry.execute(this.kernel as unknown as FeatureContext, featureId, args);
    }

    async evaluateCode(code: string): Promise<ExecutionResult> {
        return this.kernel.executeCode(code);
    }

    get state() {
        return {
            code: this.kernel.code
        };
    }
}

export const agentAPI = new AgentAPI();
