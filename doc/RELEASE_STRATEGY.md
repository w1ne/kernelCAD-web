# Release Strategy

We use **Continuous Deployment** via GitHub Actions.
This document outlines the process for preparing and publishing new versions of kernelCAD.

## Version Numbering

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR** (x.0.0): Breaking changes, major architectural shifts
- **MINOR** (0.x.0): New features, non-breaking improvements
- **PATCH** (0.0.x): Bug fixes, performance improvements

## Release Checklist

### 1. Code Quality
- [ ] All tests passing (`npm test`)
- [ ] E2E tests passing (`npm run test:e2e`)
- [ ] Build succeeds (`npm run build`)
- [ ] No linting errors (`npm run lint`)
- [ ] No TypeScript errors (`npx tsc --noEmit`)
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
- [ ] Update GitHub release notes
- [ ] Post to relevant channels (if applicable)
- [ ] Update demo/screenshots if UI changed significantly

## Post-Release
- [ ] Monitor for critical bugs
- [ ] Triage user feedback
- [ ] Plan next version milestones

## Emergency Hotfix Process

For critical bugs requiring immediate patching:

1. Create hotfix branch from `main`: `git checkout -b hotfix/v0.x.1`
2. Fix the bug with minimal changes
3. Update `CHANGELOG.md` with patch notes
4. Bump patch version in `package.json`
5. Merge to `main` and tag immediately
6. Deploy ASAP
7. Backport fix to `develop` if using gitflow

## Release Automation (Future)

Consider automating with GitHub Actions:
- Automatic version bumping
- CHANGELOG generation from commits
- GitHub release creation
- Deployment triggering
