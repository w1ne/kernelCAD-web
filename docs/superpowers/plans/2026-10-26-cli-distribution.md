# KernelCAD CLI Distribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore `kernelcad` npm releases and make GitHub Release downloads install and run without a system Node.js runtime across Linux, macOS, and Windows.

**Architecture:** Use one stable `vX.Y.Z` tag as the source for the npm package and all direct-download artifacts. Keep the existing CLI and release archive, build native dependency trees on native GitHub-hosted runners, include the Node runtime in each archive, and install through POSIX and PowerShell scripts. Publish npm only after archive creation succeeds, using OIDC Trusted Publishing.

**Tech Stack:** GitHub Actions, Node.js 22.22.0 for CLI artifacts, Node.js 24/npm 11.5.1+ for OIDC publishing, npm, Koffi, POSIX shell, PowerShell, GitHub Releases, GitHub artifact attestations.

---

## Reviewed design and release constraints

- Existing package version and latest GitHub release are `0.17.2`; that tag predates the STEP importer merge. Target `v0.17.3` for this additive CLI distribution release. A `v0.18.0` release requires a proof-backed v0.18 hero, which the retained STEP smoke demo does not provide.
- npm currently serves `0.15.0`, and README says npm is unsupported. This work intentionally changes that policy, as requested.
- The existing archive workflow builds only Linux x64, while `install.sh` claims macOS and Linux ARM support and requires system Node. All docs and installers must match the artifacts actually built.
- npm Trusted Publishing needs an owner-side configuration matching `w1ne/kernelCAD-web` and the `release-archive.yml` workflow. The workflow will use GitHub OIDC and no long-lived publish token.
- Do not publish the retained importer video to the marketing site or promote it as the proof-backed v0.18 hero.

## Files and responsibilities

- `.github/workflows/release-archive.yml`: native platform build matrix, release asset upload, checksums, and provenance.
- `scripts/build-release-archive.mjs`: stage CLI files, production dependencies, embedded Node runtime, and platform launcher; produce the platform archive.
- `scripts/install.sh`: POSIX download, checksum verification, installation, and PATH guidance without requiring system Node.
- `scripts/install.ps1`: matching Windows x64 installation flow.
- `w1ne/kernelCAD-server/product-web/site/install.sh` and `install.ps1`: deployed installer endpoints; update the corresponding `scripts/` copies and `docs/product-web-source-manifest.json` in a separate PR after syncing from the public installer source.
- `scripts/release.ts`, `README.md`, and `docs/release-hygiene.md`: document npm and direct-download installation from one version tag.
- The existing `docs/demos/v0.17/turbojet` hero remains selected by the patch-release preflight; no new hero or copied video is needed.

## Task 1: Build portable per-platform release archives

**Files:**
- Modify `scripts/build-release-archive.mjs`
- Modify `.github/workflows/release-archive.yml`

- [x] Define the target identifiers `linux-x86_64`, `linux-aarch64`, `darwin-x86_64`, `darwin-arm64`, and `windows-x86_64` in one matrix.
- [x] Run each target on its native GitHub-hosted runner so `npm ci` installs Koffi for that target.
- [x] Copy `process.execPath` into `runtime/node` or `runtime/node.exe` and make the platform launcher use that bundled runtime.
- [x] Keep POSIX output as `.tar.gz`; produce Windows output as `.zip` with `bin/kernelcad.cmd`.
- [x] Upload each archive as a workflow artifact. A final release job downloads them, creates `SHA256SUMS`, creates or reuses the GitHub Release, uploads all archives plus the checksum manifest, and attaches GitHub build-provenance attestations.
- [ ] Confirm generated asset names and embedded runtime paths with archive-listing commands; do not run the CLI test suite in this task.

## Task 2: Install and verify direct-download archives

**Files:**
- Modify `scripts/install.sh`
- Create `scripts/install.ps1`

- [x] Map POSIX OS/architectures only to archive names produced by Task 1.
- [x] Remove the requirement for system `node`; the installed launcher must invoke the archive's bundled runtime.
- [x] Download `SHA256SUMS` and the platform archive, verify its SHA-256 with `sha256sum` or `shasum`, and reject a mismatch before extraction.
- [x] Preserve version pinning through `KERNELCAD_VERSION`, latest-release resolution, and the existing user-local install layout.
- [x] In PowerShell, support Windows x64, verify the archive checksum with `Get-FileHash`, install under the user's local KernelCAD versions directory, add a `.cmd` launcher, and give user-scope PATH guidance.
- [x] Make unsupported platforms fail with the exact supported platform list.

## Task 3: Restore npm as a supported release channel

**Files:**
- Modify `.github/workflows/release-archive.yml`
- Modify `README.md`
- Modify `docs/release-hygiene.md`
- Modify the install section generated by `scripts/release.ts`

- [x] Add an npm publish job to `release-archive.yml` with a dependency on the job that uploads all archives and attestations. This keeps one workflow and prevents an npm-only partial release.
- [x] Check out the triggering tag SHA and fail if the tag version differs from `package.json` or the release is a prerelease.
- [x] Use a GitHub-hosted runner, Node.js 24 with npm 11.5.1 or newer, job-scoped `id-token: write`, and `npm publish`; use no long-lived npm write token.
- [x] Build the package before publishing and let `prepublishOnly` generate its packaged catalog assets.
- [x] Update README instructions with both `npm install --global kernelcad` (Node.js 22.12+) and the direct installer (no system Node).
- [ ] Configure the npm Trusted Publisher against `w1ne/kernelCAD-web` and the exact workflow filename `release-archive.yml` before the first publish.
- [ ] Update release notes and hygiene docs so npm and the GitHub Release are both required outputs of the same tag.
- [ ] Check the npm package payload with `npm pack --dry-run`; do not publish from this feature branch.

## Task 4: Prepare the importer feature release

**Files:**
- Modify the `Install And Upgrade` section generated by `scripts/release.ts`
- Modify `README.md`

- [x] Make generated release notes list both npm and direct-installer commands, pinned to the same version.
- [x] Keep the current v0.17 hero for the additive `v0.17.3` patch release; do not misclassify the importer smoke demo as fabrication proof.
- [ ] After the distribution PR is merged and the npm Trusted Publisher is configured, create `v0.17.3` through the repository release process. Do not publish from this feature branch.

## Task 5: Review and hand off the release

- [ ] Inspect the final diff for package contents, runner/architecture alignment, checksum validation, OIDC permissions, and accurate README claims.
- [ ] Use the repository's normal CI required checks before merging; do not manually run tests in this session.
- [ ] After merge, confirm the npm owner has configured the Trusted Publisher for `release-archive.yml`; publish `v0.17.3` only after the archive workflow succeeds.
- [ ] Verify the `kernelcad@0.17.3` registry version and all five GitHub Release archives, checksums, and attestations before reporting distribution complete.

## Task 6: Sync the production installer endpoints

**Repository:** `w1ne/kernelCAD-server`

- [ ] Copy the reviewed POSIX installer to `product-web/scripts/install.sh`, `product-web/site/install.sh`, and `runtime-source/scripts/install.sh`.
- [ ] Add the PowerShell installer to `product-web/scripts/install.ps1` and `product-web/site/install.ps1`.
- [ ] Update `docs/product-web-source-manifest.json` and `docs/runtime-source-source-manifest.json` hashes and source revision for all changed snapshot files.
- [ ] Confirm `/install.sh` and `/install.ps1` are deployed from `product-web/site/`, and let private-product CI verify snapshot consistency before merge.

## Self-review checklist

- The single release tag is the shared version source for npm, archives, installer pins, and release notes.
- npm publication waits for successful archive publication, avoiding an npm-only partial release.
- Archive packaging runs on the target OS/architecture and carries the native Koffi module from that runner.
- The Node runtime is included; the README and installer will no longer make contradictory Node-version claims.
- Installer claims are restricted to generated artifact targets.
- The posted-video concern is respected: existing source video is referenced, and no marketing publish is in scope.
