# Testing Strategy

kernelCAD employs a multi-layered testing strategy to ensure the robustness of its geometry kernel, UI state command system, and user workflows. This document outlines the testing layers, tools used, and how to run them.

## 1. Unit Tests (Vitest)
Low-level validation of individual functions, helpers, and state reducers.

-   **Location**: `src/**/*.test.ts`
-   **Tools**: `vitest`
-   **Coverage**:
    -   `geometryHelpers.test.ts`: Validates OCCT wrapper logic.
    -   `utils.test.ts`: Helper utility validation.
    -   `workbenchReducer.test.ts`: Validates complex state transitions (Idle -> Sketching -> Dialog).
-   **Command**:
    ```bash
    npx vitest run src/utils src/helpers src/store
    ```

## 2. Integration Tests (Component & State)
Verification of component interactions and Redux state flow within the React environment.

-   **Location**: `src/test/integration/**/*.test.tsx`
-   **Tools**: `vitest`, `@testing-library/react`
-   **Key Test**: `guiIntegration.test.tsx`
    -   Simulates a full user session: entering sketch mode, drawing, exiting, and opening dialogs.
    -   Mocks the visual layer (`Viewer`) but validates the logical layer (`WorkbenchContext`, Toolbar).
-   **Command**:
    ```bash
    npx vitest run src/test/integration
    ```

## 3. Workflow Validation (Regression System)
Automated execution of complete CAD workflows (script -> geometry) to prevent regression in the kernel or API.

-   **Location**: `src/workflows/**/*.test.ts`
-   **Framework**: Custom `WorkflowRunner` (built on Vitest)
-   **Concept**:
    -   **Registry**: `src/workflows/registry.ts` lists all known valid workflows.
    -   **Workflows**: Typescript files in `src/workflows/definitions/` that export a `run()` function returning geometry.
    -   **Validation**: The runner executes the workflow code using `executeGeometry` (headless OCCT) and asserts that:
        1.  No crash occurs.
        2.  Shape is valid (Checked via `boundingBox`/`volume`).
        3.  Topology remains consistent (Face/Edge counts).
-   **Command**:
    ```bash
    npx vitest run src/workflows/runner
    ```

## 4. Fuzzing & Property-Based Testing
Automated discovery of edge cases by generating random but valid inputs for geometry operations.

-   **Location**: `src/workflows/fuzzing/`
-   **Tools**: `fast-check`
-   **Strategy**:
    -   **Primitives**: (`primitives.test.ts`) Generates random dimensions for Box, Cylinder, and Polygon extrusions. Verifies validity via Bounding Box.
    -   **Operations**: (`operations.test.ts`) Applies `Fillet`, `Chamfer`, or `Union` to generated shapes.
-   **Constraints**:
    -   `noNaN: true` enforced on all inputs.
    -   `Union` excludes identical overlapping solids (known OCCT crash case).
    -   Accepts `!IsNull()` as success even if derived properties (`volume`) are missing in headless mode.
-   **Command**:
    ```bash
    npx vitest run src/workflows/fuzzing
    ```

## 5. Manual Verification
Certain interactive workflows require human visual confirmation.

-   **Sketch on Face**:
    1.  Create a Box/Cylinder.
    2.  Select a Face (turns highlighted).
    3.  Click "Sketch" toolbar button.
    4.  Draw a profile and Extrude.
    5.  **Verify**: The new feature is attached to the selected face.

## Summary of Commands

| Layer | Command | Focus |
| :--- | :--- | :--- |
| **All Automated** | `npm test` | Run all suites |
| **Unit/Logic** | `npx vitest run src/store` | State Logic |
| **Regression** | `npx vitest run src/workflows/runner` | API Stability |
| **Fuzzing** | `npx vitest run src/workflows/fuzzing` | Kernel Robustness |

## 6. Future Improvements (What we want to add)

### Visual Regression Testing
-   **Goal**: Detect unintended rendering changes (lighting, material, camera).
-   **Tool**: Playwright Screenshot Comparisons.
-   **Plan**:
    -   Render standard test objects (Box, Cylinder).
    -   Take canvas snapshots.
    -   Compare against "Golden Images".

### Interactive Canvas Tests
-   **Goal**: Verify mouse interaction (Selection, Gizmos).
-   **Challenge**: Canvas is a single DOM element.
-   **Strategy**:
    -   Expose internal scene graph locations to the test runner via window object.
    -   Use `page.mouse.click(x, y)` based on projected coordinates.

