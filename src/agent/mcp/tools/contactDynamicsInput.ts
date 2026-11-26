// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { validateContactDynamicsStudyInput, type ContactDynamicsStudyInput, type ContactModel,
    type ContactPairRequirement } from '../../../modeling/runtime/contactDynamics';

function record(value: unknown, name: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid ${name} object.`);
    return value as Record<string, unknown>;
}

function pairRequirement(value: unknown): ContactPairRequirement {
    const pair = record(value, 'contact pair');
    return {
        bodies: pair.bodies as [string, string],
        minEpisodes: pair.min_episodes as number,
        maxPenetrationMm: pair.max_penetration_mm as number,
        maxNormalForceN: pair.max_normal_force_n as number | undefined,
        minNormalForceN: pair.min_normal_force_n as number | undefined,
    };
}

/** Translate the snake_case tool contract once; runtime APIs retain TypeScript naming. */
export function parseContactDynamicsToolInput(value: unknown): ContactDynamicsStudyInput {
    const input = record(value, 'dynamics');
    if (!Array.isArray(input.pairs)) throw new Error('Dynamics requires an array of contact pairs.');
    const sequence = input.sequence === undefined ? undefined : record(input.sequence, 'contact sequence');
    const study: ContactDynamicsStudyInput = {
        steps: input.steps as number,
        dtSeconds: input.dt_seconds as number,
        efforts: input.efforts as Record<string, number>,
        pairs: input.pairs.map(pairRequirement),
        contactModel: input.contact_model as ContactModel | undefined,
        sequence: sequence === undefined ? undefined : {
            order: sequence.order as number[], minCycles: sequence.min_cycles as number,
        },
    };
    validateContactDynamicsStudyInput(study);
    return study;
}
