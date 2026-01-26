# Changelog

All notable changes to this project will be documented in this file.

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
