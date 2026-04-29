# Release Strategy

We use **Continuous Deployment** via GitHub Actions.
This document outlines the process for preparing and publishing new versions of kernelCAD.

## Version Numbering

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR** (x.0.0): Breaking changes, major architectural shifts
- **MINOR** (0.x.0): New features, non-breaking improvements
- **PATCH** (0.0.x): Bug fixes, performance improvements

## Branching Strategy

We follow the **Git Flow** branching model.

### Branch Roles
- **`master`**: Production-ready code. Represents the latest stable release.
- **`develop`**: Integration branch for the next release. Contains the latest development changes.
- **`feature/*`**: Feature branches branched from `develop` and merged back into `develop`.
- **`release/*`**: Release branches branched from `develop` for preparing a new production release. Merged into both `master` and `develop`.
- **`hotfix/*`**: Hotfix branches branched from `master` for critical bug fixes. Merged into both `master` and `develop`.

### Branch Protection Rules

To ensure code quality and stability, direct pushes to `master` are **disabled**.

#### `master` Branch
- **No direct pushes allowed.**
- **Pull Request Required**:
  - Must pass required status checks: **`CI / qc`** and **`CI / e2e`**.
  - Approving reviews required: **0** (solo maintainer workflow).

#### `develop` Branch
- Direct pushes are allowed.
- Pull Requests are recommended for larger changes:
  - CI checks run on PRs into `develop`.

## Release Checklist

### 1. Code Quality
- [ ] Run full QC (`npm run qc:full`)
- [ ] All tests passing (`npm test`)
- [ ] E2E tests passing (`npm run test:e2e`)
- [ ] Build succeeds (`npm run build`)
- [ ] No linting errors (`npm run lint`)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] Manual smoke test in browser

### 2. Documentation Updates
- [ ] **`CHANGELOG.md`**: Add new version entry with:
  - Version number and date
  - `Added` section for new features
  - `Changed` section for modifications
  - `Fixed` section for bug fixes
  - `Technical` section for implementation details
- [ ] **`doc/ARCHITECTURE.md`**: Update system design if changed
- [ ] **`doc/INTERFACES.md`**: Update API/Interface definitions
- [ ] **`README.md`**: Ensure installation/usage instructions are current
- [ ] **`doc/ROADMAP.md`**: Check off completed items, update priorities

### 3. Code Review
- [ ] Review all changes since last release
- [ ] Verify no sensitive data in commits
- [ ] Check for TODO/FIXME comments that should be addressed
- [ ] Ensure consistent code style across new code

### 4. Versioning
- [ ] Update `package.json` version number
- [ ] Create git tag: `git tag -a v0.x.0 -m "Release v0.x.0"`
- [ ] Push tag: `git push origin v0.x.0`

### 5. Deployment
- [ ] Build production bundle: `npm run build`
- [ ] Test production build locally
- [ ] Deploy to hosting (GitHub Pages / Vercel / etc.)
- [ ] Verify deployed version works correctly

### 6. Communication
- [ ] Update GitHub release notes (using the template below).
- [ ] Post to relevant channels (if applicable).
- [ ] Update demo/screenshots if UI changed significantly.

## Release Note Template

We use the following template for GitHub releases. This ensures consistency and highlights the value of each release.

```markdown
# 🚀 kernelCAD v{VERSION}

**Modern Programmable CAD for the Web**

---

## 📋 What's New

### Added
- **Feature Name**: Brief description of the new feature.
- **Another Feature**: Description.

### Changed
- Updated ...

### Fixed
- Resolved issue with ...

---

## ✅ Test Results

- **Unit Tests**: {PASS/FAIL} ({PASS_COUNT} passed)
- **E2E Tests**: {PASS/FAIL}
- **Linting**: {PASS/FAIL}

---

## 📦 Build Information

- **Version**: {VERSION}
- **Build Date**: {YYYY-MM-DD HH:mm:ss UTC}
- **Platform**: {OS/Browser}

## 🎯 Supported Features

kernelCAD v{VERSION} supports:

| Feature | Description | Status |
|---------|-------------|--------|
| Sketcher | 2D constraint solver | Stable |
| Extrude | 3D extrusion from faces | Stable |
| Fillet/Chamfer | Edge modifications | Beta |
| STEP Export | CNC/CAM compatibility | Stable |

---

## 📥 Installation

### Use Online
Visit [kernelcad.com](https://kernelcad.com) (or your deployment URL).

### Run Locally

```bash
git clone https://github.com/w1ne/kernelCAD.git
cd kernelCAD
git checkout v{VERSION}
npm install
npm run dev
```

---

## 📚 Documentation

- [Architecture Guide](doc/ARCHITECTURE.md)
- [Core Workflows](doc/CORE_WORKFLOWS.md)
- [Roadmap](doc/ROADMAP.md)

---

## 🐛 Report Issues

Found a bug? [Open an issue](https://github.com/w1ne/kernelCAD/issues)

## 📜 Full Changelog

See [CHANGELOG.md](CHANGELOG.md) for complete version history.
```

## Release Automation

We use a script to automate the release process, ensuring consistent versioning and note generation.

```bash
# To create a new release (e.g., minor version bump)
npm run release -- minor
```

To enforce the full checklist gate (including Playwright E2E and a production build), run:

```bash
npm run release -- minor --full
```

This script will:
1. Run linting and tests.
2. Bump the version in `package.json`.
3. Generate `RELEASE_NOTES.md` populated with recent commits.
4. Create a git tag.
5. Push changes and tags to remote.

- [ ] Monitor for critical bugs
- [ ] Triage user feedback
- [ ] Plan next version milestones

## Emergency Hotfix Process

For critical bugs requiring immediate patching:

1. Create hotfix branch from `master`: `git checkout -b hotfix/v0.x.1`
2. Fix the bug with minimal changes
3. Update `CHANGELOG.md` with patch notes
4. Bump patch version in `package.json`
5. Merge to `master` and tag immediately
6. Deploy ASAP
7. Backport fix to `develop` if using gitflow

## Release Automation (Future)

Consider automating with GitHub Actions:
- Automatic version bumping
- CHANGELOG generation from commits
- GitHub release creation
- Deployment triggering
