## Implementation IP Boundary

kernelCAD's implementation is clean-room and independent. Contributors must not paste source material from any commercial CAD product or any GPL/copyleft codebase into kernelCAD code or commits.

Architectural inspiration from public documentation of other CAD systems (Autodesk Fusion 360 published API docs, OpenCASCADE source, Replicad source, public CAD literature) is welcome; literal code copying is not.

When in doubt about the provenance of a snippet you want to use, ask in a PR comment before committing.

## Developer Certificate of Origin (DCO)

All contributions must be signed off under the [Developer Certificate of
Origin 1.1](https://developercertificate.org/). By signing off you certify
that you wrote the contribution (or have the right to submit it) and that it
may be distributed under the project's license.

Add a `Signed-off-by` line to every commit:

```bash
git commit -s -m "feat: my change"
```

This appends:

```
Signed-off-by: Your Name <your.email@example.com>
```

The name and email must match the commit author. CI rejects PRs containing
commits without a sign-off. To fix existing commits:

```bash
git rebase --signoff develop && git push --force-with-lease
```

## Release Hygiene

See [docs/release-hygiene.md](docs/release-hygiene.md) before publishing a
release. A pushed tag is not enough; `package.json`, the local tag, the remote
tag, the GitHub Release, and GitHub's `Latest` marker must all agree. The final
verification command is:

```bash
npm run test:release-hygiene
```

## Trademark

The MIT license covers the code only. Use of the kernelCAD name and logo is
governed by [TRADEMARKS.md](TRADEMARKS.md).
