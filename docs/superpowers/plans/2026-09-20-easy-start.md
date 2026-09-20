# Easy start implementation plan

Goal: let a new visitor change and download a useful part without an account.
Architecture: a public start page uses curated model builders and the existing GeometryEngine worker. A small preview renders its face buffers. Existing full Studio routes and hosted generation retain their current authentication and billing.
Tech stack: React, TypeScript, Three.js, existing OpenCascade worker, Vitest, Playwright.

- [x] Add `src/studio/start/starterModels.ts`: bounded dimensions and source builders for the three examples.
- [x] Add `useStarterModel.ts`: debounced worker execution, stale-result protection, last-good result, undo and guarded export. Test edits, failure, stale responses and download against the current source.
- [x] Add `StarterPreview.tsx` and `StartPage.tsx`: three visual examples, short labels, sizes, undo and free downloads. Use a prompt form that forwards to `/generate?prompt=...`.
- [x] Route ordinary `/` visits to StartPage; retain existing script/gallery/headless Studio entry behavior. Update the root-route contract test.
- [x] Shorten homepage and generation copy; link the browser trial clearly.
- [x] Run focused tests, lint and production build. Verify real browser edits and file downloads at desktop and mobile widths.
- [ ] Review, commit, create PR, pass required checks, merge and verify deployed app and marketing page.

Validation: 46 focused tests pass, including 12 real OCCT size/connectivity checks. The saved Playwright test passes with real worker evaluation, three resized STL exports, three STEP exports, Undo, and a 390px layout check. All changed TypeScript passes focused ESLint. Local production build passes. Remote CI/deployment are next.
