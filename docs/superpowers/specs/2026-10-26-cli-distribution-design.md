# KernelCAD CLI Distribution Design

## Status

Proposed implementation of the user-approved dual-channel direction: retain npm for Node and agent users, and offer downloads that run without a preinstalled Node.js runtime.

## Current state

- `package.json` names the package `kernelcad`, exposes the `kernelcad` executable, and declares Node.js `>=22.12.0`.
- The public npm package stops at `0.15.0`; the repository and GitHub Release are at `0.17.2`. The importer was merged after the `v0.17.2` tag, so that tag does not include it.
- The root README currently says npm is unsupported. Re-enabling npm is an explicit distribution-policy change.
- The release flow creates GitHub Releases and builds a CLI archive, but the archive workflow currently emits only `linux-x86_64`.
- `scripts/install.sh` advertises Linux x64/ARM64 and macOS Intel/ARM64, yet requires an installed Node.js runtime. The README says Node 20 is enough, while `package.json` requires Node 22.12 or newer.
- The repository has no npm publishing workflow. The release script does not publish to npm.

## Goals

1. Make `kernelcad` on npm a supported, current install channel for Node developers and agent workflows.
2. Keep GitHub Releases and `install.sh` as the direct-download channel, and make their supported platform claims accurate.
3. Offer archives that include a compatible Node runtime so direct-download users do not need to install Node separately.
4. Publish package and archive artifacts from the same stable release tag, with checksums and verifiable build provenance.
5. Keep the importer video and retained evidence as release/demo assets; do not create a marketing post or upload a duplicate video.

## Distribution choices

### npm package

Reuse the existing `kernelcad` package and its `bin` command instead of introducing a second CLI package. Publish only stable version tags, after the package build and release checks succeed. Configure npm Trusted Publishing from the public GitHub Actions workflow using OIDC; do not add a long-lived npm publish token. The package owner must configure the trusted publisher for the exact repository and workflow before the first publish.

The next release containing the STEP importer is `0.18.0`: it adds a user-facing CLI capability after the already-tagged `0.17.2`. A minor release must satisfy the repository's versioned demo preflight. Reuse the retained importer evidence without publishing its video as marketing content.

### Direct-download bundles

Keep GitHub Releases as the source of downloadable artifacts. Build each archive on a native GitHub-hosted runner so Koffi's platform-specific native module is installed for the target OS and architecture. Include the Node.js runtime, CLI bundle, production dependencies, required assets, notices, and a platform launcher.

Initial platform matrix:

- Linux x64 and ARM64
- macOS Intel and Apple Silicon
- Windows x64

Keep `install.sh` for POSIX platforms and add a PowerShell installer for Windows. Publish SHA-256 checksums and GitHub artifact attestations for each archive. Native Apple notarization and Windows Authenticode signing require separate signing identities and are outside this first implementation; do not describe the archives as OS-signed until those are configured.

### Release source of truth

One `vX.Y.Z` tag identifies the npm package and every platform archive. Release automation must verify that the tag matches `package.json`, build from that tag, publish all artifacts, and fail on missing platform outputs. Installer examples and compatibility text must derive from the same release version and supported matrix.

## Alternatives considered

1. **npm only:** smallest change and useful for developers, but retains a Node prerequisite and does not serve ordinary CAD users well.
2. **Direct downloads only:** consistent with the current README and release script, but leaves the existing npm package stale and removes a familiar path for agent developers.
3. **Dual channel (selected):** npm serves Node users; GitHub archives serve users who want a self-contained install. Both are versioned from one release tag.

## Out of scope

- Homebrew, WinGet, Conda, apt, and other third-party package-manager formulas.
- A new web-based STEP import flow.
- Promotional publication of the retained demo video.
- Native code signing until signing credentials are available.

## Acceptance criteria

- The published npm version matches the stable GitHub Release version and contains the `kernelcad` executable, including `import-step`.
- `npm install -g kernelcad` works on the declared Node.js minimum.
- Each advertised direct-download platform has a matching archive that starts without a system Node.js installation.
- Each archive has a checksum and GitHub provenance attestation; the installers verify downloaded archive integrity before installation.
- `install.sh`, the Windows installer, README installation instructions, package engine requirements, and release metadata agree on supported versions and platforms.
- A release cannot be reported complete if npm publication or any required platform artifact is missing.

## Operational prerequisites and risks

- The npm owner must add a Trusted Publisher entry matching `w1ne/kernelCAD-web` and the chosen publishing workflow. npm's current OIDC flow requires GitHub-hosted Actions, Node.js 22.14 or newer, npm CLI 11.5.1 or newer, and `id-token: write`; this repository currently has neither the publisher workflow nor an npm trust configuration visible to this checkout.
- The current published npm version is `0.15.0`; the next feature release must not attempt to overwrite that version or the existing GitHub `v0.17.2` tag.
- Building five native platform bundles increases CI time and archive storage. Each artifact must be built on its target OS/architecture rather than copying Linux `node_modules` into other archives.
- GitHub artifact attestations establish build provenance. They do not replace Apple notarization or Windows Authenticode signing.

## Source references

- npm Trusted Publishing: https://docs.npmjs.com/trusted-publishers/
- npm executable packaging: https://docs.npmjs.com/cli/v8/configuring-npm/package-json
- Koffi supported platforms: https://koffi.dev/
- FreeCAD download formats: https://www.freecad.org/downloads.php
- CadQuery pip/conda distribution: https://cadquery.readthedocs.io/en/stable/installation.html
