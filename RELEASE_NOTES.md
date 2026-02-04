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
