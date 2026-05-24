// src/kernel/naming/queryTypeMismatch.test.ts
//
// Q5 — runtime type-narrowing fallback per D0.7 (c).
//
// Q2 ships compile-time narrowing via `Query<FaceMarker>` / `Query<EdgeMarker>`
// phantom-marker generics. The static check vanishes at the JSON-AST boundary
// (MCP `evaluate_query` input, string-DSL `fromString`, untyped `Query<unknown>`
// from `q.createdBy(...)`). Consumers that demand a specific kind call
// `assertQueryKind(query, expected, consumer)`; mismatch surfaces
// `query.type-mismatch` with a clear repair pointing at the right constructor.
//
// Target 'any' is always accepted — it means the Query was constructed without
// a kind narrower (e.g. `q.createdBy('arm')`) and will be narrowed downstream
// by the consumer's evaluator branch.

import { describe, it, expect } from 'vitest';
import { q } from './queryConstructors';
import { assertQueryKind } from './queryEvaluator';
import { isKernelError } from '../../shared/intent/kernelError';
import type { Query } from './query';

describe('Query runtime kind narrowing — Q5 (D0.7 (c))', () => {
  it('assertQueryKind passes when the query target matches the expected kind', () => {
    const v = q.face(q.createdBy('arm'));
    expect(() => assertQueryKind(v, 'face', 'fillet.edges')).not.toThrow();
  });

  it('assertQueryKind throws query.type-mismatch when the target disagrees', () => {
    const edgeQ = q.edge(q.createdBy('arm'));
    let caught: unknown;
    try {
      assertQueryKind(edgeQ as never, 'face', 'fillet.edges');
    } catch (e) {
      caught = e;
    }
    expect(isKernelError(caught)).toBe(true);
    if (isKernelError(caught)) {
      expect(caught.code).toBe('query.type-mismatch');
    }
  });

  it('assertQueryKind error message names the actual kind, the expected kind, and the consumer', () => {
    const edgeQ = q.edge();
    let caught: unknown;
    try {
      assertQueryKind(edgeQ as never, 'face', 'hole.face');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Error);
    const msg = (caught as Error).message;
    expect(msg).toContain('edge');
    expect(msg).toContain('face');
    expect(msg).toContain('hole.face');
  });

  it("assertQueryKind accepts target 'any' (e.g. createdBy without a kind narrower)", () => {
    const anyQ = q.createdBy('arm');
    // q.createdBy returns Query<unknown> with target='any'; either consumer
    // kind should accept it because downstream narrowing happens at the
    // consumer's evaluator branch, not at this guard.
    expect(() => assertQueryKind(anyQ, 'face', 'fillet.edges')).not.toThrow();
    expect(() => assertQueryKind(anyQ, 'edge', 'fillet.edges')).not.toThrow();
  });

  it('assertQueryKind hint names the corrective constructor (kc.q.<expected>(...))', () => {
    const edgeQ = q.edge();
    let caught: unknown;
    try {
      assertQueryKind(edgeQ as never, 'face', 'fillet.edges');
    } catch (e) {
      caught = e;
    }
    expect(isKernelError(caught)).toBe(true);
    if (isKernelError(caught)) {
      // Hint must point at the right constructor so the agent's next edit
      // is mechanical: swap kc.q.edge(...) for kc.q.face(...).
      expect(caught.hint).toContain('kc.q.face');
      expect(caught.hint).toContain('kc.q.edge');
    }
  });

  // End-to-end scenario per D0.7 (c) and the "actually use what you ship"
  // discipline: a Query<FaceMarker> survives a JSON.stringify → JSON.parse
  // round-trip (the MCP `evaluate_query` boundary), loses its phantom marker
  // in the process, and the consumer's runtime narrowing must catch the
  // wrong-kind misuse before the request reaches the evaluator.
  it('catches wrong-kind queries that crossed a JSON-AST boundary (e.g. MCP evaluate_query)', () => {
    // Producer authored a face query but emitted it as JSON for an MCP call.
    const faceQ = q.face(q.createdBy('arm'));
    const json = JSON.stringify(faceQ);

    // Consumer parsed the JSON. The phantom marker is gone; only the data
    // fields (_kind / target / ast / lenient) remain.
    const erased = JSON.parse(json) as Query<unknown>;
    expect(erased.target).toBe('face');

    // Consumer expects an edge query (e.g. fillet's edges slot). Without
    // the runtime guard, the wrong-kind Query would slip through and the
    // evaluator would silently return face entities to an edge consumer.
    let caught: unknown;
    try {
      assertQueryKind(erased, 'edge', 'fillet.edges');
    } catch (e) {
      caught = e;
    }
    expect(isKernelError(caught)).toBe(true);
    if (isKernelError(caught)) {
      expect(caught.code).toBe('query.type-mismatch');
      expect(caught.message).toContain('fillet.edges');
    }
  });
});
