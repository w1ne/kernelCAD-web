// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Immutable shape handles.
//
// `translate / rotate / scale / reflect / color` return a NEW Shape and
// leave the receiver untouched. A Shape handle is (record id, version):
// the number of versioned ops (transforms and colours) it has seen on that
// record. A chain `box(…).translate(…).rotate(…)` still lands on ONE record
// — each op is applied in place while the receiver is the record's head
// and nothing has consumed that record yet — so record ids, refs and
// goldens of chained scripts are unchanged. Branching off an older handle,
// or off a record another feature already consumed, forks a copy of the
// record at that handle's version instead of mutating shared state.
import type { FeatureId, FeatureKind } from '../../shared/intent/types';
import type { FeatureRecord, ShapeTransform } from '../../shared/intent/featureRecord';
import type { SoftWarning } from '../../shared/runtime/softWarning';

/** An op a Shape handle applies through `CaptureSession.applyVersionedOp`. */
export type VersionedOp =
  | { kind: 'transform'; t: ShapeTransform }
  | { kind: 'color'; value: unknown };
type SequencedOp = VersionedOp & { seq: number };

/** What the version tracker needs from its CaptureSession. */
export interface ShapeVersionHost {
  /** The session's live record array (mutated in place). */
  records(): FeatureRecord[];
  nextId(kind: FeatureKind): FeatureId;
  appendTransform(id: FeatureId, t: ShapeTransform): void;
  /** Per-feature side tables a fork copies and a fold drops. */
  sideTables(): ReadonlyArray<Map<string, unknown>>;
  warnings(): SoftWarning[];
}

export class ShapeVersions {
  private readonly host: ShapeVersionHost;

  constructor(host: ShapeVersionHost) {
    this.host = host;
  }

  private readonly versionOps = new Map<FeatureId, SequencedOp[]>();
  private opSeq = 0;
  /** metadata.color of a record before its first `.color()` op. */
  private readonly baseColors = new Map<FeatureId, unknown>();
  /** Records that some other record consumes (or the script returned). */
  private readonly consumedRecords = new Set<FeatureId>();
  /** Every fork, by fork id: the handle (source, version) it branched from. */
  private readonly forks = new Map<FeatureId, { source: FeatureId; version: number }>();
  /** Forks made to read an older handle, keyed `${source}@${version}`. */
  private readonly staleReads = new Map<string, FeatureId>();
  /** Records dropped by `finalizeShapeVersions`, mapped to the record that took their place. */
  private readonly foldedInto = new Map<FeatureId, FeatureId>();

  /** Number of versioned ops applied to record `id` so far. */
  headVersion(id: FeatureId): number {
    return this.versionOps.get(id)?.length ?? 0;
  }

  /** Apply a transform / colour through handle (`id`, `version`); returns
   *  the record the result lives on (in place, or a fresh fork). */
  apply(id: FeatureId, version: number, op: VersionedOp): FeatureId {
    const inPlace = version === this.headVersion(id) && !this.consumedRecords.has(id);
    const target = inPlace ? id : this.forkRecord(id, version).id;
    this.pushVersionedOp(target, { ...op, seq: this.opSeq++ });
    return target;
  }

  /** The record id a handle stands for right now. The head handle is the
   *  record itself; an older handle reads a fork of the record at its
   *  version (one fork per handle version, reused on every read). */
  resolve(id: FeatureId, version: number): FeatureId {
    const folded = this.foldedInto.get(id);
    if (folded !== undefined) return folded;
    if (version === this.headVersion(id) || !this.host.records().some((r) => r.id === id)) return id;
    const key = `${id}@${version}`;
    const existing = this.staleReads.get(key);
    if (existing !== undefined) return this.foldedInto.get(existing) ?? existing;
    const fork = this.forkRecord(id, version);
    this.staleReads.set(key, fork.id);
    return fork.id;
  }

  /** Mark a record as consumed outside the record graph (the script's
   *  return value): later ops on its handle fork instead of mutating it. */
  markConsumed(id: FeatureId): void {
    this.consumedRecords.add(id);
  }

  /**
   * End-of-capture pass for the statement form `p.translate(…); use(p)`.
   *
   * Under immutable transforms that call's result is discarded, so `use(p)`
   * reads the unmoved `p`. Scripts written against the old mutating API rely
   * on `p` having moved. For each handle (record, version) that was used
   * after branching — some fork of it is consumed — every op made through
   * that handle whose result nothing consumed is a discarded statement. Those
   * ops are replayed, in call order, into each consumed fork (the old
   * behaviour), the orphaned records are dropped, and a soft warning tells
   * the author to assign the result instead.
   */
  finalize(): void {
    const byBase = new Map<string, FeatureId[]>();
    for (const [forkId, base] of this.forks) {
      const key = `${base.source}@${base.version}`;
      byBase.set(key, [...(byBase.get(key) ?? []), forkId]);
    }
    for (const [key, forkIds] of byBase) this.foldDiscardedOps(key, forkIds);
  }

  /** Fold the discarded ops made through handle `key` into its consumed forks. */
  private foldDiscardedOps(key: string, forkIds: readonly FeatureId[]): void {
    const at = key.lastIndexOf('@');
    const sourceId = key.slice(0, at);
    const version = Number(key.slice(at + 1));
    const live = (id: FeatureId) => this.host.records().some((r) => r.id === id);
    const unconsumed = (id: FeatureId) => !this.consumedRecords.has(id) && live(id);
    const targets = forkIds.filter((id) => this.consumedRecords.has(id) && live(id));
    if (targets.length === 0) return;
    // Results of ops through this handle that nothing consumed. The read
    // fork of the handle itself is not an op result.
    const readFork = this.staleReads.get(key);
    const orphans = forkIds.filter((id) => unconsumed(id) && id !== readFork);
    if (unconsumed(sourceId) && this.headVersion(sourceId) > version) orphans.unshift(sourceId);
    const discarded = orphans
      .flatMap((id) => (this.versionOps.get(id) ?? []).slice(version))
      .sort((x, y) => x.seq - y.seq);
    if (discarded.length === 0) return;
    for (const id of targets) {
      const own = (this.versionOps.get(id) ?? []).slice(version);
      this.rebuildOps(id, version, [...discarded, ...own].sort((x, y) => x.seq - y.seq));
    }
    for (const id of orphans) this.dropRecord(id, targets[0]);
    const calls = discarded.map((op) => (op.kind === 'color' ? 'color' : op.t.op)).join(', ');
    this.host.warnings().push({
      code: 'script.discarded-transform',
      hint: 'Transforms return a new Shape. Assign the result — `const moved = part.translate(…)` — instead of calling it as a statement.',
      message: `The result of ${calls} on '${sourceId}' was never used; it was applied to the shape for compatibility with the old mutating API.`,
      recordId: targets[0],
      phase: 'build',
    });
  }

  private pushVersionedOp(id: FeatureId, op: SequencedOp): void {
    if (op.kind === 'transform') {
      this.host.appendTransform(id, op.t);
    } else {
      const r = this.host.records().find((x) => x.id === id);
      if (!r) throw new Error(`Feature '${id}' not registered`);
      const metadata = (r.metadata ?? {}) as Record<string, unknown>;
      if (!this.baseColors.has(id)) this.baseColors.set(id, metadata.color);
      metadata.color = op.value;
      (r as { metadata: Record<string, unknown> }).metadata = metadata;
    }
    const ops = this.versionOps.get(id) ?? [];
    ops.push(op);
    this.versionOps.set(id, ops);
  }

  /** Reset record `id` to its first `keep` ops, then apply `replay`. */
  private rebuildOps(id: FeatureId, keep: number, replay: readonly SequencedOp[]): void {
    const r = this.host.records().find((x) => x.id === id);
    if (!r) return;
    const ops = this.versionOps.get(id) ?? [];
    const opTransforms = ops.filter((op) => op.kind === 'transform').length;
    const keptTransforms = ops.slice(0, keep).filter((op) => op.kind === 'transform').length;
    r.transforms.length = r.transforms.length - opTransforms + keptTransforms;
    this.versionOps.set(id, ops.slice(0, keep));
    if (this.baseColors.has(id) && r.metadata !== undefined) {
      const lastKeptColor = ops.slice(0, keep).filter((op) => op.kind === 'color').pop();
      const color = lastKeptColor?.kind === 'color' ? lastKeptColor.value : this.baseColors.get(id);
      if (color === undefined) delete (r.metadata as Record<string, unknown>).color;
      else (r.metadata as Record<string, unknown>).color = color;
    }
    for (const op of replay) this.pushVersionedOp(id, op);
  }

  private dropRecord(id: FeatureId, replacement: FeatureId): void {
    const index = this.host.records().findIndex((r) => r.id === id);
    if (index >= 0) this.host.records().splice(index, 1);
    this.foldedInto.set(id, replacement);
    this.versionOps.delete(id);
    for (const table of this.host.sideTables()) table.delete(id);
  }

  /** A copy of record `id` as handle version `version` saw it: same feature,
   *  the transforms and colour of its first `version` ops, its side-table
   *  entries (imported geometry, connectors). */
  private forkRecord(id: FeatureId, version: number): FeatureRecord {
    const source = this.host.records().find((r) => r.id === id);
    if (!source) throw new Error(`Feature '${id}' not registered`);
    const ops = this.versionOps.get(id) ?? [];
    // Transforms that did not come through a handle op (imported sessions,
    // direct record edits) stay in front of the replayed ones.
    const opTransforms = ops.filter((op) => op.kind === 'transform').length;
    const untracked = source.transforms.slice(0, source.transforms.length - opTransforms);
    const metadata = source.metadata === undefined ? undefined : { ...source.metadata };
    if (metadata !== undefined && this.baseColors.has(id)) {
      const base = this.baseColors.get(id);
      if (base === undefined) delete (metadata as Record<string, unknown>).color;
      else (metadata as Record<string, unknown>).color = base;
    }
    const fork: FeatureRecord = {
      ...source,
      id: this.host.nextId(source.kind),
      transforms: [...untracked],
      metadata,
    };
    this.host.records().push(fork);
    this.forks.set(fork.id, { source: id, version });
    for (const table of this.host.sideTables()) {
      const entry = table.get(id);
      if (entry !== undefined) table.set(fork.id, entry);
    }
    for (const op of ops.slice(0, version)) this.pushVersionedOp(fork.id, op);
    return fork;
  }

  /** Record every existing record that `r` references as consumed. */
  markInputsConsumed(r: FeatureRecord): void {
    const known = new Set(this.host.records().map((x) => x.id));
    const visit = (value: unknown, depth: number): void => {
      if (depth > 12 || value === null || value === undefined) return;
      if (typeof value === 'string') {
        if (known.has(value)) this.consumedRecords.add(value);
        else {
          const ref = /^@kcq?\[([^\]/]+)/.exec(value);
          if (ref !== null && known.has(ref[1])) this.consumedRecords.add(ref[1]);
        }
        return;
      }
      if (typeof value !== 'object') return;
      if (Array.isArray(value)) {
        if (value.length > 0 && typeof value[0] === 'number') return;
        for (const item of value) visit(item, depth + 1);
        return;
      }
      for (const item of Object.values(value as Record<string, unknown>)) visit(item, depth + 1);
    };
    visit(r.inputs, 0);
    visit(r.params, 0);
    visit(r.metadata, 0);
  }
}
