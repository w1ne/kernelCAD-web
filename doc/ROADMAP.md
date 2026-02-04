# kernelCAD Roadmap

> Building a professional parametric CAD system in the browser

**App Version (package.json)**: v0.7.0
**Latest Git Tag**: v0.4.0
**Status**: Phase 1 (Professional Modeling Workflow) - In Progress

---

## ✅ COMPLETED

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

---

## 🚀 PHASE 1: Professional Modeling Workflow (v0.7.x)

**Goal**: Transform kernelCAD from a code-editor with a viewer into a professional CAD workbench.

### 1.2 Parametric Sketching
- [ ] **Geometric Constraints**: Horizontal, Vertical, Parallel, Perpendicular, Tangent.
- [ ] **Dimensional Constraints**: Driving dimensions that update the underlying code automatically.
- [ ] **Constraint Solving**: Integration of a 2D constraint solver (e.g., plane-solver).

### 1.3 UI/UX Polish
- [ ] **Icon Redesign**: Replace current icons with professional, consistent icon set (e.g., Lucide, Heroicons).
- [ ] **Visual Hierarchy**: Improve toolbar and panel layouts for better usability.
- [ ] **Tooltips**: Add comprehensive tooltips for all tools and features.
- [ ] **Keyboard Shortcuts**: Implement industry-standard shortcuts (e.g., E for Extrude, S for Sketch).

---

## 🛠️ DEVELOPMENT EXPERIENCE (DX)

**Goal**: Improve development speed and reliability through better tooling and testing.

### 1.3 Infrastructure & Testing
- [x] **Interactive Test Runner**: Integrated Vitest with UI support.
- [x] **Geometry Regression Suite**: Snapshot-based validation of CAD workflows (Volume, Center of Mass, Bounding Box).
- [x] **Headless CAD Validation**: Automatic geometry checks via `standardWorkflows.test.ts`.

### 1.4 Developer Tools
- [ ] **Dev Lab**: Isolated environment for component testing and prototyping (e.g., `/dev-lab` route).

---

## 🕐 PHASE 2: Intelligence & Parametric Control (v0.7.x)

**Goal**: Full parametric control over the model history.

### 2.1 Feature History & Timeline
- [ ] **Timeline UI**: Fusion360-style linear history at the bottom of the screen.
- [ ] **Time Travel**: Drag the playhead to see previous states of the model.
- [ ] **Re-ordering**: Drag and drop features in the timeline to change execution order.

### 2.2 Parameters Management
- [ ] **Global Parameters Panel**: Manage user-defined variables (e.g., `wallThickness = 2mm`).
- [ ] **Expressions**: Support for math in all input fields (`width / 2 + 5`).
- [ ] **Bidirectional Sync**: Changing a parameter in the GUI updates the code in real-time.

---

## 🎨 PHASE 3: Direct Manipulation & Interaction (v0.8.x)

**Goal**: Interact with the 3D model directly using industry-standard GUI tools.

### 3.1 Transform Gizmos
- [ ] **Standard Gizmo**: Translation (arrows), Rotation (rings), and Scaling handles.
- [ ] **Interactive Extrude**: Click and drag a sketch face to extrude it in 3D.
- [ ] **Selection Highlighting**: Hover and click highlighting for faces, edges, and vertices.

### 3.2 Direct Editing
- [ ] **Push/Pull**: Select a face and pull it to change the underlying parameter.
- [ ] **Snap System**: Snap to grid, vertices, or midpoints during manipulation.

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

1. **v0.7.0**: Parametric Sketching (Constraints & Dimensions) ⭐ **HIGH PRIORITY**
2. **v0.8.0**: Direct Manipulation (Gizmos & Selection)
3. **v0.9.0**: Feature Timeline & History
4. **v1.0.0**: Global Parameters & Sections 🎉

---

**Last Updated**: 2026-01-29  
**Next Review**: After v0.7.0 (Parametric Sketching) ships
