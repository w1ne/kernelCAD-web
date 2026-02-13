import { type Feature } from './types';

class FeatureRegistry {
    private features: Map<string, Feature> = new Map();
    private isTestRuntime(): boolean {
        const viteMode = (import.meta as unknown as { env?: { MODE?: string } }).env?.MODE;
        if (viteMode === 'test') return true;
        const maybeProcess = (globalThis as unknown as { process?: { env?: { VITEST?: string } } }).process;
        if (maybeProcess?.env?.VITEST) return true;
        return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    register(feature: Feature<any>) {
        if (this.features.has(feature.id)) {
            if (this.isTestRuntime()) {
                console.warn(`Feature ${feature.id} already registered in test runtime. Overwriting.`);
            } else {
                throw new Error(`Feature "${feature.id}" is already registered.`);
            }
        }
        this.features.set(feature.id, feature);
    }

    get(id: string): Feature | undefined {
        return this.features.get(id);
    }

    getAll(): Feature[] {
        return Array.from(this.features.values());
    }

    clear() {
        this.features.clear();
    }

    /**
     * Executes a feature by ID with schema validation.
     * @param context The execution context (Headless or UI)
     * @param featureId The ID of the feature to execute
     * @param args Arguments for the feature
     */
    execute(context: import('./types').FeatureContext, featureId: string, args?: unknown) {
        const feature = this.get(featureId);
        if (!feature) {
            throw new Error(`Feature "${featureId}" not found.`);
        }

        if (feature.schema) {
            const result = feature.schema.safeParse(args);
            if (!result.success) {
                throw new Error(`Invalid arguments for "${featureId}": ${JSON.stringify(result.error.format())}`);
            }
            // Typescript might complain about specific TArgs matching, forcing cast
            feature.execute(context, result.data);
        } else {
            feature.execute(context, args);
        }
    }
}

export const featureRegistry = new FeatureRegistry();
