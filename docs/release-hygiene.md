# Release Hygiene

kernelCAD releases have two public surfaces:

- the git tag, for source checkouts and package provenance
- the GitHub Release, for the release page and the `Latest` marker users see

A release is not complete until both surfaces agree with `package.json`.

## Required Final Check

After merging the release PR and pushing the tag, run:

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

Use this checklist when publishing outside `npm run release`:

```bash
git fetch origin --tags
git tag vX.Y.Z <merged-develop-commit>
git push origin vX.Y.Z
gh release create vX.Y.Z --title "vX.Y.Z — <release title>" --notes-file RELEASE_NOTES.md --latest
npm run test:release-hygiene
```

Do not report a release as published after only pushing `vX.Y.Z`; that leaves
GitHub Releases stale even though the tag exists.
