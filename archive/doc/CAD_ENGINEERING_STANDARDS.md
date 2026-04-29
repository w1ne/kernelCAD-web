# CAD Engineering Standards

## Purpose
This document defines the engineering standards kernelCAD should follow to align with best-in-class CAD systems (Onshape, Fusion 360, NX, CATIA, SolidWorks, Creo).

These are implementation standards, not product marketing goals.

---

## 1. Stable Geometric References

### Standard
- Never rely on volatile face/edge indices as long-term references.
- Every downstream operation must reference:
  - a stable selector, or
  - explicit datum geometry (plane/axis/csys), or
  - a persisted topological reference ID with repair strategy.

### Required in kernelCAD
- Treat `faceId` as ephemeral runtime data only.
- Convert interactive face picks into stable references before commit.
- Centralize reference generation in one service.

---

## 2. Transactional Modeling Operations

### Standard
Every modeling operation must be atomic:
1. Build operation intent
2. Validate/preflight
3. Commit or reject as a unit

No partial writes to source-of-truth model code/state.

### Required in kernelCAD
- Single mutation pipeline for all model code writes.
- Parse/validate before commit.
- Reject invalid mutation without modifying current model.

---

## 3. First-Class History Model

### Standard
Feature history must be authoritative and editable:
- stable operation IDs
- dependencies
- ordered replay
- suppress/reorder/delete support

### Required in kernelCAD
- Replace regex-based history extraction with AST-backed operation graph.
- Delete/rename/reorder must target operation IDs, not fuzzy text matches.

---

## 4. Deterministic Regeneration

### Standard
Given the same inputs and feature order, regeneration must produce equivalent output and diagnostics.

### Required in kernelCAD
- One replay path for model evaluation.
- Explicit dependency ordering.
- Structured failure diagnostics (operation ID + reason + affected references).

---

## 5. Sketching Discipline

### Standard
- Constraint state must be explicit (under/fully/over constrained).
- Sketch plane basis must be deterministic.
- Commit must preserve WYSIWYG mapping from sketch canvas to 3D result.

### Required in kernelCAD
- Single plane/basis derivation service for all sketch entry points.
- No duplicated xDir/origin derivation logic in UI components.

---

## 6. Selection & Command Semantics

### Standard
- Selection model must be explicit and typed (body/face/edge/sketch/vertex).
- Keyboard shortcuts and editor input must never conflict on destructive actions.

### Required in kernelCAD
- Central key-routing policy with capture/consumption rules.
- Destructive commands must be blocked in text-edit context unless explicitly intended.

---

## 7. Persistence Safety

### Standard
- Invalid model state must never be persisted as canonical project state.
- Recovery from corrupted session must be deterministic.

### Required in kernelCAD
- Save only parse-valid model code.
- On load failure, recover to last valid/default state with explicit notice.

---

## 8. Test Strategy for CAD Reliability

### Standard
Test pyramid must include:
- unit tests for AST transforms/reference logic
- integration tests for command and history flow
- scenario tests for regressions (reload + autosave + delete + regenerate)

### Required in kernelCAD
- Add regression suites around:
  - history delete after reload
  - sketch on face stability after model change
  - keyboard delete vs editor focus conflicts
  - persistence/load recovery correctness

---

## 9. Implementation Rules (Do/Don’t)

### Do
- Use one authoritative service per domain boundary (mutation, references, history).
- Prefer IDs and structured metadata over text heuristics.
- Fail closed: keep prior valid state when mutation fails.

### Don’t
- Don’t mutate model code from multiple ad-hoc pathways.
- Don’t use regex parsing for destructive history operations.
- Don’t duplicate geometry/reference logic across UI entry points.

---

## 10. Adoption Plan

### Phase 1: Safety
- Enforce single code commit gate.
- Remove non-transactional destructive mutations.

### Phase 2: History
- Introduce AST-backed operation model with stable IDs.

### Phase 3: References
- Centralize stable reference generation and repair.

### Phase 4: Hardening
- Expand regression scenarios and telemetry for command failures.

