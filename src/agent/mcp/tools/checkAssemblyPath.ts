// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { evaluateAndBuildScript, type EvaluateInput } from '../../cli/commands/evaluate';
import { isSceneBackend, type SceneBackend } from '../../../kernel/backends/sceneBackend';
import { checkAssemblyPathScene } from '../../../modeling/runtime/assemblyPathScene';
import type { AssemblyPathOptions, AssemblyPathReport } from '../../../modeling/runtime/assemblyPath';
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
        return checkAssemblyPathScene(scene, { ...input, threadedFasteners });
    }
    catch (error) {
        return { ok: false, source: 'local', error: error instanceof Error ? error.message : String(error), errorCode: 'feature.invalid-args' };
    }
}
