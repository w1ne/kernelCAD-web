// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/vitest.setup.ts
//
// Global test bootstrap. Production defaults the remote parts tier to the
// step.parts public catalog, but the test suite must stay hermetic — no live
// catalog calls. Default it OFF here so any unmatched part lookup fails closed
// with `parts.fetch.remote-disabled` instead of hitting the network. Tests that
// exercise remote behavior opt in explicitly (delete this var or pass
// partsBaseUrl) and mock `fetch`. See src/modeling/parts/remoteClient.ts.
process.env.KERNELCAD_PARTS_BASE_URL ??= 'off';

// Install the node host capabilities for the whole suite.
//
// Filesystem-backed modeling features (referenceImage existence + pixel-size
// probing, lib.fromSTEP/fromSTL, TTF fonts, the parts catalog) now reach node
// through explicit ports rather than bare `node:fs` imports, so that the
// modeling API can also be bundled for a browser. Node ENTRY POINTS install the
// implementation; `runScript.ts` does it for anything that runs a user script.
// Tests, though, frequently poke `CaptureSession` / `createApi` directly without
// going through an entry point, so install here too — otherwise those tests
// would silently observe browser-shaped behaviour.
//
// Tests that WANT browser-shaped behaviour opt out explicitly with
// `__setHostFsForTest(null)` — see src/modeling/runtime/browserRuntime.test.ts.
import '../src/modeling/runtime/hostFsNode';
import '../src/shared/runtime/kernelcadVersionNode';

// --- Global test-isolation teardown ------------------------------------------
// vitest runs many test FILES in the same worker process. Global mutations made
// by one file — a `vi.stubGlobal`, a stubbed `fetch`/`window`, leftover fake
// timers — can survive into a sibling file and break it. This is the class of
// bug that let `embed.test.tsx` poison `GeometryContext.test.tsx`: embed left
// global pollution behind, and GeometryContext then asserted on a fresh `fetch`
// and a clean `window`.
//
// WHY TWO HOOKS (and not one blanket afterEach):
// A blanket per-test `afterEach` that calls `unstubAllGlobals`/`restoreAllMocks`
// BREAKS legitimate suites that install a stub or spy ONCE in `beforeAll` and
// rely on it across every `it` in the file — verified empirically:
//   * geometryEngine.test.ts stubs `Worker` at file scope (vi.stubGlobal),
//   * ShapeGeometry.test.tsx / cli export.test.ts spy on console in beforeAll
//     and then assert on `errSpy.mock.calls` in later tests.
// Undoing those after the FIRST test fails every later test in that same file.
//
// The leak we must stop is strictly CROSS-FILE, so the scrub belongs at the
// FILE boundary, not between a file's own tests. A top-level hook in a setupFile
// is registered per test file, so the `afterAll` below runs once — after the
// last test of each file — never between a file's own tests. That undoes the
// pollution before vitest reuses the worker for the next file, while leaving
// each file's own beforeAll stubs/spies untouched for the file's lifetime.
//
// Empirically (vitest 4, isolate=false worker reuse): without this scrub a
// `vi.stubGlobal` set in file A is still present in file B; with it, B sees a
// clean global. vitest 4 already auto-restores `vi.spyOn` and fake timers at the
// file boundary, but does NOT auto-undo `vi.stubGlobal` — so `unstubAllGlobals`
// here is the load-bearing call. The `restoreAllMocks`/`useRealTimers` calls are
// kept as belt-and-suspenders (harmless at the file boundary) so this stays
// correct even if the suite later runs with `unstubGlobals`/timer auto-reset off.
import { afterAll, afterEach, beforeEach, vi } from 'vitest';

// Pristine `fetch`, captured at setup-file load — before ANY test file runs, so
// it is the environment's real binding, never a mock. See the beforeEach below.
const PRISTINE_FETCH = globalThis.fetch;

// Per-TEST: reset `fetch` to its pristine binding before every test. Some files
// mock fetch with a raw `global.fetch = vi.fn()` and "restore" to a value they
// captured at module load — which can itself already be a leaked mock, so the
// `vi.unstubAllGlobals()` scrub below (which only undoes vi.stubGlobal) can't
// catch it. A sibling's leaked fetch then bleeds into a test that sets up no
// fetch of its own (e.g. GeometryContext's zero-geometry case received another
// file's "Not JSON" mock). Resetting here makes every test see fetch exactly as
// it would in isolation. Targeted to `fetch` ONLY, so it cannot disturb the
// file-scope `beforeAll` stubs of OTHER globals (e.g. geometryEngine's `Worker`
// stub) that the file-boundary design above deliberately preserves — verified
// no test installs `fetch` in a `beforeAll`.
beforeEach(() => {
    globalThis.fetch = PRISTINE_FETCH;
});

// Per-TEST: only the idempotent timer reset. `useRealTimers()` is a no-op when
// real timers are already active, so it is safe to run after every test and
// cannot disturb file-scope setup. It guards against a fake-timer leak if a test
// throws before its own cleanup runs.
afterEach(() => {
    vi.useRealTimers();
});

// Per-FILE boundary scrub (see header). Runs once after the last test in each
// file, so it never tears down a file's own beforeAll stubs/spies mid-file.
afterAll(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals(); // load-bearing: vitest 4 does not auto-undo stubGlobal
    vi.restoreAllMocks(); // belt-and-suspenders: undo any leaked vi.spyOn
});
