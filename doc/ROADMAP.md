# kernelCAD Roadmap 2.0: The Horizons

> "Good one small step a time workflow."

This roadmap transitions from feature-chasing to architectural stability. We define "Horizons" to group architectural milestones.

## Horizon 1: Foundation & Modularization (COMPLETE)
**Goal**: Deconstruct the monolith. The `App.tsx` has become too complex. We need a clean "Workbench" architecture to support future GUI features safely.

- [x] **Architecture**: Split `App.tsx` into a Layout/Workbench system.
    -   `Workbench` (State Container)
    -   `Layout` (Visual Shell)
    -   `FeatureManager` (Dependency Injection for Tools)
- [x] **State Management**: Introduce a rigid state store (likely `zustand` or `context`) to manage `Code`, `Selection`, `ViewMode` globally without prop drilling.
- [x] **Code Organization**: Strictly separate:
    -   `src/core` (Engine, Worker, Evaluation)
    -   `src/ui` (Components, Dialogs, Toolbar)
    -   `src/features` (The bridge between logic and UI, e.g., "BoxFeature")

## Horizon 2: The Command Pattern (Fusion 360 Core) (Current Focus)
**Goal**: Standardize how actions happen. A "Tool" shouldn't just run a function; it should enter a "State".

- [ ] **Command Infrastructure**: Implement a `Command` class system.
    -   `StartCommand('CreateBox')` -> Enters "Parameter Selection" state.
    -   `CommitCommand()` -> Generates code + Updates History.
-   **Undo/Redo**: Not just text undo, but "Operation" undo.
-   **AST Engine**: Replace Regex-based `extractVariables` with a real AST parser (babel/parser) to reliably read/write code structure without breaking user logic.

## Horizon 3: The Scene Graph (Data Truth)
**Goal**: The text buffer is too volatile to be the only source of truth. We need a structured representation.

-   **Shadow DOM for CAD**: Maintain a JSON-like tree of the model structure (Bodies, Operations, Parameters).
-   **Bi-directional Sync**:
    -   Code Change -> Updates Shadow Graph.
    -   Graph Change (Rename Item) -> Refactors Code safely.
-   **Selection Sync**: Robust mechanism to map a 3D Mesh UUID back to the specific `const` variable in the code.

## Horizon 4: Interactive Interaction
**Goal**: Touching the model.

-   **Gizmos**: Transform Controls (Move/Scale/Rotate) in the 3D view that update variable values.
-   **Visual Sketcher**: A 2D canvas for drawing profiles that generates code.
-   **Draggable History**: Reorder code blocks via a drag-and-drop timeline.

---
## Detailed Next Steps (Horizon 1)

1.  **Extract `WorkbenchState`**: Move separate `useState` hooks (`code`, `viewMode`, `activeDialog`) into a unified hook or store.
2.  **Atomic Components**: Break `App.tsx` into:
    -   `<Header />`
    -   `<ActivityBar />` (The left strip)
    -   `<SidePanel />` (The Browser/Tool properties)
    -   `<Workspace />` (The Editor/Viewer split)
3.  **Feature Registry**: Instead of hardcoding `GEOMETRY_CONFIGS`, create a registry where features register themselves (`BoxFeature`, `CylinderFeature`). This makes adding new tools easy.