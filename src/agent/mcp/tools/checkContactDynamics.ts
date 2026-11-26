// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Assembly } from '../../../modeling/capture/assembly';
import { assemblyToMjcf } from '../../../modeling/runtime/mjcfExport';
import { loadMujocoSession } from '../../../modeling/runtime/mujocoSession';
import { runContactDynamics, validateContactDynamicsInput, type ContactDynamicsInput,
    type ContactDynamicsResult, type ContactModel } from '../../../modeling/runtime/contactDynamics';

export type CheckContactDynamicsOutput =
    | (ContactDynamicsResult & { source: 'local'; mode: 'contact-dynamics'; inertiaNotes: readonly string[]; contactModel: ContactModel; assumedDensityParts: readonly string[] })
    | { ok: false; source: 'local'; mode: 'contact-dynamics'; error: string };

export async function checkContactDynamics(arm: Assembly, input: ContactDynamicsInput): Promise<CheckContactDynamicsOutput> {
    try {
        validateContactDynamicsInput(input);
        // Only accept non-lossy scalar/fixed joints in this first dynamics gate.
        const unsupported = arm.__mates().find((mate) => !['revolute', 'prismatic', 'fastened'].includes(mate.type));
        if (unsupported) throw new Error(`Unsupported dynamics mate: ${unsupported.name} (${unsupported.type}).`);
        // Intended contact geometry must be explicit, rather than a silent whole-part hull.
        const parts = new Map(arm.__parts().map((part) => [part.name, part]));
        for (const pair of input.pairs) for (const name of pair.bodies) {
            const part = parts.get(name);
            if (!part || part.collisionShapes.length === 0) {
                throw new Error(`Contact body "${name}" needs explicit part.collision([...]) convex pieces.`);
            }
        }
        const contactModel: ContactModel = input.contactModel ?? {
            friction: [1, 0.005, 0.0001], solref: [0.02, 1], solimp: [0.9, 0.95, 0.001],
        };
        const exported = await assemblyToMjcf(arm, { contactModel });
        if (exported.inertiaNotes.length > 0) throw new Error(`Unverified corrected inertia: ${exported.inertiaNotes.join('; ')}`);
        // Expose CAD mate names, not implementation-specific MJCF joint aliases.
        const efforts: Record<string, number> = Object.create(null);
        for (const [name, effort] of Object.entries(input.efforts)) {
            const matches = exported.jointOrder.filter((joint) => joint.mateName === name);
            if (matches.length !== 1) throw new Error(`Expected one compiled scalar joint for mate "${name}".`);
            efforts[matches[0].mjcfName] = effort;
        }
        const session = await loadMujocoSession(exported.mjcf, exported.bodyOrder, exported.jointOrder);
        try {
            const geoms = session.compiledGeoms();
            for (const part of parts.values()) {
                const expected = Math.max(1, part.collisionShapes.length);
                const actual = geoms.filter((geom) => geom.body === part.name && geom.group === 1 && geom.type === 'mesh').length;
                if (actual !== expected) throw new Error(`Incomplete collision geometry for "${part.name}": ${actual}/${expected} pieces.`);
            }
            const result = runContactDynamics(session, { ...input, efforts });
            const assumedDensityParts = [...parts.values()].filter((p) => p.massKg === undefined && p.density === undefined).map(p => p.name);
            return { ...result, source: 'local', mode: 'contact-dynamics', inertiaNotes: exported.inertiaNotes,
                contactModel, assumedDensityParts };
        } finally { session.dispose(); }
    } catch (error) {
        return { ok: false, source: 'local', mode: 'contact-dynamics', error: error instanceof Error ? error.message : String(error) };
    }
}
