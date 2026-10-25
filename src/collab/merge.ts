// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Task 3: tier-1 structural merge on feature id. Three-way, cell by cell, with
// typed conflicts. The merged source is generated from the head text plus the
// agent's operations, then re-captured; a mismatch is a conflict, never a
// silent merge.

import { stableStringify } from '../modeling/compute/prefixReuse';
import type {
  ChangeOp,
  ChangeSet,
  CollabConflict,
  FeatureGraph,
  FeatureId,
  FeatureNode,
  MergeResult,
  RequirementNode as RequirementNodeType,
  SourceSpan,
  UnownedSpan,
} from './types';
import { captureFeatureGraph } from './featureGraph';
import { liftChangeSet } from './changeSet';
import { CollabSpanIndex } from './sourceSpans';
import {
  applyTextEdits,
  featureParamRewrite,
  projectParamRewrite,
  statementIsReturn,
  statementText,
  type TextEdit,
} from './sourceMerge';

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
    ...(graph.paramDeclarations !== undefined
      ? { paramDeclarations: structuredClone(graph.paramDeclarations) }
      : {}),
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

function validateParam(
  name: string,
  value: unknown,
  declarations: MutableGraph['paramDeclarations'],
): string | undefined {
  const declaration = declarations?.[name];
  if (declaration === undefined) return undefined;
  if (declaration.type === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) return `${name} must be a finite number`;
    const min = declaration.meta?.min;
    const max = declaration.meta?.max;
    if (typeof min === 'number' && value < min) return `${name}=${value} is below min ${min}`;
    if (typeof max === 'number' && value > max) return `${name}=${value} is above max ${max}`;
    return undefined;
  }
  if (declaration.type === 'boolean') {
    return typeof value === 'boolean' ? undefined : `${name} must be a boolean`;
  }
  if (typeof value !== 'string') return `${name} must be a string`;
  if (declaration.type === 'choice') {
    const choices = declaration.meta?.choices;
    if (Array.isArray(choices) && !choices.includes(value)) {
      return `${name}='${value}' is not one of ${choices.join(', ')}`;
    }
  }
  return undefined;
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

function checkStructural(graph: MutableGraph): CollabConflict[] {
  const conflicts: CollabConflict[] = [];

  for (const id of graph.order) {
    const node = graph.features.get(id);
    if (node === undefined) continue;
    for (const [slot, refs] of Object.entries(node.refs)) {
      for (const ref of refs) {
        if (!graph.features.has(ref)) {
          conflicts.push({ code: 'collab.conflict.deleted-ref', id, slot, deleted: ref });
        }
      }
    }
  }
  if (conflicts.length > 0) return conflicts;

  const cycle = cycleIds(graph);
  if (cycle.length > 0) return [{ code: 'collab.conflict.cycle', ids: cycle }];

  const index = new Map(graph.order.map((id, i) => [id, i]));
  for (const id of graph.order) {
    const node = graph.features.get(id);
    if (node === undefined) continue;
    for (const refs of Object.values(node.refs)) {
      for (const ref of refs) {
        if ((index.get(ref) ?? -1) >= (index.get(id) ?? -1)) {
          return [{ code: 'collab.conflict.forward-ref', ids: [id, ref] }];
        }
      }
    }
  }
  return conflicts;
}

interface SemanticOp {
  [key: string]: unknown;
}

function semanticOp(op: ChangeOp): SemanticOp {
  switch (op.op) {
    case 'insertFeature': {
      const node = { ...op.node } as Record<string, unknown>;
      delete node.sourceSpan;
      delete node.callSpan;
      delete node.orderKey;
      // Insert anchors are normalized through the merged order: head's own
      // insertions after the same anchor stay first, so the raw `after` id can
      // legitimately differ after re-lifting head→merged.
      return { op: op.op, id: op.id, node };
    }
    case 'editRequirement': {
      const strip = (value: unknown): unknown => {
        if (typeof value !== 'object' || value === null) return value;
        const rest = { ...(value as Record<string, unknown>) };
        delete rest.sourceSpan;
        return rest;
      };
      return { op: op.op, name: op.name, from: strip(op.from), to: strip(op.to) };
    }
    case 'editUnowned':
      return { op: op.op };
    default:
      return { ...op } as SemanticOp;
  }
}

function opsSignature(ops: readonly ChangeOp[]): string {
  return stableStringify(ops.map(semanticOp).sort((a, b) => stableStringify(a).localeCompare(stableStringify(b))));
}

function idsOf(ops: readonly ChangeOp[]): FeatureId[] {
  const ids = new Set<FeatureId>();
  for (const op of ops) {
    switch (op.op) {
      case 'setParam':
        ids.add(op.target);
        break;
      case 'insertFeature':
      case 'deleteFeature':
      case 'setRef':
      case 'moveFeature':
        ids.add(op.id);
        break;
      case 'editRequirement':
        ids.add(`requirement:${op.name}`);
        break;
      case 'editUnowned':
        ids.add('$unowned');
        break;
    }
  }
  return [...ids];
}

function stripTrailingNewline(source: string, span: SourceSpan): SourceSpan {
  let end = span.end;
  if (source[end] === '\n') end += 1;
  else if (source[end] === '\r' && source[end + 1] === '\n') end += 2;
  return { start: span.start, end };
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

export async function mergeChangeSet(input: MergeInput): Promise<MergeResult> {
  const { baseSource, headSource, yoursSource, base, head, yours } = input;
  void baseSource;
  const merged = mutableFrom(head);
  const conflicts: CollabConflict[] = [];
  const edits: TextEdit[] = [];
  const headOnly = new Set(head.order.filter((id) => !base.features.has(id)));

  let yoursGraph: FeatureGraph | undefined;
  const getYoursGraph = async (): Promise<FeatureGraph> => {
    yoursGraph ??= await captureFeatureGraph(yoursSource, { fileName: 'yours.kcad.ts' });
    return yoursGraph;
  };

  for (const op of yours.ops) {
    switch (op.op) {
      case 'setParam': {
        if (op.target === '$project') {
          const baseValue = base.params[op.name];
          const headValue = head.params[op.name];
          if (equal(headValue, op.to)) continue;
          if (!equal(headValue, baseValue)) {
            conflicts.push({
              code: 'collab.conflict.param',
              target: '$project',
              name: op.name,
              base: baseValue,
              head: headValue,
              yours: op.to,
            });
            continue;
          }
          const invalid = validateParam(op.name, op.to, merged.paramDeclarations);
          if (invalid !== undefined) {
            conflicts.push({ code: 'collab.conflict.invalid-value', target: '$project', name: op.name, reason: invalid });
            continue;
          }
          const rewrite = projectParamRewrite(headSource, op.name, op.to);
          if (rewrite === undefined) {
            conflicts.push({
              code: 'collab.conflict.invalid-value',
              target: '$project',
              name: op.name,
              reason: `could not rewrite param '${op.name}' in source`,
            });
            continue;
          }
          merged.params[op.name] = op.to;
          edits.push({ ...rewrite.span, text: rewrite.text });
          continue;
        }

        const baseNode = base.features.get(op.target);
        const headNode = head.features.get(op.target);
        if (headNode === undefined) {
          conflicts.push({ code: 'collab.conflict.same-feature', id: op.target });
          continue;
        }
        const headValue = headNode.params[op.name];
        if (equal(headValue, op.to)) continue;
        if (!equal(headValue, baseNode?.params[op.name])) {
          conflicts.push({
            code: 'collab.conflict.param',
            target: op.target,
            name: op.name,
            base: baseNode?.params[op.name],
            head: headValue,
            yours: op.to,
          });
          continue;
        }
        const rewrite = featureParamRewrite(headSource, headNode, op.name, op.to);
        if (rewrite === undefined) {
          conflicts.push({
            code: 'collab.conflict.invalid-value',
            target: op.target,
            name: op.name,
            reason: `could not rewrite ${op.name} inside ${op.target}'s statement`,
          });
          continue;
        }
        const target = merged.features.get(op.target)!;
        target.params[op.name] = op.to;
        edits.push({ ...rewrite.span, text: rewrite.text });
        continue;
      }

      case 'deleteFeature': {
        const headNode = head.features.get(op.id);
        if (headNode === undefined) continue;
        if (nodeChanged(base.features.get(op.id), headNode)) {
          conflicts.push({ code: 'collab.conflict.same-feature', id: op.id });
          continue;
        }
        merged.features.delete(op.id);
        merged.order = merged.order.filter((id) => id !== op.id);
        edits.push({ ...stripTrailingNewline(headSource, headNode.sourceSpan), text: '' });
        continue;
      }

      case 'insertFeature': {
        if (head.features.has(op.id)) {
          const same = equal(
            { params: head.features.get(op.id)!.params, refs: head.features.get(op.id)!.refs },
            { params: op.node.params, refs: op.node.refs },
          );
          if (!same) conflicts.push({ code: 'collab.conflict.duplicate-id', ids: [op.id] });
          continue;
        }
        merged.features.set(op.id, cloneNode(op.node));
        let index = insertionIndex(merged.order, op.after);
        // Head's own insertions after the same anchor stay first.
        while (index < merged.order.length && headOnly.has(merged.order[index]!)) index += 1;
        merged.order.splice(index, 0, op.id);

        const statement = statementText(yoursSource, op.node.sourceSpan);
        const callText = op.node.callSpan !== undefined ? statementText(yoursSource, op.node.callSpan) : statement;
        const insertText = statementIsReturn(yoursSource, op.node.sourceSpan) ? callText : statement;
        const statementIsReturnNode = statementIsReturn(yoursSource, op.node.sourceSpan);
        const anchorSpan = op.after !== null ? head.features.get(op.after)?.sourceSpan : undefined;
        let offset = anchorSpan?.end ?? 0;
        if (statementIsReturnNode) {
          const spans = CollabSpanIndex.parse(headSource);
          offset = spans.returnStatementSpan()?.start ?? offset;
        } else {
          for (let i = index - 1; i >= 0; i -= 1) {
            const id = merged.order[i]!;
            if (!headOnly.has(id)) continue;
            const span = head.features.get(id)?.sourceSpan;
            if (span !== undefined && span.start >= (anchorSpan?.start ?? 0)) offset = Math.max(offset, span.end);
          }
        }
        const prefix = offset === 0 || headSource[offset - 1] === '\n' ? '' : '\n';
        const suffix = statementIsReturnNode ? ';\n' : '\n';
        edits.push({ start: offset, end: offset, text: `${prefix}${insertText}${suffix}` });
        continue;
      }

      case 'setRef': {
        const headNode = head.features.get(op.id);
        if (headNode === undefined) {
          conflicts.push({ code: 'collab.conflict.same-feature', id: op.id });
          continue;
        }
        const baseRefs = base.features.get(op.id)?.refs[op.slot] ?? [];
        const headRefs = headNode.refs[op.slot] ?? [];
        if (equal(headRefs, op.to)) continue;
        if (!equal(headRefs, baseRefs)) {
          conflicts.push({ code: 'collab.conflict.same-feature', id: op.id });
          continue;
        }
        const target = merged.features.get(op.id);
        if (target === undefined) {
          conflicts.push({ code: 'collab.conflict.same-feature', id: op.id });
          continue;
        }
        target.refs[op.slot] = [...op.to];
        continue;
      }

      case 'moveFeature': {
        const headNode = head.features.get(op.id);
        if (headNode === undefined) {
          conflicts.push({ code: 'collab.conflict.same-feature', id: op.id });
          continue;
        }
        const baseIndex = base.order.indexOf(op.id);
        const headIndex = head.order.indexOf(op.id);
        if (baseIndex >= 0 && headIndex >= 0 && baseIndex !== headIndex) {
          const expected = insertionIndex(head.order.filter((id) => id !== op.id), op.after);
          if (expected !== headIndex) {
            conflicts.push({ code: 'collab.conflict.same-feature', id: op.id });
            continue;
          }
        }
        merged.order = merged.order.filter((id) => id !== op.id);
        merged.order.splice(insertionIndex(merged.order, op.after), 0, op.id);
        if (!statementIsReturn(headSource, headNode.sourceSpan)) {
          const text = statementText(headSource, headNode.sourceSpan);
          edits.push({ ...stripTrailingNewline(headSource, headNode.sourceSpan), text: '' });
          const anchorSpan = op.after !== null ? head.features.get(op.after)?.sourceSpan : undefined;
          const offset = anchorSpan?.end ?? 0;
          const prefix = offset === 0 || headSource[offset - 1] === '\n' ? '' : '\n';
          edits.push({ start: offset, end: offset, text: `${prefix}${text}\n` });
        }
        continue;
      }

      case 'editRequirement': {
        const baseReq = base.requirements[op.name];
        const headReq = head.requirements[op.name];
        if (equal(headReq, op.to)) continue;
        if (!equal(headReq, baseReq)) {
          conflicts.push({ code: 'collab.conflict.same-feature', id: `requirement:${op.name}` });
          continue;
        }
        merged.requirements[op.name] = structuredClone(op.to as RequirementNode);
        const to = op.to as RequirementNodeType | undefined;
        if (headReq?.sourceSpan !== undefined && to?.sourceSpan !== undefined) {
          edits.push({
            ...headReq.sourceSpan,
            text: yoursSource.slice(to.sourceSpan.start, to.sourceSpan.end),
          });
        }
        continue;
      }

      case 'editUnowned': {
        const graph = await getYoursGraph();
        const index = graph.unowned.findIndex((span) => span.start === op.span.start && span.end === op.span.end);
        const baseSpan = base.unowned[index];
        const headSpan = head.unowned[index];
        const yoursSpan = graph.unowned[index];
        if (index < 0 || baseSpan === undefined || headSpan === undefined || yoursSpan === undefined) {
          conflicts.push({ code: 'collab.conflict.unowned', span: op.span });
          continue;
        }
        if (headSpan.text === yoursSpan.text) continue;
        if (headSpan.text !== baseSpan.text) {
          conflicts.push({ code: 'collab.conflict.unowned', span: { start: headSpan.start, end: headSpan.end } });
          continue;
        }
        edits.push({ ...headSpan, text: yoursSpan.text ?? '' });
        continue;
      }
    }
  }

  if (conflicts.length > 0) return { status: 'conflict', conflicts };
  const structural = checkStructural(merged);
  if (structural.length > 0) return { status: 'conflict', conflicts: structural };

  const mergedSource = applyTextEdits(headSource, edits);
  let mergedGraph: FeatureGraph;
  try {
    mergedGraph = await captureFeatureGraph(mergedSource, { fileName: 'merged.kcad.ts' });
  } catch (err) {
    return {
      status: 'conflict',
      conflicts: [{ code: 'collab.conflict.same-feature', id: err instanceof Error ? err.message : '$merged' }],
    };
  }

  const derived = liftChangeSet(head, mergedGraph, {
    baseRevision: yours.baseRevision,
    agentId: yours.agentId,
    idempotencyKey: yours.idempotencyKey,
  });
  const expected = effectiveOps(yours.ops, head);
  if (opsSignature(derived.ops) !== opsSignature(expected)) {
    const ids = [...new Set([...idsOf(derived.ops), ...idsOf(expected)])];
    return {
      status: 'conflict',
      conflicts: (ids.length > 0 ? ids : ['$merged']).map((id) => ({ code: 'collab.conflict.same-feature', id })),
    };
  }

  return {
    status: 'merged',
    source: mergedSource,
    graph: mergedGraph,
    rebased: head.revisionHash !== base.revisionHash,
  };
}
