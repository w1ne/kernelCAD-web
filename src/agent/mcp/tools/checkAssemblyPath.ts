// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { evaluateAndBuildScript, type EvaluateInput } from '../../cli/commands/evaluate';
import { isSceneBackend, type SceneBackend } from '../../../kernel/backends/sceneBackend';
import { checkAssemblyPathScene } from '../../../modeling/runtime/assemblyPathScene';
import type { AssemblyPathOptions, AssemblyPathReport } from '../../../modeling/runtime/assemblyPath';
import type { SubassemblyInput } from '../../../modeling/runtime/assemblySequence';
import { parseConnectorRef } from '../../../modeling/mates/mate';
import type { BuiltModel } from '../../../modeling/buildModel';
import type { Assembly } from '../../../modeling/capture/assembly';
export interface CheckAssemblyPathInput extends EvaluateInput, AssemblyPathOptions {
    assembly?: string;
}
export type CheckAssemblyPathOutput = AssemblyPathReport | {
    ok: false;
    source: 'local';
    error: string;
    errorCode?: string;
};
/** Pick the one assembly scene the caller means from a built model. */
function selectAssemblyScene(candidates: unknown[], assembly: string | undefined): SceneBackend {
    const selected = new Map<string, SceneBackend>();
    for (const scene of candidates.filter((shape): shape is SceneBackend => isSceneBackend(shape)))
        if (!selected.has(scene.assemblyName))
            selected.set(scene.assemblyName, scene);
    const unique = [...selected.values()];
    if (assembly === undefined && unique.length !== 1)
        throw new Error('assembly-path requires exactly one assembly, or an explicit assembly name.');
    const scene = assembly === undefined ? unique[0] : unique.find(s => s.assemblyName === assembly);
    if (!scene)
        throw new Error(`Assembly '${assembly}' not found.`);
    return scene;
}
/** Catalog families whose removal needs the helical motion P2 adds. */
const THREADED_FASTENER_FAMILY = /(screw|bolt|threaded|nut|stud)/i;
/** Name every threaded catalog fastener in the selected assembly. */
function threadedFastenerNames(model: BuiltModel, assemblyName: string): string[] {
    const arm = model.session.assemblies.get(assemblyName) as Assembly | undefined;
    if (!arm)
        return [];
    return arm.__parts().flatMap(part => {
        const record = model.records.find(candidate => candidate.id === part.originalShape.id);
        const family = record?.metadata?.catalogPart?.family;
        return family !== undefined && THREADED_FASTENER_FAMILY.test(family) ? [part.name] : [];
    });
}
interface UnionFind {
    find(name: string): string;
    join(a: string, b: string): void;
}
function fixedUnionFind(threaded: ReadonlySet<string>): UnionFind {
    const parent = new Map<string, string>();
    const find = (name: string): string => {
        const root = parent.get(name);
        if (root === undefined || root === name)
            return name;
        const resolved = find(root);
        parent.set(name, resolved);
        return resolved;
    };
    const join = (a: string, b: string): void => {
        if (threaded.has(a) || threaded.has(b))
            return;
        const ra = find(a), rb = find(b);
        if (ra !== rb)
            parent.set(ra < rb ? rb : ra, ra < rb ? ra : rb);
    };
    return { find, join };
}
function unionPlacements(arm: Assembly, union: UnionFind): void {
    const parts = arm.__parts();
    const byId = new Map(parts.map(part => [part.id, part.name]));
    for (const part of parts) {
        const parentName = part.connectParentId !== undefined ? byId.get(part.connectParentId) : undefined;
        if (parentName !== undefined)
            union.join(part.name, parentName);
    }
}
function unionFastenedMates(arm: Assembly, union: UnionFind): void {
    for (const mate of arm.__mates())
        if (mate.type === 'fastened')
            union.join(parseConnectorRef(mate.a).partName, parseConnectorRef(mate.b).partName);
}
function unionFixedConnects(arm: Assembly, union: UnionFind): void {
    for (const record of arm.__session().getRecords()) {
        if (record.kind !== 'assemblyConnect' || record.metadata?.assemblyName !== arm.name)
            continue;
        const a = record.metadata.a as { partName?: unknown } | undefined;
        const b = record.metadata.b as { partName?: unknown } | undefined;
        if (typeof a?.partName === 'string' && typeof b?.partName === 'string')
            union.join(a.partName, b.partName);
    }
}
/** Union parts connected by a fastened mate or a fixed `connect`. */
function fixedMateClusters(arm: Assembly, threaded: ReadonlySet<string>): SubassemblyInput[] {
    const union = fixedUnionFind(threaded);
    unionPlacements(arm, union);
    unionFastenedMates(arm, union);
    unionFixedConnects(arm, union);
    const clusters = new Map<string, string[]>();
    for (const part of arm.__parts()) {
        if (threaded.has(part.name))
            continue;
        const root = union.find(part.name);
        const members = clusters.get(root) ?? [];
        members.push(part.name);
        clusters.set(root, members);
    }
    return [...clusters.values()]
        .filter(members => members.length >= 2)
        .map(members => members.sort((a, b) => a.localeCompare(b)))
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map((members, index) => ({ name: `subassembly-${index + 1}-${members[0]}`, parts: members }));
}
/** Script-aware entrypoint for verify({ check: 'assembly-path' }). */
export async function checkAssemblyPathTool(input: CheckAssemblyPathInput): Promise<CheckAssemblyPathOutput> {
    try {
        if (input.assembly !== undefined && (typeof input.assembly !== 'string' || !input.assembly))
            throw new Error('assembly must be a nonempty name.');
        const { evaluation, model } = await evaluateAndBuildScript(input);
        if (evaluation.exitCode !== 0 || !model)
            return { ok: false, source: 'local', error: evaluation.diagnostics[0]?.message ?? 'Script evaluation failed.', errorCode: evaluation.diagnostics[0]?.code };
        const scene = selectAssemblyScene([model.rootShape, ...[...model.shapes.values()].reverse()], input.assembly);
        const threadedFasteners = [...new Set([...(input.threadedFasteners ?? []), ...threadedFastenerNames(model, scene.assemblyName)])];
        const arm = model.session.assemblies.get(scene.assemblyName) as Assembly | undefined;
        const subassemblies = input.subassemblies ?? (arm ? fixedMateClusters(arm, new Set(threadedFasteners)) : undefined);
        return checkAssemblyPathScene(scene, { ...input, threadedFasteners, ...(subassemblies ? { subassemblies } : {}) });
    }
    catch (error) {
        return { ok: false, source: 'local', error: error instanceof Error ? error.message : String(error), errorCode: 'feature.invalid-args' };
    }
}
