# 🚀 kernelCAD v0.4.0

**Modern Programmable CAD for the Web**

---

## 📋 What's New

- docs(demos): capture v0.4 rocket keychain (300cd8f)
- fix(ui): satisfy command palette dialog accessibility (2a10964)
- test: remove dead skips and harden codegen assertions (d41a745)
- docs(testing): audit test suite quality risks (1e315db)
- refactor(v0.4): harden rocket proof and demo framing (c89b747)
- docs(demos): capture v0.4 rocket keychain (9ff9a16)
- feat(demo): add v0.4 rocket keychain script (941273a)
- docs(skill): document constrained sketch tools (37c91b9)
- test(mcp): prove constrained sketch round trip (319a829)
- test(constraints): prove v0.4 rocket sketch solve (d0769e8)
- refactor(mcp): centralize tool registry (295cb51)
- feat(mcp): add sketch constraint commands (1727f0c)
- feat(constraints): expose complete solver toolbar actions (#86) (0cd569b)
- feat(constraints): add concentric and symmetry solver support (#85) (3042c07)
- Fix npm global install runtime deps (#84) (d9a4750)
- Remove internal solution label from v0.3 demo (#83) (72e89ec)
- Fix v0.3 demo video artifacts (#82) (70e526d)

---

## ✅ Test Results (Automated)

- **QC Check**: Passed (Linting & Build)
- **Unit Tests**: Ran successfully
- **E2E Tests**: Manual verification recommended

---

## 📦 Build Information

- **Version**: 0.4.0
- **Build Date**: 2026-05-06 23:42:35 UTC
- **Platform**: Web / linux

## 🎯 Supported Features

kernelCAD v0.4.0 supports:

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
git checkout v0.4.0
npm install
npm run dev
```

---

## 🐛 Report Issues
Found a bug? [Open an issue](https://github.com/w1ne/kernelCAD/issues)
