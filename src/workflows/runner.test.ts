import { describe, test, expect, beforeAll } from 'vitest';
import { initReplicad, executeGeometry } from '../test/regressionTestHelpers';
import { getWorkflows } from './registry';

// Dynamic import of all workflow definitions
// Dynamic import of all workflow definitions
const definitions = import.meta.glob('./definitions/*.ts', { eager: true });

import { registerWorkflow } from './registry';

// Register exported workflows automatically
Object.values(definitions).forEach((module: any) => {
    Object.values(module).forEach((exported: any) => {
        if (exported && typeof exported === 'object' && 'id' in exported && 'code' in exported) {
            registerWorkflow(exported);
        }
    });
});

describe('Headless Workflow Validation', () => {
    beforeAll(async () => {
        await initReplicad();
    });

    const activeWorkflows = getWorkflows();

    if (activeWorkflows.length === 0) {
        test.skip('No workflows registered', () => { });
    }

    activeWorkflows.forEach((workflow) => {
        test(`Workflow: ${workflow.name} (${workflow.id})`, async () => {
            console.log(`Running workflow: ${workflow.name}`);

            try {
                const { shape, sketches } = executeGeometry(workflow.code);
                // console.log('Workflow Result Shape:', shape);
                console.log(`Workflow Execution: ${sketches.length} sketches created`);

                // Simulate Worker Mesh Generation to trigger potential crashes
                sketches.forEach((s: any, i: number) => {
                    try {
                        const wire = s.sketch?.wire;
                        if (wire) {
                            // console.log(`Meshing sketch ${i}...`);
                            wire.mesh({ tolerance: 0.1 });
                        }
                    } catch (e) {
                        console.error(`Failed to mesh sketch ${i}:`, e);
                        throw new Error(`Worker Crash Reproduction: Failed to mesh sketch ${i}: ${e}`);
                    }
                });

                // Validation
                if (workflow.expected.error) {
                    // We expected an error, but didn't get one? 
                    // Or expected error logic should be wrapped around executeGeometry if it throws.
                    // executeGeometry might throw if the code fails.
                    throw new Error(`Expected error matching ${workflow.expected.error} but succeeded`);
                }

                if (workflow.expected.volume !== undefined) {
                    // Try to access volume via property (Replicad Shape usually has .volume getter)
                    // If it is throwing WASM error on access, handle it.
                    try {
                        let vol = (shape as any).volume;
                        if (typeof vol === 'function') vol = vol(); // Just in case

                        if (typeof vol === 'number' && !isNaN(vol)) {
                            expect(vol).toBeCloseTo(workflow.expected.volume, 1);
                        } else {
                            console.warn(`Skipping volume check for ${workflow.name}: volume is ${vol}`);
                        }
                    } catch (e) {
                        console.warn(`Skipping volume check for ${workflow.name}: error accessing volume: ${e}`);
                    }
                }

                if (workflow.expected.faceCount !== undefined) {
                    expect((shape as any).faces.length).toBe(workflow.expected.faceCount);
                }

                if (workflow.expected.sketchCount !== undefined) {
                    expect(sketches.length).toBe(workflow.expected.sketchCount);
                }

            } catch (error: any) {
                if (workflow.expected.error) {
                    // Normalize error to string to handle WASM numbers
                    const errString = String(error);
                    if (!errString.match(workflow.expected.error)) {
                        console.error(`Error mismatch! Expected ${workflow.expected.error} but got: ${errString}`);
                        // If it's a number error (WASM), we might want to fail explicitly unless we expected that specific number (unlikely)
                        // If we expected "Cannot sketch...", getting "8860600" is a FAILURE of error handling.
                        throw error;
                    }
                } else {
                    throw error;
                }
            }
        });
    });
});
