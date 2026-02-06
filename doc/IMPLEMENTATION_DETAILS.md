# Implementation Details

> **See Also**: [Architecture](./ARCHITECTURE.md) for the high-level component overview.

This document provides in-depth technical details about key subsystems in kernelCAD, supplementing the high-level architecture overview.

## 1. Visual Feedback System

The visual feedback system provides real-time cues to the user during modeling. It is built on a "Hover Engine" that runs on every frame.

### Core Components

#### `HoverManager` (`src/features/interaction/HoverManager.ts`)
- **Role**: Centralized service that processes raycast results from Three.js.
- **Priority Logic**: It sorts intersection hits based on a priority hierarchy:
  1.  **Vertices** (Point helpers) - Highest priority.
  2.  **Edges** (Lines/Curves) - Medium priority.
  3.  **Faces** (Meshes) - Lowest priority.
- **Depth Bias**: It applies a custom tolerance (using a "cone of influence") to favor smaller elements (like vertices) even if a large face is slightly closer to the camera.

#### `SnapManager` (`src/features/interaction/SnapManager.ts`)
- **Role**: Computes magnetic snap points based on the current hover.
- **Types**:
  - `ENDPOINT`: Snaps to the start/end of lines or arc endpoints.
  - `MIDPOINT`: Snaps to the center of a line.
  - `CENTER`: Snaps to the center of a circle/arc.
  - `FACE_CENTER`: Snaps to the centroid of a face.

#### `Viewer` Integration (`src/components/Viewer.tsx`)
- **`InteractionHandler`**: A headless component that runs the raycaster in `useFrame` and updates the global hover state.
- **`BetterHighlightOverlay`**: Renders a dedicated overlay mesh for the hovered item with specific colors (Orange for highlight). It clones geometry references to avoid overhead.
- **`SnapIndicator`**: Renders 3D icons (Square, Triangle) at the snap position.

### Interaction State
The system uses a rigid state machine (conceptually) managed via React Context (`WorkbenchContext`):
- `IDLE`: Standard hovering.
- `SKETCH_ACTIVE`: Enhanced raycasting against the active sketch plane.
- `TOOL_ACTIVE`: Specific tool behaviors (e.g., Extrude selection).

---

## 2. Geometric Constraint Solver

The parametric engine allows users to define rules for 2D sketches that persist and update dynamically.

### Solver Architecture (`src/lib/constraints/solver.ts`)

#### Iterative Relaxation
The solver uses an iterative approach (similar to relaxation methods) rather than a symbolic equation solver.
1.  **Error Calculation**: For each constraint, calculate the current "error" (e.g., how far two coincident points are).
2.  **Correction**: Nudge the involved entities (points) to reduce the error.
3.  **Iteration**: Repeat until the total error is below a threshold or max iterations are reached.

#### Supported Constraints
- **Coincident**: Forces two points to share the same coordinates.
- **Distance**: Maintains a fixed Euclidean distance between two points.
- **Horizontal/Vertical**: Forces a line segment to align with the X or Y axis.
- **Parallel/Perpendicular**: Constrains the slope of two lines.
- **Equal Length**: Forces two lines to have the same magnitude.
- **Radius**: Fixes the radius of a circle.
- **Tangent**: Ensures continuity between a line and an arc (or two arcs).

### Integration
- **State**: The solver state implies a graph where Nodes are Entities (Points, Lines) and Edges are Constraints.
- **React**: When the user adds a constraint via `ConstraintsToolbar`, the system:
  1.  Adds the constraint object to the list.
  2.  Triggers `solve()`.
  3.  Updates the underlying entity coordinates.
  4.  Regenerates the displayed code (if "Dynamic Dimensioning" is active) or updates the visual sketch canvas.

---

## 3. Code Generation Pipeline

kernelCAD is "Code-First", meaning every UI action must result in robust, idempotent JavaScript code.

### The Pipeline
1.  **User Action**: User drags a handle or changes a param.
2.  **Intent Capture**: The UI component captures the intent (e.g., "Extrude 50mm").
3.  **Code Building**: `CodeBuilder` constructs a robust snippet:
    ```javascript
    const extrude1 = sketch.extrude(50);
    ```
4.  **Insertion**: `useCodeInsertion` finds the optimal place to insert:
    - Analyzes scopes to find where dependencies (e.g., `sketch`) are defined.
    - Avoids shadowing variables.
    - Updates the final `return` array to include the new shape.

### Reference Management
To solve the Topological Naming Problem, we generate **stable references**:
- Instead of `shape.faces[0]`, we generate `shape.faces(">Z")` using CAD Query selectors.
- This ensures that if the efficient geometry changes (e.g., `box` becomes taller), the selector still finds the "top" face.
