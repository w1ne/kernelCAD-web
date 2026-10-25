// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Task 3: tier-1 structural merge on feature id. Three-way, cell by cell, with
// typed conflicts. The merged source is generated from the head text plus the
// agent's operations, then re-captured; a mismatch is a conflict, never a
// silent merge.

import { stableStringify } from '../modeling/compute/prefixReuse';
import type { RequirementNode as RequirementNodeType, ChangeOp, ChangeSet, CollabConflict, FeatureGraph, FeatureId, FeatureNode, MergeResult, SourceSpan, UnownedSpan } from './types';
import { captureFeatureGraph } from './featureGraph';
import { liftChangeSet } from './changeSet';
import { CollabSpanIndex } from './sourceSpans';
import { applyTextEdits, featureParamRewrite, projectParamRewrite, statementIsReturn, statementText, type TextEdit } from './sourceMerge';

export interface MergeInput {
  baseSource: string;
  headSource: string;
  yoursSource: string;
  base: FeatureGraph;
  head: FeatureGraph;
  yours: ChangeSet;
}

interface MutableGraph {
  features: Map<FeatureId, FeatureNode>;
  order: FeatureId[];
  params: Record<string, unknown>;
  paramDeclarations?: Record<string, { type: string; meta?: Record<string, unknown> }>;
  requirements: Record<string, RequirementNodeType>;
  unowned: UnownedSpan[];
}

interface MergeContext {
  baseSource: string;
  headSource: string;
  yoursSource: string;
  base: FeatureGraph;
  head: FeatureGraph;
  yours: ChangeSet;
  merged: MutableGraph;
  edits: TextEdit[];
  conflicts: CollabConflict[];
  headOnly: Set<FeatureId>;
  yoursGraph?: FeatureGraph;
  getYoursGraph: () => Promise<FeatureGraph>;
}

function equal(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}

function cloneNode(node: FeatureNode): FeatureNode {
  return {
    ...node,
    params: { ...node.params },
    refs: Object.fromEntries(Object.entries(node.refs).map(([slot, ids]) => [slot, [...ids]])),
    ...(node.paramRefs !== undefined
      ? { paramRefs: Object.fromEntries(Object.entries(node.paramRefs).map(([k, v]) => [k, [...v]])) }
      : {}),
  };
}

function mutableFrom(graph: FeatureGraph): MutableGraph {
  return {
    features: new Map([...graph.features].map(([id, node]) => [id, cloneNode(node)])),
    order: [...graph.order],
    params: { ...graph.params },
    ...(graph.paramDeclarations !== undefined ? { paramDeclarations: structuredClone(graph.paramDeclarations) } : {}),
    requirements: structuredClone(graph.requirements),
    unowned: graph.unowned.map((span) => ({ ...span })),
  };
}

function nodeChanged(base: FeatureNode | undefined, head: FeatureNode | undefined): boolean {
  if (base === undefined || head === undefined) return base !== head;
  return !equal(
    { kind: base.kind, params: base.params, refs: base.refs },
    { kind: head.kind, params: head.params, refs: head.refs },
  );
}

/** The id preceded by `after` in `order`; an absent anchor means the head. */
function insertionIndex(order: readonly FeatureId[], after: FeatureId | null): number {
  if (after === null) return 0;
  const index = order.indexOf(after);
  return index < 0 ? 0 : index + 1;
}

function validateNumber(value: unknown, declaration: { meta?: Record<string, unknown> }): string | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'expected a finite number';
  const min = declaration.meta?.min;
  const max = declaration.meta?.max;
  if (typeof min === 'number' && value < min) return `value ${value} is below min ${min}`;
  if (typeof max === 'number' && value > max) return `value ${value} is above max ${max}`;
  return undefined;
}

function validateString(value: unknown, type: string, declaration: { meta?: Record<string, unknown> }): string | undefined {
  if (typeof value !== 'string') return 'expected a string';
  if (type !== 'choice') return undefined;
  const choices = declaration.meta?.choices;
  if (Array.isArray(choices) && !choices.includes(value)) return `'${value}' is not one of ${choices.join(', ')}`;
  return undefined;
}

function validateParam(name: string, value: unknown, declarations: MutableGraph['paramDeclarations']): string | undefined {
  const declaration = declarations?.[name];
  if (declaration === undefined) return undefined;
  if (declaration.type === 'number') return validateNumber(value, declaration);
  if (declaration.type === 'boolean') return typeof value === 'boolean' ? undefined : 'expected a boolean';
  return validateString(value, declaration.type, declaration);
}

function cycleIds(graph: MutableGraph): FeatureId[] {
  const state = new Map<FeatureId, 0 | 1 | 2>();
  const stack: FeatureId[] = [];
  let found: FeatureId[] | undefined;

  const visit = (id: FeatureId): boolean => {
    const current = state.get(id) ?? 0;
    if (current === 2) return false;
    if (current === 1) {
      const start = stack.indexOf(id);
      found = stack.slice(start < 0 ? 0 : start).concat(id);
      return true;
    }
    state.set(id, 1);
    stack.push(id);
    const node = graph.features.get(id);
    for (const refs of Object.values(node?.refs ?? {})) {
      for (const ref of refs) {
        if (!graph.features.has(ref)) continue;
        if (visit(ref)) return true;
      }
    }
    stack.pop();
    state.set(id, 2);
    return false;
  };

  for (const id of graph.order) {
    if (visit(id)) break;
  }
  return found ?? [];
}

function deletedRefConflicts(graph: MutableGraph): CollabConflict[] {
  const conflicts: CollabConflict[] = [];
  for (const id of graph.order) {
    const node = graph.features.get(id);
    if (node === undefined) continue;
    for (const [slot, refs] of Object.entries(node.refs)) {
      for (const ref of refs) {
        if (!graph.features.has(ref)) conflicts.push({ code: 'collab.conflict.deleted-ref', id, slot, deleted: ref });
      }
    }
  }
  return conflicts;
}

function forwardRefConflicts(graph: MutableGraph): CollabConflict[] {
  const index = new Map(graph.order.map((id, i) => [id, i]));
  for (const id of graph.order) {
    const node = graph.features.get(id);
    if (node === undefined) continue;
    for (const refs of Object.values(node.refs)) {
      for (const ref of refs) {
        if ((index.get(ref) ?? -1) >= (index.get(id) ?? -1)) return [{ code: 'collab.conflict.forward-ref', ids: [id, ref] }];
      }
    }
  }
  return [];
}

function checkStructural(graph: MutableGraph): CollabConflict[] {
  const deletedRefs = deletedRefConflicts(graph);
  if (deletedRefs.length > 0) return deletedRefs;
  const cycle = cycleIds(graph);
  if (cycle.length > 0) return [{ code: 'collab.conflict.cycle', ids: cycle }];
  return forwardRefConflicts(graph);
}

interface SemanticOp {
  [key: string]: unknown;
}

function semanticOp(op: ChangeOp): SemanticOp {
  if (op.op === 'insertFeature') {
    const node = { ...op.node } as Record<string, unknown>;
    delete node.sourceSpan;
    delete node.callSpan;
    delete node.orderKey;
    return { op: op.op, id: op.id, node };
  }
  if (op.op === 'editRequirement') {
    const strip = (value: unknown): unknown => {
      if (typeof value !== 'object' || value === null) return value;
      const rest = { ...(value as Record<string, unknown>) };
      delete rest.sourceSpan;
      return rest;
    };
    return { op: op.op, name: op.name, from: strip(op.from), to: strip(op.to) };
  }
  if (op.op === 'editUnowned') return { op: op.op };
  return { ...op } as SemanticOp;
}

function opsSignature(ops: readonly ChangeOp[]): string {
  return stableStringify(ops.map(semanticOp).sort((a, b) => stableStringify(a).localeCompare(stableStringify(b))));
}

function idsOf(ops: readonly ChangeOp[]): FeatureId[] {
  const ids = new Set<FeatureId>();
  for (const op of ops) {
    if (op.op === 'setParam') ids.add(op.target);
    else if (op.op === 'insertFeature' || op.op === 'deleteFeature' || op.op === 'setRef' || op.op === 'moveFeature') ids.add(op.id);
    else if (op.op === 'editRequirement') ids.add(`requirement:${op.name}`);
    else ids.add('$unowned');
  }
  return [...ids];
}

function stripTrailingNewline(source: string, span: SourceSpan): SourceSpan {
  let end = span.end;
  if (source[end] === '\n') end += 1;
  else if (source[end] === '\r' && source[end + 1] === '\n') end += 2;
  return { start: span.start, end };
}

function createContext(input: MergeInput): MergeContext {
  const ctx: MergeContext = {
    baseSource: input.baseSource,
    headSource: input.headSource,
    yoursSource: input.yoursSource,
    base: input.base,
    head: input.head,
    yours: input.yours,
    merged: mutableFrom(input.head),
    edits: [],
    conflicts: [],
    headOnly: new Set(input.head.order.filter((id) => !input.base.features.has(id))),
    getYoursGraph: async () => {
      ctx.yoursGraph ??= await captureFeatureGraph(ctx.yoursSource, { fileName: 'yours.kcad.ts' });
      return ctx.yoursGraph;
    },
  };
  return ctx;
}

function applyProjectParam(ctx: MergeContext, op: Extract<ChangeOp, { op: 'setParam' }>): void {
  const baseValue = ctx.base.params[op.name];
  const headValue = ctx.head.params[op.name];
  if (equal(headValue, op.to)) return;
  if (!equal(headValue, baseValue)) {
    ctx.conflicts.push({ code: 'collab.conflict.param', target: '$project', name: op.name, base: baseValue, head: headValue, yours: op.to });
    return;
  }
  const invalid = validateParam(op.name, op.to, ctx.merged.paramDeclarations);
  if (invalid !== undefined) {
    ctx.conflicts.push({ code: 'collab.conflict.invalid-value', target: '$project', name: op.name, reason: invalid });
    return;
  }
  const rewrite = projectParamRewrite(ctx.headSource, op.name, op.to);
  if (rewrite === undefined) {
    ctx.conflicts.push({ code: 'collab.conflict.invalid-value', target: '$project', name: op.name, reason: `could not rewrite param '${op.name}' in source` });
    return;
  }
  ctx.merged.params[op.name] = op.to;
  ctx.edits.push({ ...rewrite.span, text: rewrite.text });
}

function applyFeatureParam(ctx: MergeContext, op: Extract<ChangeOp, { op: 'setParam' }>): void {
  const baseNode = ctx.base.features.get(op.target);
  const headNode = ctx.head.features.get(op.target);
  if (headNode === undefined) {
    ctx.conflicts.push({ code: 'collab.conflict.same-feature', id: op.target });
    return;
  }
  const headValue = headNode.params[op.name];
  if (equal(headValue, op.to)) return;
  if (!equal(headValue, baseNode?.params[op.name])) {
    ctx.conflicts.push({ code: 'collab.conflict.param', target: op.target, name: op.name, base: baseNode?.params[op.name], head: headValue, yours: op.to });
    return;
  }
  const rewrite = featureParamRewrite(ctx.headSource, headNode, op.name, op.to);
  if (rewrite === undefined) {
    ctx.conflicts.push({ code: 'collab.conflict.invalid-value', target: op.target, name: op.name, reason: `could not rewrite ${op.name} inside ${op.target}'s statement` });
    return;
  }
  ctx.merged.features.get(op.target)!.params[op.name] = op.to;
  ctx.edits.push({ ...rewrite.span, text: rewrite.text });
}

function applySetParam(ctx: MergeContext, op: Extract<ChangeOp, { op: 'setParam' }>): void {
  if (op.target === '$project') applyProjectParam(ctx, op);
  else applyFeatureParam(ctx, op);
}

function mergedInsertionIndex(ctx: MergeContext, after: FeatureId | null): number {
  let index = insertionIndex(ctx.merged.order, after);
  while (index < ctx.merged.order.length && ctx.headOnly.has(ctx.merged.order[index]!)) index += 1;
  return index;
}

function returnInsertOffset(ctx: MergeContext, anchorSpan: SourceSpan | undefined): number {
  const spans = CollabSpanIndex.parse(ctx.headSource);
  return spans.returnStatementSpan()?.start ?? anchorSpan?.end ?? 0;
}

function afterHeadInsertsOffset(ctx: MergeContext, index: number, anchorSpan: SourceSpan | undefined): number {
  let offset = anchorSpan?.end ?? 0;
  for (let i = index - 1; i >= 0; i -= 1) {
    const id = ctx.merged.order[i]!;
    if (!ctx.headOnly.has(id)) continue;
    const span = ctx.head.features.get(id)?.sourceSpan;
    if (span !== undefined && span.start >= (anchorSpan?.start ?? 0)) offset = Math.max(offset, span.end);
  }
  return offset;
}

function insertOffset(
  ctx: MergeContext,
  op: Extract<ChangeOp, { op: 'insertFeature' }>,
  index: number,
  isReturn: boolean,
): number {
  const anchorSpan = op.after !== null ? ctx.head.features.get(op.after)?.sourceSpan : undefined;
  return isReturn ? returnInsertOffset(ctx, anchorSpan) : afterHeadInsertsOffset(ctx, index, anchorSpan);
}

function applyInsert(ctx: MergeContext, op: Extract<ChangeOp, { op: 'insertFeature' }>): void {
  if (ctx.head.features.has(op.id)) {
    const node = ctx.head.features.get(op.id)!;
    if (!equal({ params: node.params, refs: node.refs }, { params: op.node.params, refs: op.node.refs })) {
      ctx.conflicts.push({ code: 'collab.conflict.duplicate-id', ids: [op.id] });
    }
    return;
  }
  ctx.merged.features.set(op.id, cloneNode(op.node));
  const index = mergedInsertionIndex(ctx, op.after);
  ctx.merged.order.splice(index, 0, op.id);

  const statement = statementText(ctx.yoursSource, op.node.sourceSpan);
  const callText = op.node.callSpan !== undefined ? statementText(ctx.yoursSource, op.node.callSpan) : statement;
  const isReturn = statementIsReturn(ctx.yoursSource, op.node.sourceSpan);
  const insertText = isReturn ? callText : statement;
  const offset = insertOffset(ctx, op, index, isReturn);
  const prefix = offset === 0 || ctx.headSource[offset - 1] === '\n' ? '' : '\n';
  const suffix = isReturn ? ';\n' : '\n';
  ctx.edits.push({ start: offset, end: offset, text: `${prefix}${insertText}${suffix}` });
}

function applyDelete(ctx: MergeContext, op: Extract<ChangeOp, { op: 'deleteFeature' }>): void {
  const headNode = ctx.head.features.get(op.id);
  if (headNode === undefined) return;
  if (nodeChanged(ctx.base.features.get(op.id), headNode)) {
    ctx.conflicts.push({ code: 'collab.conflict.same-feature', id: op.id });
    return;
  }
  ctx.merged.features.delete(op.id);
  ctx.merged.order = ctx.merged.order.filter((id) => id !== op.id);
  ctx.edits.push({ ...stripTrailingNewline(ctx.headSource, headNode.sourceSpan), text: '' });
}

function applySetRef(ctx: MergeContext, op: Extract<ChangeOp, { op: 'setRef' }>): void {
  const headNode = ctx.head.features.get(op.id);
  if (headNode === undefined) {
    ctx.conflicts.push({ code: 'collab.conflict.same-feature', id: op.id });
    return;
  }
  const baseRefs = ctx.base.features.get(op.id)?.refs[op.slot] ?? [];
  const headRefs = headNode.refs[op.slot] ?? [];
  if (equal(headRefs, op.to)) return;
  if (!equal(headRefs, baseRefs)) {
    ctx.conflicts.push({ code: 'collab.conflict.same-feature', id: op.id });
    return;
  }
  const target = ctx.merged.features.get(op.id);
  if (target === undefined) {
    ctx.conflicts.push({ code: 'collab.conflict.same-feature', id: op.id });
    return;
  }
  target.refs[op.slot] = [...op.to];
}

function applyMove(ctx: MergeContext, op: Extract<ChangeOp, { op: 'moveFeature' }>): void {
  const headNode = ctx.head.features.get(op.id);
  if (headNode === undefined) {
    ctx.conflicts.push({ code: 'collab.conflict.same-feature', id: op.id });
    return;
  }
  const baseIndex = ctx.base.order.indexOf(op.id);
  const headIndex = ctx.head.order.indexOf(op.id);
  if (baseIndex >= 0 && headIndex >= 0 && baseIndex !== headIndex) {
    const expected = insertionIndex(ctx.head.order.filter((id) => id !== op.id), op.after);
    if (expected !== headIndex) {
      ctx.conflicts.push({ code: 'collab.conflict.same-feature', id: op.id });
      return;
    }
  }
  ctx.merged.order = ctx.merged.order.filter((id) => id !== op.id);
  ctx.merged.order.splice(insertionIndex(ctx.merged.order, op.after), 0, op.id);
  if (statementIsReturn(ctx.headSource, headNode.sourceSpan)) return;
  const text = statementText(ctx.headSource, headNode.sourceSpan);
  ctx.edits.push({ ...stripTrailingNewline(ctx.headSource, headNode.sourceSpan), text: '' });
  const anchorSpan = op.after !== null ? ctx.head.features.get(op.after)?.sourceSpan : undefined;
  const offset = anchorSpan?.end ?? 0;
  const prefix = offset === 0 || ctx.headSource[offset - 1] === '\n' ? '' : '\n';
  ctx.edits.push({ start: offset, end: offset, text: `${prefix}${text}\n` });
}

function applyRequirement(ctx: MergeContext, op: Extract<ChangeOp, { op: 'editRequirement' }>): void {
  const baseReq = ctx.base.requirements[op.name];
  const headReq = ctx.head.requirements[op.name];
  if (equal(headReq, op.to)) return;
  if (!equal(headReq, baseReq)) {
    ctx.conflicts.push({ code: 'collab.conflict.same-feature', id: `requirement:${op.name}` });
    return;
  }
  ctx.merged.requirements[op.name] = structuredClone(op.to as RequirementNodeType);
  const to = op.to as RequirementNodeType | undefined;
  if (headReq?.sourceSpan !== undefined && to?.sourceSpan !== undefined) {
    ctx.edits.push({ ...headReq.sourceSpan, text: ctx.yoursSource.slice(to.sourceSpan.start, to.sourceSpan.end) });
  }
}

async function applyUnowned(ctx: MergeContext, op: Extract<ChangeOp, { op: 'editUnowned' }>): Promise<void> {
  const graph = await ctx.getYoursGraph();
  const index = graph.unowned.findIndex((span) => span.start === op.span.start && span.end === op.span.end);
  const baseSpan = ctx.base.unowned[index];
  const headSpan = ctx.head.unowned[index];
  const yoursSpan = graph.unowned[index];
  if (index < 0 || baseSpan === undefined || headSpan === undefined || yoursSpan === undefined) {
    ctx.conflicts.push({ code: 'collab.conflict.unowned', span: op.span });
    return;
  }
  if (headSpan.text === yoursSpan.text) return;
  if (headSpan.text !== baseSpan.text) {
    ctx.conflicts.push({ code: 'collab.conflict.unowned', span: { start: headSpan.start, end: headSpan.end } });
    return;
  }
  ctx.edits.push({ ...headSpan, text: yoursSpan.text ?? '' });
}

async function applyOp(ctx: MergeContext, op: ChangeOp): Promise<void> {
  switch (op.op) {
    case 'setParam':
      return applySetParam(ctx, op);
    case 'deleteFeature':
      return applyDelete(ctx, op);
    case 'insertFeature':
      return applyInsert(ctx, op);
    case 'setRef':
      return applySetRef(ctx, op);
    case 'moveFeature':
      return applyMove(ctx, op);
    case 'editRequirement':
      return applyRequirement(ctx, op);
    case 'editUnowned':
      return applyUnowned(ctx, op);
  }
}

/** Ops whose effect head already has are not part of this merge's write. */
function effectiveOps(ops: readonly ChangeOp[], head: FeatureGraph): ChangeOp[] {
  return ops.filter((op) => {
    switch (op.op) {
      case 'setParam':
        if (op.target === '$project') return !equal(head.params[op.name], op.to);
        return !equal(head.features.get(op.target)?.params[op.name], op.to);
      case 'insertFeature': {
        const node = head.features.get(op.id);
        if (node === undefined) return true;
        return !equal({ params: node.params, refs: node.refs }, { params: op.node.params, refs: op.node.refs });
      }
      case 'deleteFeature':
        return head.features.has(op.id);
      case 'setRef':
        return !equal(head.features.get(op.id)?.refs[op.slot] ?? [], op.to);
      case 'moveFeature':
        return true;
      case 'editRequirement':
        return !equal(head.requirements[op.name], op.to);
      case 'editUnowned':
        return true;
    }
  });
}

async function finalizeMerge(ctx: MergeContext): Promise<MergeResult> {
  if (ctx.conflicts.length > 0) return { status: 'conflict', conflicts: ctx.conflicts };
  const structural = checkStructural(ctx.merged);
  if (structural.length > 0) return { status: 'conflict', conflicts: structural };

  const mergedSource = applyTextEdits(ctx.headSource, ctx.edits);
  let mergedGraph: FeatureGraph;
  try {
    mergedGraph = await captureFeatureGraph(mergedSource, { fileName: 'merged.kcad.ts' });
  } catch (err) {
    return {
      status: 'conflict',
      conflicts: [{ code: 'collab.conflict.same-feature', id: err instanceof Error ? err.message : '$merged' }],
    };
  }

  const derived = liftChangeSet(ctx.head, mergedGraph, {
    baseRevision: ctx.yours.baseRevision,
    agentId: ctx.yours.agentId,
    idempotencyKey: ctx.yours.idempotencyKey,
  });
  const expected = effectiveOps(ctx.yours.ops, ctx.head);
  if (opsSignature(derived.ops) !== opsSignature(expected)) {
    const ids = [...new Set([...idsOf(derived.ops), ...idsOf(expected)])];
    return {
      status: 'conflict',
      conflicts: (ids.length > 0 ? ids : ['$merged']).map((id) => ({ code: 'collab.conflict.same-feature', id })),
    };
  }

  return { status: 'merged', source: mergedSource, graph: mergedGraph, rebased: ctx.head.revisionHash !== ctx.base.revisionHash };
}

export async function mergeChangeSet(input: MergeInput): Promise<MergeResult> {
  const ctx = createContext(input);
  for (const op of input.yours.ops) await applyOp(ctx, op);
  return finalizeMerge(ctx);
}
