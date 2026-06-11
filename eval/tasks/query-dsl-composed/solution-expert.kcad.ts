// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Reference build for the composed Query DSL eval task. The box declares
// a user-applied face label `top -> top`; a typed face Query is composed
// via `q.face()` + `.and(q.withLabel('top'))`; that Query is passed
// directly into hole(...) so the lowerer dispatches it through the
// Query evaluator at lowering time. End-to-end test of the Q DSL
// pipeline: typed authoring → composition → runtime evaluation →
// lowerer dispatch.

const top = q.face().and(q.withLabel('top'));

return box(40, 40, 10, false, { faceLabels: { top: 'top' } })
  .hole(top, { u: 0, v: 0, diameter: 4, depth: 'through', name: 'lidBolt' });
