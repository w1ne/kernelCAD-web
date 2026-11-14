# Electronics keyboard material and layout handoff

## Change

This round promotes the existing `electronics/keyboard` source in place. It
keeps the compact, tenkeyless and full layout choice, but long rows now resolve
to separate keycaps, the navigation cluster and number pad have distinct key
positions, and selected caps carry small printed legend marks. Four controls
name the actual material zones: `caseABS`, `keycapPBT`, `accentPBT` and
`legendInk`. The `retro`, `white` and `gamer` presets change all four together.

The default tenkeyless model is 1,360 triangles under a 2,000-triangle budget.
The retained variants are 1,360 triangles (retro), 1,036 (compact/white) and
1,540 (full/gamer). No kit or asset IDs were added or renamed.

## Demo bundle

- [15-second MP4](./keyboard-material-controls.mp4) shows the default layout,
  `retro` preset, compact/white variant, full/gamer variant, and the local
  catalog quality result.
- [Variant capture source](./captureVariants.ts) applies recorded parameter
  values to the existing `.kcad.ts`, exports the low-poly GLB and rasterizes its
  triangles.
- [Video composition source](./build_video.py) and [invocation record](./invocation.txt)
  retain the MP4 settings and commands.
- [Variant settings, triangle counts and PNG hashes](./variants.json) bind the
  demo renders to the keyboard source hash. Individual renders and sampled MP4
  frames are retained in this directory.

## Verification

- The stricter catalog gate reports **12/12 electronics assets passing
  (100.00%)**. Across the catalog it reports **2,401/2,402 passing (99.96%)**;
  the sole remaining strict-gate gap is `interior/table-lamp`.
- `npx eslint catalog/kits/electronics/` is clean.
- `npx vitest run tests/integration/catalog/` passes: 4 files, 15 tests.
- A source/index/preview audit reports **2,402 assets across 50 kits, zero
  source SHA mismatches and zero missing preview references or files**. The
  electronics kit has 12/12 preview files; the keyboard index row records its
  current SHA, 1,360 triangles, a 2,000-triangle budget and the three presets.
- The full 2,402-preview refresh completed; after the last preset color change,
  the keyboard preview was regenerated once more and the catalog index rebuilt.

Visual review: the keyboard preview reads as a low-profile desktop keyboard;
the split keys, wide space bar, accent keys and pale legend marks are distinct.
The retro frame separates a warm brown shell from cream keycaps and orange
accents; the white frame has a visible gray shell, off-white keycaps and blue
accents; the full/gamer frame adds a separate number pad and bright green keys.
The reviewed CRT preview reads as a brown-bodied television with screen, dials
and antenna; the desktop tower reads through its front bays, vents and blue
power indicator.

## Provenance and limits

The MP4 is a local source-variant replay rendered from low-poly GLBs. Its
captions say that it is not a deployed browser capture. The public catalog page
was not redeployed in this branch, and the visualization does not establish a
vendor product match, manufacturing specification or physical acceptance.
