// Q-S6 — Inspect first, build after (the agent-loop pattern)
//
// Demonstrates: building a Query, serializing it via `.toString()` to the
// canonical `@kcq[...]` debug form, and inspecting the AST shape before
// the agent commits to consuming the Query in a feature op.
//
// The "inspect-first" loop is the canonical agent flow whenever the
// expected entity count is uncertain — express the query, log the
// descriptor, then narrow further or consume directly.

const part = box(20, 20, 10, false, {
  faceLabels: { lid: 'top' },
});

// 1. Express the candidate Query.
const candidates = q.face().and(q.withFeatureName('box1'));

// 2. Inspect the descriptor without resolving. The debug form
//    `@kcq[face(<json>)]` quotes the AST for trace; future slices replace
//    this with the canonical grammar serializer.
const descriptor = candidates.toString();
if (!descriptor.startsWith('@kcq[face(')) throw new Error('Q-S6: descriptor form');

// 3. Inspect structure — the agent reads the AST shape to decide whether
//    to narrow further. `.and(...)` wraps the receiver in an
//    `intersection` AST node carrying both operand ASTs verbatim, so the
//    agent can walk the tree to read the filters applied at each level.
if (candidates.ast.op !== 'intersection') throw new Error('Q-S6: outer op');

// 4. If the candidate Query is too broad (multiple matches expected), the
//    agent narrows further. Each `.and(...)` adds another intersection
//    layer; chained narrowers compose left-to-right.
const narrowed = candidates.and(q.withLabel('lid'));
if (narrowed.ast.op !== 'intersection') throw new Error('Q-S6: narrowed op');

// 5. The agent can also bottom out on the same surface via the
//    `evaluate_query` MCP tool from outside the script — the tool ships
//    in a follow-on slice and consumes the same Query AST that
//    `.toJSON()` emits here.
const astSnapshot = narrowed.toJSON();
if (astSnapshot._kind !== 'kc.query') throw new Error('Q-S6: JSON shape');

return part;
