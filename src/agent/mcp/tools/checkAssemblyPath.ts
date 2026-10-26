// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { evaluateAndBuildScript, type EvaluateInput } from '../../cli/commands/evaluate';
import { isSceneBackend, type SceneBackend } from '../../../kernel/backends/sceneBackend';
import { checkAssemblyPathScene } from '../../../modeling/runtime/assemblyPathScene';
import type { AssemblyPathOptions, AssemblyPathReport } from '../../../modeling/runtime/assemblyPath';
import type { SubassemblyInput } from '../../../modeling/runtime/assemblySequence';
import type { FastenerMotionInput, FitInput, ToolEnvelope } from '../../../modeling/runtime/assemblyFastener';
import { assemblyRequirementEntries } from '../../../modeling/requirements/assemblyLedger';
import { ledgerFromEntries } from '../../../shared/intent/requirementRecord';
import { defaultToolEnvelope } from '../../../modeling/runtime/assemblyFastener';
import { parseConnectorRef, type MateRecord } from '../../../modeling/mates/mate';
import { coarsePitchOf } from '../../../modeling/parts/fastenerIsoDims';
import { Transform } from '../../../shared/runtime/se3';
import type { Vec3 } from '../../../shared/intent/types';
import { resolveParams } from '../../../shared/runtime/resolveParams';
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
/** World placement of a scene part: world = worldTransform · T(at). */
function partPlacement(model: BuiltModel, scene: readonly { name: string; worldTransform: Transform }[], arm: Assembly, name: string): Transform | undefined {
    const placed = scene.find(part => part.name === name);
    const stored = arm.__parts().find(part => part.name === name);
    if (!placed || !stored)
        return undefined;
    const at = resolveParams(stored.at, model.session.paramTable);
    return placed.worldTransform.compose(Transform.translation(at.x.evaluated, at.y.evaluated, at.z.evaluated));
}
function localConnectorVector(scene: readonly { name: string; connectors?: readonly { name: string; type: string; axis?: Vec3; normal?: Vec3 }[] }[], part: string, connectorName: string): Vec3 | undefined {
    const connector = scene.find(candidate => candidate.name === part)?.connectors?.find(candidate => candidate.name === connectorName);
    if (!connector)
        return undefined;
    return connector.type === 'axis' ? connector.axis : connector.normal;
}
/** Prefer an outward catalog connector before the mating connector, whose
 *  frame normal often points into the part. */
function outwardConnectorVector(scene: readonly { name: string; connectors?: readonly { name: string; type: string; axis?: Vec3; normal?: Vec3 }[] }[], part: string): Vec3 | undefined {
    for (const name of ['head-top', 'top-face', 'second-end', 'axis']) {
        const vector = localConnectorVector(scene, part, name);
        if (vector)
            return vector;
    }
    return undefined;
}
function catalogAttribute(attributes: Readonly<Record<string, number | string>> | undefined, key: string): number | undefined {
    const value = attributes?.[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
function catalogPitch(attributes: Readonly<Record<string, number | string>> | undefined): number | undefined {
    const declared = catalogAttribute(attributes, 'pitchMm');
    if (declared !== undefined)
        return declared;
    const thread = attributes?.thread;
    if (typeof thread !== 'string' || !/^M\d/i.test(thread))
        return undefined;
    try {
        return coarsePitchOf(thread);
    }
    catch {
        return undefined;
    }
}
interface DerivedFastenerMetadata {
    fasteners: Record<string, FastenerMotionInput>;
    fits: Record<string, FitInput>;
}
type ScenePartLike = { name: string; worldTransform: Transform; connectors?: readonly { name: string; type: string; axis?: Vec3; normal?: Vec3 }[] };

function catalogForPart(model: BuiltModel, arm: Assembly, partName: string) {
    const stored = arm.__parts().find(part => part.name === partName);
    const record = stored ? model.records.find(candidate => candidate.id === stored.originalShape.id) : undefined;
    return record?.metadata?.catalogPart;
}
function fastenerPartOf(
    mate: { name: string; a: string; b: string; fastener?: { part?: string } },
    threaded: ReadonlySet<string>,
    endpoints: Set<string>,
): string | undefined {
    if (mate.fastener === undefined) return undefined;
    const aPart = parseConnectorRef(mate.a).partName;
    const bPart = parseConnectorRef(mate.b).partName;
    const part = mate.fastener.part ?? (threaded.has(aPart) ? aPart : threaded.has(bPart) ? bPart : aPart);
    if (!endpoints.has(part))
        throw new Error(`fastener metadata on mate '${mate.name}' names '${part}', which is not an endpoint.`);
    return part;
}
function fastenerLocalAxis(
    mate: { name: string; a: string; b: string; fastener?: { axis?: Vec3 } },
    scene: readonly ScenePartLike[],
    part: string,
): Vec3 {
    const connectorName = parseConnectorRef(mate.a).partName === part ? parseConnectorRef(mate.a).connectorName : parseConnectorRef(mate.b).connectorName;
    const axis = mate.fastener?.axis ?? outwardConnectorVector(scene, part) ?? localConnectorVector(scene, part, connectorName);
    if (!axis)
        throw new Error(`fastener metadata on mate '${mate.name}' has no axis and part '${part}' has no usable connector.`);
    return axis;
}
function fastenerTool(
    declared: ToolEnvelope | null | undefined,
    catalog: { family?: string; standard?: string; attributes: Readonly<Record<string, number | string>> } | undefined,
): ToolEnvelope | null | undefined {
    if (declared !== undefined || catalog === undefined) return declared;
    return defaultToolEnvelope({
        family: catalog.family,
        standard: catalog.standard,
        thread: typeof catalog.attributes.thread === 'string' ? catalog.attributes.thread : undefined,
        acrossFlatsMm: catalogAttribute(catalog.attributes, 'acrossFlatsMm'),
    });
}
function deriveFastenerForMate(
    model: BuiltModel,
    scene: readonly ScenePartLike[],
    arm: Assembly,
    mate: MateRecord,
    threaded: ReadonlySet<string>,
): { part: string; motion: FastenerMotionInput } | undefined {
    if (mate.type !== 'fastened' || mate.fastener === undefined) return undefined;
    const endpoints = new Set([parseConnectorRef(mate.a).partName, parseConnectorRef(mate.b).partName]);
    const part = fastenerPartOf(mate, threaded, endpoints)!;
    const placement = partPlacement(model, scene, arm, part);
    if (!placement)
        throw new Error(`fastener metadata on mate '${mate.name}' cannot place part '${part}'.`);
    const catalog = catalogForPart(model, arm, part);
    const pitchMm = mate.fastener.pitchMm ?? catalogPitch(catalog?.attributes);
    if (pitchMm === undefined)
        throw new Error(`fastener metadata on mate '${mate.name}' needs pitchMm; catalog part '${part}' has no coarse pitch.`);
    const threadLengthMm = mate.fastener.threadLengthMm ?? catalogAttribute(catalog?.attributes, 'threadLengthMm');
    return {
        part,
        motion: {
            axis: [...placement.axisDir(fastenerLocalAxis(mate, scene, part))] as Vec3,
            pitchMm,
            ...(mate.fastener.handedness !== undefined ? { handedness: mate.fastener.handedness } : {}),
            ...(threadLengthMm !== undefined ? { threadLengthMm } : {}),
            ...(mate.fastener.standard !== undefined
                ? { standard: mate.fastener.standard }
                : catalog?.standard !== undefined ? { standard: catalog.standard } : {}),
            ...(fastenerTool(mate.fastener.tool, catalog) !== undefined
                ? { tool: fastenerTool(mate.fastener.tool, catalog) }
                : {}),
        },
    };
}
function deriveFitForMate(
    model: BuiltModel,
    scene: readonly ScenePartLike[],
    arm: Assembly,
    mate: { name: string; a: string; b: string; fit?: { kind: 'press' | 'snap'; part?: string; axis?: Vec3 } },
    fastenerPart: string | undefined,
): { part: string; fit: FitInput } | undefined {
    if (mate.fit === undefined) return undefined;
    const endpoints = new Set([parseConnectorRef(mate.a).partName, parseConnectorRef(mate.b).partName]);
    const part = mate.fit.part ?? fastenerPart ?? parseConnectorRef(mate.b).partName;
    if (!endpoints.has(part))
        throw new Error(`fit metadata on mate '${mate.name}' names '${part}', which is not an endpoint.`);
    if (mate.fit.axis === undefined)
        return { part, fit: { kind: mate.fit.kind } };
    const placement = partPlacement(model, scene, arm, part);
    if (!placement)
        throw new Error(`fit metadata on mate '${mate.name}' cannot place part '${part}'.`);
    return { part, fit: { kind: mate.fit.kind, axis: [...placement.axisDir(mate.fit.axis)] as Vec3 } };
}
/** Derive P2 planner metadata from fastened mates and catalog identity. */
function derivedFastenerMetadata(
    model: BuiltModel,
    scene: readonly ScenePartLike[],
    arm: Assembly,
    threaded: ReadonlySet<string>,
): DerivedFastenerMetadata {
    const fasteners: Record<string, FastenerMotionInput> = {};
    const fits: Record<string, FitInput> = {};
    for (const mate of arm.__mates()) {
        if (mate.type !== 'fastened')
            continue;
        const fastener = deriveFastenerForMate(model, scene, arm, mate, threaded);
        if (fastener !== undefined)
            fasteners[fastener.part] = fastener.motion;
        const fit = deriveFitForMate(model, scene, arm, mate, fastener?.part);
        if (fit !== undefined)
            fits[fit.part] = fit.fit;
    }
    return { fasteners, fits };
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
function checkAssemblyPathForModel(
    model: BuiltModel,
    scene: ReturnType<typeof selectAssemblyScene>,
    input: CheckAssemblyPathInput,
): AssemblyPathReport {
    const arm = model.session.assemblies.get(scene.assemblyName) as Assembly | undefined;
    const catalogThreaded = threadedFastenerNames(model, scene.assemblyName);
    const derived = arm
        ? derivedFastenerMetadata(model, scene.parts, arm, new Set([...(input.threadedFasteners ?? []), ...catalogThreaded]))
        : { fasteners: {}, fits: {} };
    const explicitFasteners = Array.isArray(input.fasteners) ? {} : input.fasteners ?? {};
    const fasteners = { ...derived.fasteners, ...explicitFasteners };
    const fits = { ...derived.fits, ...(input.fits ?? {}) };
    const threadedFasteners = [...new Set([...(input.threadedFasteners ?? []), ...catalogThreaded, ...Object.keys(fasteners)])];
    const subassemblies = input.subassemblies ?? (arm ? fixedMateClusters(arm, new Set(threadedFasteners)) : undefined);
    return checkAssemblyPathScene(scene, {
        ...input,
        threadedFasteners,
        ...(Object.keys(fasteners).length > 0 ? { fasteners } : {}),
        ...(Object.keys(fits).length > 0 ? { fits } : {}),
        ...(subassemblies ? { subassemblies } : {}),
    });
}
function withAssemblyRequirements(report: AssemblyPathReport): AssemblyPathReport {
    const entries = assemblyRequirementEntries(report);
    return entries.length > 0 ? { ...report, requirements: ledgerFromEntries(entries) } : report;
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
        return withAssemblyRequirements(checkAssemblyPathForModel(model, scene, input));
    }
    catch (error) {
        return { ok: false, source: 'local', error: error instanceof Error ? error.message : String(error), errorCode: 'feature.invalid-args' };
    }
}
