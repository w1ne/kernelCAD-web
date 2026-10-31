# kernelCAD v0.17.3

## Summary

Ships the CLI as self-contained platform archives with a bundled Node.js runtime, adds a warm document session that rebuilds only downstream features, and makes mates and exports follow topology through parameter edits.

## Highlights

### Distribution

- Self-contained release archives for Linux x86_64, Linux aarch64, macOS x86_64, macOS arm64 and Windows x86_64, with `SHA256SUMS` and build-provenance attestations (#1145).
- `install.sh` and `install.ps1` verify the archive checksum and install without a separately installed Node.js.
- The npm package is published from the same tag through npm Trusted Publishing.

### Kernel and evaluation

- Warm document session: a parameter edit rebuilds only the downstream features (#1146, #1147); caches and OCCT handles are bounded to stop evaluator memory growth (#1153).
- smlibwasm 0.6.0 with `moveFaces` / `offsetFaces` and history selection (#1148).
- A script that returns an array keeps every solid, and the viewer body count matches the STEP solid count (#1156, #1155).
- Actionable guards for NaN/undefined transforms, `ParamRef` in `scale`, and a hollow-shell fallback when `MakeThickSolid` fails (#1161, #1162, #1163).
- Mechanism physics runtime is injected rather than imported (#1142).

### Mates and topology

- Topology connectors re-resolve after a parameter edit (#1149).
- `hole-axis` connectors follow an authored `.hole()` / `.holes()` (#1151).

### Import and export

- STEP assemblies import into kernelCAD bundles; `fromSTEP` gets a solid picker, STEP length units and a SolidWorks-native refusal (#1144, #1050).
- Single-shape STEP exports are verified (#1143).
- glTF materials are named from finish, colour and part; GLB exports carry mate-driven rig pivots (#1157, #1160).

### MCP and agents

- Versioned asset manifest contract: `meta()`, `presets()` and the read-only `asset_manifest` MCP tool (#1159).
- MCP tool titles and `idempotentHint` annotations (#1164).

### Quality gates

- SolidCraft oracle ledger in CI (#1150).
- CadGenBench keeps failed edit scripts and checks generation ledgers (#1154).
- GT2 belt cookbook wraps as an exact revolve (#1095); roboto-01 exact reimport verified (#1134).

## Install and upgrade

```bash
curl -fsSL https://kernelcad.com/install.sh | sh
```

Pin this release:

```bash
curl -fsSL https://kernelcad.com/install.sh | KERNELCAD_VERSION=v0.17.3 sh
```

Windows:

```powershell
irm https://kernelcad.com/install.ps1 | iex
```

npm:

```bash
npm install --global kernelcad@0.17.3
```

## Links

- Web app: https://kernelcad.com
- Source and issues: https://github.com/w1ne/kernelCAD-web
- Full changelog: https://github.com/w1ne/kernelCAD-web/compare/v0.17.2...v0.17.3
