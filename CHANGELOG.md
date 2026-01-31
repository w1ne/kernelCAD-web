# Changelog

All notable changes to this project will be documented in this file.
 
## [0.8.0] - 2026-01-31
### Added - Sketch Visibility & Test Expansion
- **Sketch Visibility**:
    - Connected `sketchesGeometries` to the `Viewer` for real-time visualization.
    - Standardized `THREE.Line` rendering for continuous polylines.
    - Automatic conversion of single return values to arrays in AST when sketches are added.
- **E2E Test Coverage**:
    - 10 new Playwright tests covering Primitives (Box, Cylinder), Booleans (Union, Cut), Exports (STEP, STL), and UI interactions (Undo/Redo, View Modes).
    - Exposed `window.isEditorReady` and `window.getSketches` for test synchronization and validation.
- **Worker Robustness**:
    - Ultra-robust error handling in geometry worker via multiple try-catch layers.
    - Graceful handling of invalid/zero-length geometry without engine crashes.
    - Vertex-based sketch deduplication to prevent redundant rendering.
 
### Fixed
- **UI Stability**:
    - Resolved a null-pointer crash during `sketchOnFace` initialization in `WorkbenchLayout`.
    - Implemented zero-length entity filtering in `SketchCanvas` to prevent invalid Replicad inputs.
- **E2E Regression**:
    - Updated stress tests to use proper drag motions and verify visual geometry presence.
 
## [0.7.0] - 2026-01-30
### Added - Reliability & Testing Overhaul
- **Comprehensive Fuzzing Suite**: Property-based testing using `fast-check` to validate geometry kernels against edge cases (`NaN`, infinite inputs, disjoint unions).
- **Workflow Validation Framework**: Automated regression testing for complete end-to-end user workflows (`src/workflows`).
- **Testing Strategy Documentation**: detailed guide in `doc/TESTING_STRATEGY.md`.

### Changed
- **Robustness**:
    - **Logic**: Enforced disjoint inputs for Boolean Union to prevent kernel crashes in headless mode.
    - **Validation**: Strict validation of operations (Fillet, Chamfer) with fallback checks for missing properties.
- **Architecture**:
    - **Linting**: Added architectural boundaries to prevent circular dependencies (e.g., forbidding imports from `src/components` into `src/lib`).

### Fixed
- **Headless Operations**: Resolved issues where `Chamfer` and `Union` operations returned valid shapes but missed `volume`/`boundingBox` properties in test environments.
- **State Machine**: Hardened `WorkbenchContext` against invalid state transitions during sketch mode.


## [0.6.0] - 2026-01-27
### Added - Professional Modeling Workflow
- **Sketch Visualization**: Toggleable cyan/blue line rendering for sketches in the 3D scene.
- **Show/Hide Sketches**: Toolbar button to toggle visibility of all sketches.
- **Face Selection & Sketching**: Support for `.sketchOnFace()` and creating sketch planes from 3D faces.
- **Advanced Boolean UI**: Cleaner interfaces for Union, Subtract, and Intersect operations.
- **Geometry Engine Updates**: Worker now extracts and meshes sketch wires for visualization.
- **Enhanced Feature Execution**: Support for target selection and contextual feature execution.

### Changed
- **Workbench Architecture**: Updated `WorkbenchContext` to manage sketch geometries and visibility state.
- **Viewer Component**: Now renders `lineSegments` for sketches alongside solid geometries.
- **Worker Logic**: Injected `startSketch` wrapper to automatically capture all sketches created in user code.

### Fixed
- **Worker Stability**: Improved handling of large meshes and buffer transfers.
- **Coordinate System**: Better alignment between sketch planes and 3D world coordinates for face-based sketching.


## [0.4.0] - 2026-01-26
### Added - CAD-Style View Modes
- **3 Professional View Modes** matching CATIA/Fusion360/NX standards:
  - **Shaded with Edges** (Default) - Flat-shaded surfaces with black edge lines
  - **Wireframe** - Clean geometric edges only (NOT mesh tessellation)
  - **Shaded** - Smooth surfaces without edges
- **CAD Material System** (`materials.ts`):
  - MeshLambertMaterial (matte, no specular) instead of PBR
  - EdgeGeometry (15° threshold) for sharp geometric features
  - LineBasicMaterial for clean black edges
- **CAD Lighting System** (`lighting.ts`):
  - Headlight (0.7 intensity, follows camera)
  - Bright ambient (0.5 intensity, CAD principle: clarity over realism)
  - Rim light (0.3 intensity, for depth perception)
  - No shadows, no realistic fall-off
- **View Mode UI Controls**:
  - Toggle buttons in Header (Box/Grid/Circle icons)
  - Active state highlighting
  - Keyboard-accessible

### Changed
- **Replaced PBR Materials**: MeshStandardMaterial → MeshLambertMaterial for CAD clarity
- **Viewer Component**: Now supports 3 rendering modes with proper edge visualization
- **State Management**: Added `viewMode3D` to WorkbenchContext

### Fixed
- **Wireframe Rendering**: Now uses EdgesGeometry instead of WireframeGeometry
  - Shows geometric edges (box boundaries, cylinders, fillets)
  - NOT mesh triangulation/tessellation
  - Matches professional CAD software behavior

### Testing
- **+14 Unit Tests** for CAD materials and lighting modules
- **85 Tests Total** (all passing)
- **100% Browser Verified**: All 3 modes switching smoothly
- **Modules Isolated**: Easy to test, replace, and expand

### Technical Details
- **Code Added**: ~200 lines (materials.ts, lighting.ts, viewMode.ts, Viewer updates)
- **Architecture**: Fully modular with dependency injection ready
- **Performance**: 60fps in all modes, no memory leaks on mode switching
- **Edge Threshold**: 15° for sharp geometric features only

## [0.2.1] - 2026-01-26
### Fixed
- **Default Template Array Return**: Changed default template from `return filleted.cut(cyl);` to `return [filleted.cut(cyl)];` to enable AST auto-update of return statements.
- **Shape Visibility**: Box/Cylinder insertions now correctly appear in 3D view after insertion.

### Refactored
- **Feature Organization**: Extracted features into dedicated files (`box.feature.ts`, `cylinder.feature.ts`, `modifiers.feature.ts`) for better maintainability.
- **Code Cleanup**: Removed dead Regex code (~70 lines) replaced by AST implementation:
  - Deleted `findInsertionPoint()` - replaced by AST
  - Deleted `updateReturnStatement()` - replaced by AST
  - Kept `generateUniqueName()` and `extractVariables()` (still in use)
- **Simplified Insertion**: `useCodeInsertion.ts` now exclusively uses AST Command Pattern for shape insertions.

### Documentation
- **Updated Roadmap**: Added comprehensive ROADMAP 3.0 aligned with CATIA/Fusion360/NX workflows.
- **CAD Workflow Comparison**: New document comparing current state with professional CAD systems.
- **Phase Planning**: Detailed phases for Sketching (v0.3), View Modes (v0.4), and Advanced Features (v0.5).

### Technical
- **Code Reduction**: -160 lines (-62% reduction in modified files)
- **Test Suite**: 71 tests passing (removed 6 obsolete tests for deleted functions)
- **Browser Verified**: Full smoke test confirms Box/Cylinder insertions working perfectly

## [0.2.0] - 2026-01-26
### Added
- **AST-Based Code Manipulation**: Replaced fragile Regex patterns with robust Abstract Syntax Tree (AST) using `acorn` parser.
- **Syntax-Aware Insertion**: Shape insertion now uses AST traversal to find the correct `drawPart` function and return statement.
- **Auto-Return Updates**: Automatically appends inserted variables to return array (e.g., `return [box]` → `return [box, cylinder]`).
- **Command System**: Implemented Command pattern with Undo/Redo support for code changes.
- **Feature Registry**: Added pluggable feature system for Box, Cylinder, and Sphere primitives.
- **Comprehensive Testing**: Added 39 new tests (24 unit + 15 integration) covering edge cases and full workflow.

### Changed
- **Code Insertion Logic**: Migrated from Regex to AST-based manipulation in `ast.ts`.
- **Toolbar Integration**: Toolbar now uses feature registry and command system.
- **Package Dependencies**: Added `acorn`, `acorn-walk`, and `astring` for AST processing.

### Fixed
- **Comment Corruption**: AST prevents Regex bug where comments containing "return" were incorrectly modified.
- **String Literal Matching**: No longer matches patterns inside string literals.
- **Nested Functions**: Correctly identifies target function scope instead of matching any return statement.

### Technical Details
- **Incremental Implementation**: 6-phase rollout with browser verification at each step.
- **Browser Compatible**: All AST libraries work in browser without bundler issues.
- **Test Coverage**: 77 tests passing (39 new AST tests + 38 existing tests).
- **Backup Available**: Old Regex implementation preserved in `ast-regex.ts`.

## [0.1.0] - 2026-01-25
### Added
-   **Scene Browser**: Fusion 360-style feature tree listing all objects (`box1`, `cyl2`) with "Jump to Code" functionality.
-   **Workbench Architecture**: Complete refactor of `App.tsx` into a modular context-based system.
-   **GUI Mode**: Dedicated Design view with Toolbar and Browser sidebar.
-   **Smart Insert**: Context-aware code insertion that respects scopes and return statements.
-   **Structure**: New component library (`src/components/Layout`).

### Changed
-   **Web Worker**: Improved geometry execution stability.
-   **Performance**: Reduced main thread blocking during re-computation.


## [0.0.1] - 2026-01-25
### Added
-   **Initial MVP**: Editor, Viewer, and Geometry Engine.
-   **Advanced Features**: `fillet`, `chamfer`, `makeCompound`.
-   **Export**: STEP and STL export capabilities.
-   **Architecture**: Modular design with `geometryHelpers` and `geometryExports`.
-   **Testing**: Unit tests with Vitest.
-   **CI/CD**: GitHub Actions for automated deployment.
