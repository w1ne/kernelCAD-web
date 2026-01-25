# Roadmap

## Milestone 1: MVP (Completed)
**Goal**: Create a minimum viable product to prove the concept of browser-based code-CAD.

- [x] **Project Setup**: Vite + React + TypeScript.
- [x] **Geometry Kernel**: Integrated Replicad (OpenCASCADE).
- [x] **Code Editor**: Integrated Monaco Editor with syntax highlighting.
- [x] **Viewer**: Real-time 3D viewing with React Three Fiber.
- [x] **Deployment**: Automated GitHub Pages deployment via Actions.
- [x] **Stability**: Error Boundaries and specific WASM loading fixes for production.

## Milestone 2: Input & Output (Completed)
**Goal**: Make the tool useful for real-world workflows by supporting standard CAD formats.

- [x] **STEP Export**: Allow downloading the geometry as a standard STEP file.
- [x] **STL Export**: Allow downloading mesh data for 3D printing.
- [ ] **Parameter UI**: Auto-generate sliders/inputs based on variables in the code.
- [ ] **URL Sharing**: Share designs via encoded URLs.

## Milestone 3: Release Automation (Completed)
**Goal**: Automate testing, versioning, and deployment.

- [x] **Release Script**: `scripts/release.sh` to handle linting, version bumping, and tagging.
- [x] **Packages**: Single-package `release` command in `package.json`.
- [x] **CI Integration**: GitHub Actions workflow (`deploy.yml`) triggered by tags.

## Milestone 4: Advanced Kernel Features (Planned)
**Goal**: Expose more of OpenCASCADE's power through convenient helpers.

- [ ] **Assemblies**: Support for multiple interacting parts.
- [ ] **Fillet/Chamfer Helpers**: Easier APIs for standard mechanical operations.
- [ ] **2D Sketcher**: Enhanced 2D drawing capabilities (constraints?).

## Milestone 4: Performance & Polish (Planned)
**Goal**: Handle complex models without freezing the UI.

- [ ] **Web Worker**: Move the geometry engine to a Web Worker to keep the UI responsive during computation.
- [ ] **Incremental Updates**: Only recompute changed parts if possible.
- [ ] **Theme Config**: User-configurable editor themes.

## Backlog / Ideas
-   **Vim Mode**: Support Vim keybindings in Monaco.
-   **TypeScript Support**: First-class TS support in the editor with auto-completion.

## Milestone 5: Hybrid GUI (Fusion 360 Workflow) (Planned)
**Goal**: Bi-directional editing where GUI actions generate code, and code updates the GUI.

- [ ] **Visual Toolbar**: Common operations (Sketch, Extrude, Fillet) available as buttons. Clicking them inserts the corresponding Replicad code snippet.
- [ ] **Browser Tree**: A Fusion-style browser panel showing the hierarchy of Bodies, Sketches, and Planes.
- [ ] **Design Timeline**: Visual history of operations. Hovering over a timeline step highlights the corresponding code and 3D geometry.
- [ ] **Parametric Dialogs**: Selecting an operation (e.g., "Extrude") opens a floating dialog to adjust parameters (distance, direction) with sliders, immediately updating the code.
- [ ] **Visual Sketcher**: A 2D UI for drawing profiles that generates `sketch().line()...` commands automatically.
