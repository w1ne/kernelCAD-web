import { type Feature } from './types';

class FeatureRegistry {
    private features: Map<string, Feature> = new Map();

    register(feature: Feature) {
        if (this.features.has(feature.id)) {
            console.warn(`Feature ${feature.id} already registered. Overwriting.`);
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
     * Returns features grouped by category (implied by ID prefix or generic grouping later).
     * For now simple list.
     */
}

export const featureRegistry = new FeatureRegistry();
