# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
### Added
-   **Web Worker Support**: Geometry execution now runs in a background thread, preventing UI freezes.

## [0.0.1] - 2026-01-25
### Added
-   **Initial MVP**: Editor, Viewer, and Geometry Engine.
-   **Advanced Features**: `fillet`, `chamfer`, `makeCompound`.
-   **Export**: STEP and STL export capabilities.
-   **Architecture**: Modular design with `geometryHelpers` and `geometryExports`.
-   **Testing**: Unit tests with Vitest.
-   **CI/CD**: GitHub Actions for automated deployment.
