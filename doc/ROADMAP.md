# kernelCAD Roadmap

> Building a professional parametric CAD system in the browser

**App Version (package.json)**: v0.10.0
**Latest Git Tag**: v0.10.0
**Status**: Phase 1 (Professional Modeling Workflow) - In Progress

---

## 📚 Design & Interaction Guidelines
> [!NOTE]
> All new features must adhere to the following specifications:
> - **[Workflows & Patterns](./BEST_PRACTICES_WORKFLOWS.md)**: High-level UX philosophy.
> - **[Interaction Specs](./DETAILED_INTERACTION_SPECS.md)**: Precise click/drag sequences for every tool.
> - **[Visual Feedback](./VISUAL_FEEDBACK_SYSTEM.md)**: Cursor states, snapping cues, and highlight colors.

---

## ✅ COMPLETED

### v0.10.0: Workflow, DX, and CI Hardening
- [x] **Sketch Selection in Viewer**: Click sketch wires to select, highlight, and prefill feature dialogs.
- [x] **Extrude From Code Sketch**: Extrude/Revolve dialogs include sketch variables declared in user code.
- [x] **Extrude Face Reliability**: Anonymous returned shapes are auto-named and replaced in `return` (no detached “plane + rect” junk).
- [x] **Dev Lab**: Added `/dev-lab` for fast scenario loading and debugging.
- [x] **Keyboard Shortcuts**: Added CAD-style tool hotkeys and Undo/Redo (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z / Ctrl/Cmd+Y) with “don’t trigger while typing” guards.
- [x] **Preference Persistence**: Persist view modes and sketch visibility across reloads.
- [x] **QC Gate**: Added `npm run qc` / `npm run qc:full` and wired into release automation.
- [x] **CI Enforcement**: CI runs `qc` + Build on PRs, runs Playwright E2E only on `master`, uploads Playwright reports/traces, and avoids duplicate push+PR runs.

### v0.1-0.4: Foundation & CAD Visualization
- [x] Workbench layout system (Header, SidePanel, Workspace)
- [x] AST-based code manipulation with `acorn` parser
- [x] Command Pattern with Undo/Redo support
- [x] Feature Registry for primitives (Box, Cylinder, Sphere)
- [x] Scene Browser with "Jump to Code"
- [x] **CAD Visualization Modes**: Shaded with Edges, Wireframe, Shaded.

### v0.5.0-v0.5.2: Decoupled Workflow Foundation
- [x] **Decoupled Sketch-Extrude**: Sketches are standalone primitives; Extrude is a separate operation.
- [x] **Construction Geometry**: Origin planes and Offset planes support.
- [x] **Feature Execution System**: Support for custom dialogs and target selection.

### v0.6.0-v0.6.1: Advanced Modeling Operations
- [x] **Core Features**: Revolve (Sweep/Loft pending).
- [x] **Detailing**: Fillet and Chamfer with edge selection support (Filter-based).
- [x] **Boolean Ops**: Clean UI for Union, Subtract, Intersect.
- [x] **Face Selection**: Derive sketch planes and features directly from 3D faces.
- [x] **Sketch Visualization**: Toggleable visibility of sketches in 3D scene (Blue lines).
- [x] **Face Sketching**: Draw sketches directly on a selected face with proper plane geometry.
- [x] **Smart Camera**: Auto-focus camera on selected faces for sketching (Professional View).
- [x] **CAD Query Support**: Robust selector-based modeling (e.g., `.faces(">Z")`) and fluent API helpers.

---

## 🚀 PHASE 1: Professional Modeling Workflow (v0.10.x)

**Goal**: Transform kernelCAD from a code-editor with a viewer into a professional CAD workbench.

### 1.2 Parametric Sketching
- [x] **Geometric Constraints**: Horizontal, Vertical, Parallel, Perpendicular, Tangent (Foundations in `solver.ts`).
- [x] **Dimensional Constraints**: Driving dimensions that update the underlying code automatically.
- [x] **Constraint Solving**: Integration of a basic 2D constraint solver (Iterative solver integrated).
- [ ] **Auto-Constraint Inference**: "Magnetic" cursors that snap to Vertical/Horizontal/Coincident while drawing.
- [ ] **Dynamic Dimensioning**: Type values (e.g., "50") while drawing to immediate set length/angle.

### 1.3 Next-Gen UI/UX & Workflow
- [x] **Icon Redesign**: Replace current icons with professional, consistent icon set (via `lucide-react`).
- [ ] **Command Palette**: Global search and command execution (`Cmd+K`) for keyboard-centric workflow.
- [ ] **Floating Panels**: Non-blocking, context-aware property panels replacing modal dialogs.
- [ ] **Context-Aware UI**: Dynamic toolbars/properties that react to selection (Canvas-First).
- [ ] **Contextual Mini-Toolbar**: Floating actions (Extrude, Sketch) appearing near the cursor upon selection.
- [ ] **Visual Hierarchy**: Improve toolbar and panel layouts for better usability.
- [x] **Tooltips**: Add comprehensive tooltips for tools/features (including keyboard shortcut hints).
- [x] **Keyboard Shortcuts**: Industry-standard shortcuts (E/S/P + R/F/C + J/X/I + Undo/Redo) with typing-safe guards.
- [ ] **Visual Feedback System** (See [Visual Feedback](./VISUAL_FEEDBACK_SYSTEM.md)):
  - [ ] **Theme Infrastructure**: Define CSS variables for `highlight-orange`, `selection-blue`, and `snap-green`.
  - [ ] **Hover Engine**: Implement a centralized `HoverManager` that detects `Edge`, `Face`, and `Vertex` hits with Z-index priority (Vertex > Edge > Face).
  - [ ] **Snap Indicators**: Create a lightweight React component to render SVG icons (Square, Triangle, X) at valid inference points.
  - [ ] **Cursor State Machine**: Update `InteractionManager` to support `default`, `grab`, `grabbing` and tool-specific badges (e.g., "Pencil" icon).
- [ ] **Standardized Interaction Logic** (See [Interaction Specs](./DETAILED_INTERACTION_SPECS.md)):
  - [ ] **Finite State Machine (FSM)**: Refactor `AbstractTool` to rigidly enforce `Idle` -> `Active` -> `Finished` states to prevent "stuck" tools.
  - [ ] **Drag-to-Edit**: Implement shared logic for "Press-Drag-Release" operations (used in Extrude, Fillet, and new Plane tools).
  - [ ] **Sketch Tool Refactor**: Update Line, Circle, and Rect tools to support the "Click-Move-Click" pattern with "Dynamic Input" field focus.
- [ ] **Construction Geometry UI** (See [Specs](./DETAILED_INTERACTION_SPECS.md#6-construction-geometry)):
  - [ ] **Offset Plane Tool**: User selects face -> drags arrow manipulator -> types distance.
  - [ ] **Midplane Tool**: User selects Face A + Face B -> logic computes midpoint transform.
  - [ ] **Tangent Plane Tool**: User selects Cylinder -> drags radial handle for angle.

---

## 🛠️ DEVELOPMENT EXPERIENCE (DX)

**Goal**: Improve development speed and reliability through better tooling and testing.

### 1.3 Infrastructure & Testing
- [x] **Interactive Test Runner**: Integrated Vitest with UI support.
- [x] **Geometry Regression Suite**: Snapshot-based validation of CAD workflows (Volume, Center of Mass, Bounding Box).
- [x] **Headless CAD Validation**: Automatic geometry checks via `standardWorkflows.test.ts`.

### 1.4 Developer Tools
- [x] **Dev Lab**: Isolated environment for component testing and prototyping (e.g., `/dev-lab` route).

---

## 🕐 PHASE 2: Intelligence & Parametric Control (v0.10.x)

**Goal**: Full parametric control over the model history.

### 2.1 Feature History & Timeline (See [Spec](./HISTORY_SYSTEM_SPEC.md))
- [ ] **Timeline UI**: Fusion360-style linear history at the bottom of the screen.
- [ ] **Time Travel**: Drag the playhead to see previous states of the model.
- [ ] **Re-ordering**: Drag and drop features in the timeline or browser to change execution order (AST-based).
- [ ] **Suppression**: Temporarily disable features without deleting code.
- [ ] **Contextual Deletion**: Remove features and handle dependency cascades.

### 2.2 Parameters Management
- [ ] **Global Parameters Panel**: Manage user-defined variables (e.g., `wallThickness = 2mm`).
- [ ] **Expressions**: Support for math in all input fields (`width / 2 + 5`).
- [ ] **Bidirectional Sync**: Changing a parameter in the GUI updates the code in real-time.

---

## 🎨 PHASE 3: Direct Manipulation & Interaction (v0.8.x)

**Goal**: Interact with the 3D model directly using industry-standard GUI tools.

### 3.1 Transform Gizmos
- [ ] **Standard Gizmo**: Translation (arrows), Rotation (rings), and Scaling handles.
- [ ] **Interactive Extrude**: Click and drag a sketch face to extrude it in 3D (See [Specs](./DETAILED_INTERACTION_SPECS.md#31-extrude-e)).
- [ ] **Selection Highlighting**: Hover and click highlighting (Orange/Blue) as per [Visual Feedback](./VISUAL_FEEDBACK_SYSTEM.md).

- [ ] **Visibility & Selection System** (See [Spec](./VISIBILITY_AND_SELECTION_SPEC.md)):
  - [ ] Per-object visibility toggles in Scene Browser.
  - [ ] Universal selection for Solids, Planes, and Sketches.
  - [ ] Visual highlighting of selected objects in 3D scene.

---

## 🔭 PHASE 4: Visualization & Engineering (v0.9.x+)

**Goal**: Refine the engineering experience and display quality.

### 4.1 Advanced Rendering
- [ ] **Hidden Line Removed**: Professional wireframe visualization.
- [ ] **Section Analysis**: Live section cutting through any plane.
- [ ] **X-Ray & Ghosting**: See through parts to internal components.

### 4.2 Engineering Tools
- [ ] **Measurement**: Precise point-to-point and face-to-face measurements.
- [ ] **Mass Properties**: Volume, area, and center of gravity calculations.

---

---

## ⚡ PERFORMANCE OPTIMIZATION (Continuous)
High-performance rendering and geometry computation are critical for professional-grade parts.
See detail spec in **[Performance Strategy](./PERFORMANCE_IMPROVEMENTS.md)**.

### P.1 Rendering Efficiency
- [ ] **Consolidated Meshes**: Reduce draw calls by combining faces into single shape-level geometries.
- [ ] **Worker-Side Edges**: Compute outline data in worker to avoid UI thread blocking.
- [ ] **GPU-Based Picking**: Shift selection logic to the GPU for sub-millisecond selection in large scenes.

### P.2 Geometry Engine Scaling
- [ ] **Incremental Meshing**: Cache shape results and re-mesh only the dirty path.
- [ ] **Adaptive Quality**: Use coarse meshes during live interaction and high-precision for final view.
- [ ] **WASM Streaming & Caching**: Use IndexedDB and direct streaming to minimize boot time.

---

## 🚀 PHASE 5: Assembly & Collaboration (v1.0.0+)

### 5.1 Multi-Body & Assembly
- [ ] Component hierarchy and Sub-assemblies.
- [ ] **Mates & Joints**: Define relationships between parts (Rigid, Slider, Revolute).

### 5.2 Ecosystem
- [ ] **Git-for-Geometry**: Visual diffing of model changes in Pull Requests.
- [ ] **Plugin Store**: Expand functionality with community scripts.

---

## 🏗️ ARCHITECTURE REFACTORING (Continuous)

**Goal**: Improve code quality, testability, and maintainability.

### A.1 State Management
- [x] **Split Context**: Break `WorkbenchContext` into `CodeContext`, `GeometryContext`, `UIContext`, `SelectionContext`.

### A.2 Type Safety
- [x] **Type-Safe Worker Protocol**: Replace stringly-typed messages with discriminated unions.
- [x] **CodeBuilder Pattern**: Standardize code generation across all features.

### A.3 Engine & Testing
- [x] **GeometryEngine Class**: Eliminate global state, improve testability.
- [x] **Error Boundaries**: Centralized error handling with retry logic.
- [x] **Geometry Validation Tests**: Snapshot tests for volume, bounding box, center of mass.

## 📋 Priority Order (Next 6 Months)

1. **v0.10.x**: Parametric Sketching (Constraints & Dimensions) ⭐ **HIGH PRIORITY**
2. **Object Management**: Visibility & Selection System ([Spec](./VISIBILITY_AND_SELECTION_SPEC.md))
3. **v0.8.0**: Direct Manipulation (Gizmos & Selection)
4. **v0.9.0**: Feature Timeline & History
5. **v1.0.0**: Global Parameters & Sections 🎉

---

**Last Updated**: 2026-02-05  
**Next Review**: After v0.10.x (Parametric Sketching) ships
