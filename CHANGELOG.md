## v0.1.0 — 2026-04-29

### Added
- New flat feature-graph IR (`src/intent/`)
- Runtime feature capture (`src/capture/`) — script-primary, no AST walk
- `ParamRegistry` with mathjs expressions, units, cycle detection (`src/compute/paramRegistry.ts`)
- `DependencyGraph` with topo sort + canReorder validation (`src/compute/dependencyGraph.ts`)
- `RecomputeEngine` with input-resolution and health states (`src/compute/recomputeEngine.ts`)
- `ShapeBackend` + `FeatureLowerer` interfaces (`src/backends/backend.ts`)
- `OcctBackend` + `OcctLowerer` for box/cylinder/sphere/extrude/revolve/boolean (`src/backends/occt/`)
- TypeScript script transpile + `vm`-based execution isolation (`src/script-runtime/`)
- `kernelcad` CLI: `evaluate` + `export stl|step` (`src/cli/`, esbuild bundle)
- v0.1 acceptance demo: parametric plate with hole

### Changed
- Version reset 0.10.0 → 0.1.0 per NORTHSTAR roadmap (new architecture line)
- Moved `src/lib/worker.ts` → `src/backends/occt/worker.ts`

### Deferred to v0.2+
- Edge features (fillet, chamfer, shell, hole, cut, draft) — require stable naming
- 2D sketch primitives + `tracked`/`created`/`propagated` topology refs
- `NamingHistory` walking + geometry-snapshot fallback

### Documentation
- New NORTHSTAR architecture spec (`docs/superpowers/specs/2026-04-29-kernelcad-NORTHSTAR.md`)
- Ported internal docs from `kernelCAD-private` into `docs/internals/`
- Added clean-room IP boundary clause to `CONTRIBUTING.md`
- Archived 22 obsolete docs to `archive/doc/`

---

# 🚀 kernelCAD v0.10.0

**Modern Programmable CAD for the Web**

---

## 📋 What's New

- chore: cleanup test artifacts (de01ddf)
- chore: ignore test results (11f4197)
- chore(release): prepare version for automation (a7ec6a3)
- chore(release): resolve build errors and test regressions (d423c72)
- chore(release): fix lint errors and improve type safety (47b96f6)
- chore(release): synchronize version and apply stabilization fixes (7b3d4ba)
- docs: update CHANGELOG for v0.10.0 (1ce0ea6)
- feat: add E2E test suite, release automation, and documentation improvements (337680c)
- feat: expand E2E test coverage and improve sketching reliability (91b0fc3)
- feat: fix sketch visibility, harden worker, and expand E2E test coverage (a32c71c)
- test: add standard workflow validation suite (2ca0540)
- feat: complete v0.6.1 architecture refactor and regression suite (dc6d3f7)
- Refactor: Implement Sketch on Face and Extrude Direction (37ead84)
- fix: resolve correct variable names in Extrude Face feature (4aa8cb8)
- fix: add plane validation to prevent invalid face sketching (70c2979)
- fix: prevent duplicate variable names in face sketch workflow (259acb2)
- refactor: Phase 2 - Extract face selection into custom hook (c23c71f)
- chore: enforce Node.js 22+ requirement (cf7ebc7)
- refactor: Phase 1 - Add plane utilities and constants (f16817f)
- feat: implement sketch visualization and complete phase 1.1 milestones (dc45a38)
- docs: add development experience and testing techniques to roadmap (b95bb10)
- feat: implement Face Selection and Extrude from Face workflows (b03a437)
- feat: implement Revolve, Fillet/Chamfer enhancements, and Boolean operations with full test coverage (7ed7c85)
- docs: restructure roadmap to prioritize professional CAD workflows (97332c1)
- feat(workflow): implement decoupled sketch-extrude workflow and standalone construction tools (e1f12b3)
- fix: resolve Sketcher.extrude error and implement circle tool support (9707001)
- test: fix SceneBrowser tests for new folder-based UI and mandatory props (d090643)
- feat: advanced plane infrastructure & scene browser evolution (e22a316)
- feat: refined sketching system v0.5.0 (07dfc1e)
- fix: extrude dialog number input validation (c4a0d80)
- feat: complete sketch → code → extrude workflow (4182aa7)
- feat: implement 2D sketch canvas with drawing tools (45a350f)
- feat: verify Replicad Sketcher API in browser (e0f139c)
- feat: add sketch mode infrastructure for v0.5.0 (34afc28)
- docs: reprioritize v0.5.0 as Sketching System (8ac0a00)
- docs: fix semantic versioning in roadmap (8d00b26)
- docs: clean up roadmap - mark v0.4.0 complete, reorganize phases (6801ebc)
- docs: add Feature History/Timeline phase to roadmap (9c1c30c)

---

## ✅ Test Results (Automated)

- **QC Check**: Passed (Linting & Build)
- **Unit Tests**: Ran successfully
- **E2E Tests**: Manual verification recommended

---

## 📦 Build Information

- **Version**: 0.10.0
- **Build Date**: 2026-02-04 14:54:08 UTC
- **Platform**: Web / linux

## 🎯 Supported Features

kernelCAD v0.10.0 supports:

| Feature | Description | Status |
|---------|-------------|--------|
| Sketcher | 2D constraint solver | Stable |
| Extrude | 3D extrusion from faces | Stable |
| Fillet/Chamfer | Edge modifications | Beta |
| STEP Export | CNC/CAM compatibility | Stable |

---

## 📥 Installation

### Use Online
Visit [kernelcad.com](https://kernelcad.com).

### Run Locally

```bash
git clone https://github.com/w1ne/kernelCAD.git
cd kernelCAD
git checkout v0.10.0
npm install
npm run dev
```

---

## 🐛 Report Issues
Found a bug? [Open an issue](https://github.com/w1ne/kernelCAD/issues)


# Changelog

All notable changes to this project will be documented in this file.
 
## [Unreleased]
### Added - Visibility & Selection System
- **Visibility Persistence**:
    - Implemented `localStorage` persistence for `hiddenIds`.
    - Hiding objects in Scene Browser (via Eye icon) is now preserved across page reloads.
- **Universal Selection**:
    - **Plane Selection**: Made all plane types (Base, Offset, Face-derived) selectable in the 3D Viewer.
    - **Visual Feedback**: Clicking a plane highlights it with `selection-blue`.
    - **Synchronization**: Selection state stays in sync between 3D Viewer and Scene Browser.
- **Testing Infrastructure**:
    - Enhanced `WorkbenchContext` to expose `setCode`, `startFaceSelection` and selection helpers to `window` for robust E2E testing.
    - Added `tests/visibility_selection.spec.ts` to verify persistence and interaction flows.

## [0.10.0] - 2026-02-04
### Added - Release Automation & Testing Infrastructure
- **Release Automation**:
    - Created `scripts/release.ts` for automated version bumping, tagging, and release note generation.
    - Integrated release script with `npm run release -- [major|minor|patch]` command.
    - Automated CHANGELOG updates and git tag creation.
- **Comprehensive E2E Test Suite**:
    - Added `tests/core_workflows.spec.ts` covering Box, Cylinder, Extrude, Revolve, Fillet, and Boolean operations.
    - Added `tests/error_handling.spec.ts` for edge case validation and error recovery.
    - Added `tests/extrude_face_anonymous_shape.spec.ts` and `tests/extrude_from_code_sketch.spec.ts`.
    - Improved Playwright configuration for better test stability and parallelization.
- **Custom Icon System**:
    - Created `src/icons/cad.ts` with custom CAD-specific icons.
    - Added `src/components/CustomIcons.tsx` for icon component library.
- **Integration Test Suite**:
    - Added `src/integration/e2e_workflows.test.ts` for workflow validation.
    - Added `src/integration/ui_workflows.test.tsx` for UI interaction testing.

### Changed
- **Documentation**:
    - Updated `RELEASE_STRATEGY.md` with Git Flow branching model and branch protection rules.
    - Added comprehensive release note template matching professional standards.
    - Enhanced `TESTING_STRATEGY.md` with detailed testing approach and coverage goals.
    - Updated `INTERFACES.md` with improved API documentation.
- **Worker Improvements**:
    - Refactored geometry worker for better error handling and reliability.
    - Improved memory management and buffer transfers.
    - Enhanced sketch processing and validation.
- **Type System**:
    - Added `src/types/editor.ts`, `src/types/replicad-opencascadejs.d.ts`, and `src/types/window-globals.d.ts`.
    - Improved type safety across the codebase.

### Fixed
- **Build Configuration**:
    - Updated `vite.config.ts` for better build performance.
    - Enhanced `tsconfig.app.json` with stricter type checking.
- **Test Stability**:
    - Removed flaky test artifacts and improved test isolation.
    - Fixed empty sketch validation tests.

### Technical
- **Code Quality**: Added ESLint rules for better code organization.
- **Dependencies**: Updated package-lock.json with latest compatible versions.
- **Cleanup**: Removed obsolete files (`scripts/release.sh`, `public/opencascade.wasm`).

## [0.9.0] - 2026-02-01
### Fixed - Critical Sketch Bugs
- **Empty Sketch Extrusion Crash**:
    - System now detects empty sketches (no geometry drawn) and throws a descriptive error instead of crashing with "No lines to convert into a wire".
    - Implemented `_hasGeometry` tracking in `SafeSketcher` via Proxy pattern to intercept drawing commands.
    - Updated `extrude` helper in `geometryHelpers.ts` to provide user-friendly error messages.
    - Added comprehensive unit tests in `tests/reproduce_empty_sketch.test.ts`.
- **Anonymous Shape Sketching Bug**:
    - Fixed AST parser incorrectly resolving chained expressions (e.g., `box.cut(tool)`) to base variables (`box`).
    - This caused sketches to attach to the wrong parent shape, leading to visual/parametric mismatches and empty sketch generation.
    - Implemented strict `resolveVariableName` in `src/lib/ast.ts` to only resolve direct identifiers.
    - System now generates safe "detached sketches" (`new Sketcher(plane)`) for anonymous shapes, ensuring correct global coordinates.
- **Sketch Code Generation Split**:
    - Resolved issue where sketch entities were generated in separate code blocks instead of being combined into the parent `sketchOnFace` call.

### Changed
- **SafeSketcher Proxy**: Enhanced method chaining to correctly return proxy instance for all drawing operations.
- **AST Resolution**: Removed recursive variable resolution for `CallExpression` and `MemberExpression` to prevent false parent identification.

### Technical
- **Tests**: +6 new unit tests for empty sketch handling and AST resolution.
- **Architecture**: Improved reliability layer defensive programming patterns.

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
