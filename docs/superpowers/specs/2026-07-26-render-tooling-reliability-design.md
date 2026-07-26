# Render Tooling Reliability Design

## Objective

Make KernelCAD’s existing render workflow work predictably after installation and fail with precise recovery guidance when Playwright Chromium is absent. Correct misleading canonical preview orientation or labeling so users can distinguish an exterior top view from an open underside.

## Scope

This change is intentionally limited to:

1. Correct installation of the platform-specific Rollup native package required by the existing player build.
2. An actionable `npx playwright install chromium` diagnostic when the render browser executable is missing.
3. Correct canonical preview camera orientation and descriptions for KernelCAD’s Z-up coordinate system.
4. Focused automated regression coverage.

No new setup command, browser bundling, renderer architecture, CAD geometry behavior, STEP semantics, or embossing behavior is included.

## Installation Reliability

Keep the current npm-based installation and build workflow. Ensure the lockfile and dependency declarations allow npm to install the appropriate Rollup native package for the current platform without requiring users to delete `node_modules` or the lockfile.

The fix must remain portable: do not hard-code the macOS ARM package as an unconditional production dependency for other platforms. Use the package manager’s supported optional-platform dependency mechanism or the Rollup version’s established dependency declaration.

## Missing-Browser Diagnostic

When Playwright fails because its Chromium or headless-shell executable is absent, KernelCAD must replace the raw Playwright banner/stack with a concise KernelCAD diagnostic that includes:

```text
npx playwright install chromium
```

The diagnostic must preserve the underlying cause for debugging and must not claim that Studio, a development server, or a full reinstall is required.

Other Playwright failures must retain their existing behavior and must not be mislabeled as a missing-browser installation problem.

## Canonical Preview Orientation

KernelCAD is Z-up. Canonical render names and descriptions must agree with the actual camera:

- `top` views the model from positive Z toward the origin.
- Exterior/underside interpretation must not be guessed from bounding boxes.
- `iso` must use the documented elevation convention consistently.
- Arbitrary pose descriptions must state that positive elevation lifts the camera toward positive Z.

If the current camera is correct but the label is wrong, fix the label. If the label is correct but the camera transform is inverted, fix the transform. The regression test must establish which component was wrong rather than changing both blindly.

## Testing

Add focused tests that prove:

1. The renderer maps only Playwright’s missing-executable failure to the new actionable diagnostic.
2. Unrelated launch errors remain distinguishable.
3. Canonical `top` and `iso` camera vectors/descriptions obey the documented Z-up convention.
4. The package dependency/lockfile representation includes the correct platform-optional Rollup packages through npm’s normal installation model.

Run the smallest relevant unit/integration suites, then the repository’s standard validation required for merging.

## Completion Criteria

- A normal dependency installation no longer leaves the existing player build missing its Rollup native package on supported platforms.
- A missing Playwright browser produces the exact recovery command without a misleading renderer diagnosis.
- Canonical camera tests prove that `top` looks from positive Z and `iso` follows the documented elevation convention.
- Existing renderer behavior remains unchanged outside these cases.
- The fixes are reviewed, committed, merged, and verified on the target branch.
