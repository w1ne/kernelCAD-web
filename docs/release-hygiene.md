# Release Hygiene

kernelCAD releases have three public surfaces:

- the npm package, for Node.js users
- the GitHub Release, for self-contained platform archives, checksums, and provenance
- the git tag, which identifies the source used for both distribution channels

A release is not complete until the npm version and every required GitHub
artifact match the same stable git tag and `package.json` version.

## Required Final Check

After merging the release PR and pushing the tag, the `Release archive` workflow
builds all platform archives, attaches checksums and provenance, then publishes
the package through npm Trusted Publishing. A release is complete only after
that workflow succeeds and the npm version and GitHub assets are visible.

The repository audit remains useful for tag and GitHub release consistency:

```bash
npm run test:release-hygiene
```

That command fails if:

- `package.json` is ahead of the highest local stable tag
- `package.json` is ahead of the highest remote stable tag on `origin`
- the matching GitHub Release is missing
- the matching GitHub Release is a draft or prerelease
- GitHub's latest release tag is not the package version tag

## Manual Release Checklist

Use this checklist when creating a tag outside `npm run release`:

```bash
git fetch origin --tags
git tag vX.Y.Z <merged-develop-commit>
git push origin vX.Y.Z
gh release create vX.Y.Z --title "vX.Y.Z — <release title>" --notes-file RELEASE_NOTES.md --latest
npm run test:release-hygiene
```

Pushing the tag starts the release workflow. Do not report the release as
published until the workflow succeeds, the npm version is visible, and the
expected platform archives, `SHA256SUMS`, and build-provenance attestations are
attached to the GitHub Release. The npm owner must configure the Trusted
Publisher for `w1ne/kernelCAD-web` and `.github/workflows/release-archive.yml`
before the first publish.
