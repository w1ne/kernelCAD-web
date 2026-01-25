# Changelog

All notable changes to this project will be documented in this file.

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
