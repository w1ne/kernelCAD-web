---
name: kernelcad-parts
description: Bundled parts catalog — discover, fetch, and mate standard fasteners, bearings, motors, headers, and connectors. Use whenever the model needs an off-the-shelf component instead of hand-modeled placeholder geometry.
---

# kernelcad-parts

Load this skill when the agent needs an off-the-shelf component (M-series
fastener, deep-groove ball bearing, NEMA stepper, pin header, JST-XH housing)
and does not already know a STEP file path.

The catalog ships **bundled** with the npm package — `npm install` resolves
every bundled id offline. When a query has no bundled match, discovery and
fetch fall through to a built-in public parts catalog by default (see "Remote
tier" below), so kernelCAD can find off-the-shelf parts it does not bundle.
Set `KERNELCAD_PARTS_BASE_URL=off` to stay offline on the bundled seed only.

## Four-tool discovery flow

When the agent does not know which id covers the intent, walk the discovery
chain. Each step narrows the search:

1. `inspect({ of: 'part-categories' })` → top-level buckets (e.g. `fastener`, `bearing`,
   `motor`, `connector`, `shaft`).
2. `inspect({ of: 'part-families', category })` → families within the bucket
   (e.g. `socket-head-cap-screw`, `deep-groove-ball-bearing`).
3. `find_part` `{ query, family?, standard?, tag?, licenseClass? }` → ranked
   records that match the fuzzy query plus filters. Tokens AND-combine;
   cross-facet filters AND-combine. `licenseClass` (`'permissive'` |
   `'share-alike'` | `'fetch-only'`) filters by redistribution license; records
   with no class are treated as `permissive` (the bundled catalog).
4. `fetch_part` `{ id }` → resolves the id to a record, writes the STEP into
   the cache, returns the cache path + sha256.

For tasks where the id is already known, skip straight to `fetch_part` or
use the typed `lib.standard.*` shortcuts.

### Fetch-by-URL (parts not in the catalog)

For a hash-verified STEP or GLB model file, call `fetch_part` with
`includeModel: true` or a `model` object:
`fetch_part({ model: { url, sha256, source, license, expectedBboxMm? } })` for a
direct asset, or `fetch_part({ id, includeModel: true })` / `{ query: <MPN>,
includeModel: true }` to resolve through the catalog. Explicit URLs require a
64-character `sha256` and `source`/`license` provenance. The tool caches
URL-fetched assets by content digest and compares STEP bounds, or GLB POSITION
accessor bounds when present, dimension-by-dimension with `expectedBboxMm`
(default relative tolerance 25%, `toleranceRatio` to change it). A GLB without
usable accessor bounds reports `not_checked`; missing or ambiguous catalog
results are returned with a specific `errorCode`. This resolves a model asset
but does not place it or perform a fit check.

`fetch_part { url }` pulls geometry on demand from an **allowlisted** host
(GitHub/GitLab raw + release-asset hosts and the kernelCAD parts host) — it is
cached locally, never re-hosted (`redistribution: 'fetch-only'`):

- A `.step`/`.stp` URL → inspected, connectors synthesized, returned as a record.
- A `.stl`/`.dae`/`.obj` URL → returned as a `mesh-import` handle (non-BREP,
  `attributes.geometryKind = 'mesh'`) for blockout/reference.
- A **vendor configurator** URL (igus/MISUMI/Pololu/TraceParts) → NOT fetched;
  returns `{ kind: 'link_out', url, instruction }`. Download the STEP from the
  configurator and ingest it locally with `fetch_part { file }`.
- A disallowed host → `{ error: 'url_host_not_allowed' }`.

## Authoring surface

Inside a `.kcad.ts` script, three entry points cover the matrix:

```typescript
// 1. Generic verbs — work for ANY id (bundled or remote).
const motor = await lib.fetchPart('nema-17');
const matches = await lib.findPart('M3 screw');

// 2. Typed shortcuts — bundled-only, autocomplete-friendly.
const bolt    = await lib.standard.boltSHCS({ thread: 'M3', lengthMm: 12 });
const nut     = await lib.standard.nutHex({ thread: 'M3' });
const washer  = await lib.standard.washerFlat({ thread: 'M3' });
const bearing = await lib.standard.bearing608();
const stepper = await lib.standard.nema17();
const header  = await lib.standard.pinHeader254({ pins: 8 });
const conn    = await lib.standard.jstXH({ pins: 4 });

// 3. Table-driven fasteners (lib.part / lib.stack) and hole-driven insert.
const screw   = await lib.part({ family: 'socket-head-cap-screw', thread: 'M5', lengthMm: 16 });
const stack   = await lib.stack({ thread: 'M5', gripMm: 10, mode: 'bolt' });
const fitted  = await lib.insert(plate, { diameterMm: 5.5, family: 'socket-head-cap-screw', mode: 'bolt' });

// 4. Machining-fixture hardware (same lib.part path, fixture families).
const tNut    = await lib.part({ family: 't-slot-nut', thread: 'M10' });
const stud    = await lib.part({ family: 'clamping-stud', thread: 'M10', lengthMm: 80 });
const clamp   = await lib.part({ family: 'strap-clamp', thread: 'M10' });
const block   = await lib.part({ family: 'step-block', thread: 'M10' });
```

`lib.fetchPart('iso-4762-m3x12')` and
`lib.standard.boltSHCS({ thread: 'M3', lengthMm: 12 })` resolve to the same
record; pick the typed call when arguments are static, the generic call
when ids are computed. `lib.part` resolves the same catalog ids from the
family table; the `lib.standard` fastener shortcuts go through `lib.part`, so
they take `detail` too.

## Fastener table — lib.part and lib.stack

`lib.part({ family, thread, lengthMm })` builds one stocked fastener:
socket-head (ISO 4762, M2–M20), button-head (ISO 7380, M3–M10), countersunk
(ISO 10642, M3–M12) and hex-head (ISO 4017, M3–M20) screws and bolts,
headless set screws (ISO 4026, M3–M12) and threaded rod (DIN 975, M3–M12 ×
250/1000), hex nuts (ISO 4032, M2–M20), lock nuts (DIN 985, M3–M12), flat
washers (ISO 7089, M2–M20) and lock washers (DIN 127B, M3–M12). Screws need
a stocked length, and the stocked lengths are per thread (the standard's
preferred series), not one list for every size; an unknown family, thread or
length fails with a diagnostic that names the stocked values.

`detail` picks the solid, on `lib.part`, `lib.stack`, `lib.insert` and the
`lib.standard` fasteners:

- `'full'` (default): the hardware as its standard draws it. Hex socket with
  a 118° drill point, ISO 4762 head chamfer and under-head fillet, ISO 7380
  dome, ISO 10642 90° cone, ISO 4017 30° crown chamfer and washer face, ISO
  4032 nut chamfered and countersunk on both faces with an internal thread,
  ISO 4026 flat point, DIN 127B split. Threads are the ISO 68-1 profile at
  the ISO 261 coarse pitch with a chamfered start; ISO 4762 / ISO 10642
  screws carry the partial thread length b by a rule close to the standard's
  table. Threads over 100 turns (all DIN 975 rod) are the profile revolved as
  rings, flagged `threadForm: 'annular'` on the part record.
- `'envelope'`: nominal head plus a nominal-Ø shank, a nut with a nominal
  bore. Fast; use it for big assemblies.

Cost of `'full'`: ~4–6 s for the first build of each distinct part (copies
after that are cached, so 8 M6 bolts + nuts add ~12 s), and 3 s (M3 × 10) to
27 s (M20 × 100) to mesh one threaded part for display or render.

Interference, installation, pair-tolerance, DFM-clearance and rest-pose
checks measure the nominal envelope at either detail: a modeled thread in its
clearance hole, tapped hole or nut is not a clash. The envelope follows moves
and rotations; a boolean on the fastener drops it. Mass and BOM volume use the
drawn solid (the envelope overestimates a threaded screw by ~20 %). The
bundled catalog STEP files hold the envelope detail.

`lib.stack({ thread, gripMm, mode })` returns `lengthMm` plus the members,
each positioned against a seat at z = 0 (the grip's top face).
`mode: 'screw'` places the screw alone; `mode: 'bolt'` adds a washer under
the head and a washer plus hex nut on the back. The screw length is the
shortest stocked one at or above grip + washer + nut (for socket heads —
the only family `lib.stack` plans). Nut heights are ISO 4032 m max (M5 4.7,
M6 5.2, M8 6.8, M10 8.4 mm). The rule does not require thread protrusion past
the nut; check the tip when the chosen length lands close.

## Hole-driven insert — lib.insert

```typescript
const fitted = await lib.insert(plate, {
  diameterMm: 5.5,                       // or near: [x, y, z] to seed from one hole
  family: 'socket-head-cap-screw',      // or button-head-cap-screw / flat-head-countersunk
  mode: 'bolt',                          // or 'screw'
  gripMm: 6,                             // defaults to the bore's wall length
  seat: 'auto',                          // 'none' or 'counterbore' also accepted
});
// fitted.shape  — the plate with seats cut
// fitted.holes  — one placed stack per hole: screw (+ headWasher, tailWasher, nut)
```

The holes already on the shape drive everything. Sizing reads the bore
diameter against ISO 273 clearance (Ø2.4 M2, Ø2.9 M2.5, Ø3.4 M3, Ø4.5 M4,
Ø5.5 M5, Ø6.6 M6, Ø9 M8, Ø11 M10, Ø13.5 M12 normal; close and loose bores
also size, and `holes[i].fit` reports `'close' | 'normal' | 'loose'`).
Selection covers every similar hole (same
diameter, parallel axis), so a patterned hole is covered without naming the
pattern. The seat follows the family: flat-head cuts a 90° countersink to
the head diameter, cap heads cut nothing unless `seat: 'counterbore'`.
Through holes take the head at the end nearest `near` (or the larger Z);
`headAt` overrides. A blind hole takes `mode: 'screw'` and the longest
stocked length that fits; `mode: 'bolt'` requires a through bore.

Two bores need a second look:
- A bore that sits exactly on a larger thread's tap drill (ISO 2306:
  Ø2.5→M3, Ø3.3→M4, Ø4.2→M5, Ø5.0→M6, Ø6.8→M8) is reported on the hole as
  `pilotFor: 'M4'`. The detector cannot tell a tapped pilot from clearance,
  so check `pilotFor` before trusting the size.
- A coaxial larger bore that already reaches the mouth (a counterbore) is
  reported as `existingSeatMm`; `seat: 'auto'` then leaves the hole alone
  instead of cutting a second seat into it.

## Machining-fixture hardware — lib.part

The clamping kit for a T-slot machine table is reached through
`lib.part({ family, thread, lengthMm? })`, keyed by the thread the hardware
uses (M8 / M10 / M12). T-slot nuts follow the DIN 508 table and collar nuts
DIN 6331; strap clamps and step blocks have no DIN table and stay nominal kit
dimensions. Check the supplier drawing before ordering. Place the members
yourself with `translate` and the connectors below.

- `t-slot-nut` — T-slot nut (DIN 508): slot 10 / 12 / 14 mm for
  M8 / M10 / M12; heights 12 / 14 / 16 mm, head height 6 / 7 / 8 mm. Bore
  axis +Z, top face flush at z = 0, base below.
  Connectors: `mating-face` (wing tops), `top-face`, `thread-bore`.
- `clamping-stud` (needs `lengthMm`) — clamping stud (DIN 6379 form); stocked
  lengths 63 / 100 (M8), 80 / 125 (M10), 100 / 160 (M12). Connectors:
  `table-end`, `clamp-end`, `axis`.
- `flange-nut` — collar (flange) nut (DIN 6331 form) for the clamp top:
  across flats 13 / 16 / 18 mm, height 12 / 15 / 18 mm, collar
  18 / 22 / 25 mm.
  Connectors: `mating-face`, `top-face`, `inner-bore`.
- `strap-clamp` — strap clamp; the slot center is the origin and the nose
  points toward -X, so `slot-axis` is where the stud goes.
  Connectors: `nose-bearing`, `tail-bearing`, `slot-axis`, `top-face`.
- `step-block` — step block; treads rise along +X at 10 / 20 / 30 / 40 (M8),
  12 / 24 / 36 / 48 (M10), 15 / 30 / 45 / 60 (M12). Connectors:
  `base-face`, `step-1` … `step-4` on the treads.

## Pre-shipped connector convention

Every bundled record carries connector frames so the part participates in
assemblies without any `partRef.connector(...)` boilerplate. Naming follows
the @kc grammar (kebab, alpha-leading) so refs round-trip.

| Family                        | Connectors                                                  |
|-------------------------------|-------------------------------------------------------------|
| socket-head-cap-screw         | `head-bearing`, `thread-tip`, `head-top`                    |
| button-head-cap-screw         | `head-bearing`, `thread-tip`, `head-top`                    |
| flat-head-countersunk         | `mating-face`, `thread-tip`                                 |
| hex-nut / lock-nut            | `mating-face`, `top-face`, `inner-bore`                     |
| flat-washer / lock-washer     | `mating-face`, `top-face`, `inner-bore`                     |
| heat-set-insert               | `mating-face`, `top-face`, `inner-bore`                     |
| deep-groove-ball-bearing      | `inner-bore`, `outer-face`, `mating-face`, `top-face`       |
| linear-shaft                  | `end-a`, `end-b`, `axis`                                    |
| stepper-motor                 | `mounting-face`, `output-shaft`, `back-face`, `bolt-holes-1..4` |
| pin-header (2.54 / 1.27 mm)   | `mating-face`, `pin-1`                                      |
| jst-xh                        | `mating-face`, `back-face`                                  |

The `head-bearing` frame on a bolt points DOWN (-Z), so mating it against a
bracket's hole top face places the bolt with the shank sticking into the
hole — the canonical "bolt through bracket" configuration with no manual
flip.

## Mate API (v0.6) — 4-arg only

Canonical form is **`arm.mate(name, aRef, bRef, type, opts?)`** where
`aRef` / `bRef` are `'partName.connectorName'` strings and `type` is one of
`fastened` | `revolute` | `prismatic` | `cylindrical` | `planar` | `ball` |
`pin_slot`.

**Do not** use the retired 3-arg form `arm.mate(a, b, { kind })` — capture
rejects it. Catalog cookbooks and `kernelcad-assemblies` all use 4-arg.

## The universal `bolt-holes-N` auto-rule

Any `.hole(...)` or `.holes(...)` feature on an authored or imported Shape
automatically receives `bolt-holes-N` connector frames at the hole's
bottom face plus through-axis. Names are numbered first by feature order,
then by `(u, v)` to break ties, so the same script always emits the same
connector names across re-runs.

**Caveat (agent-facing):** those auto frames attach to the **holes feature
id**, not the assembly part name. A mate ref like `'bracket.bolt-holes-1'`
will not resolve after `arm.part('bracket', shapeWithHoles)`. Prefer
**manual** `partRef.connector('bolt-holes-N', { type: 'frame', origin:
{ kind: 'vec3', value: [...] } })` on the part (same pattern as cookbook
`nema-motor-mounting-plate`). Bundled / catalog parts already expose
`bolt-holes-N` on the **part** itself — those refs work without a manual
frame.

```typescript
const arm = assembly('arm');
const bracketShape = box(40, 20, 3).holes('top', {
  positions: [{ u: -10, v: 0 }, { u: 10, v: 0 }],
  diameter: 3.2,
  depth: 'through',
});
const bracket = arm.part('bracket', bracketShape);
// Manual frame on the PART — .holes() auto-connectors stay on the feature id.
bracket.connector('bolt-holes-1', {
  type: 'frame',
  origin: { kind: 'vec3', value: [-10, 0, 1.5] },
});
const bolt = await lib.standard.boltSHCS({ thread: 'M3', lengthMm: 10 });
arm.part('bolt', bolt);
// Catalog bolt already has head-bearing on the part; plate side is manual.
arm.mate('bolt-1', 'bolt.head-bearing', 'bracket.bolt-holes-1', 'fastened');
return arm.model();
```

## `@kc[...]` ref form

Bundled connectors and the bracket-side auto-emitted ones expose the same
ref grammar as authored faces and edges:

```
@kc[bolt/connector/head-bearing]      // typed shortcut for bolt.head-bearing
@kc[bracket/connector/bolt-holes-1]   // typed shortcut for bracket.bolt-holes-1
```

Either form works as the source / target of `add_mate` and survives
`query({ mode: 'resolve' })`. The dot form is shorter for human-authored scripts;
the @kc form is canonical in MCP tool outputs and diagnostic payloads.
See `kernelcad-mcp` for the full grammar.

## Bundled-only by default

Bundled tier coverage (671 records on the seed catalog):

- M2–M20 socket head (ISO 4762) and M2–M20 hex head bolts (ISO 4017);
  M3–M12 flat head countersunk (ISO 10642); button head M3–M10 (ISO 7380).
- M3–M12 set screws (ISO 4026) and M3–M12 threaded rod (DIN 975, 250/1000 mm).
- M2–M20 hex nuts and flat washers (ISO 4032 / ISO 7089); lock nuts and lock
  washers M3–M12 (DIN 985 / DIN 127B).
- Stocked lengths are per thread, the standard's preferred series subset.
- M2.5 / M3 / M4 heat-set inserts (3.8 mm and 5.7 mm length).
- Deep-groove ball bearings 608 / 623 / 624 / 625 / 626 / 6800 / 688 / 6900.
- Linear shaft Ø3..Ø12 × 20..200 mm.
- Spur gears module 1 / 2, 12–40 teeth (20° pressure angle, bored Ø5 / Ø6).
- NEMA 8 / 11 / 14 / 17 / 23 stepper motor envelopes with auto-emitted
  4-bolt-hole connector frames at the standard bolt circle.
- 2.54 mm and 1.27 mm pin headers, 2–20 pins, straight and right-angle.
- JST-XH housings, 2 / 3 / 4 / 5 / 6 pin.
- Machining-fixture hardware M8 / M10 / M12: T-slot nuts (slot 10 / 12 /
  14 mm), clamping studs (63–160 mm), flange nuts, strap clamps (100 / 125 /
  160 mm) and step blocks (40 / 48 / 60 mm of treads), envelope solids with
  placement connectors (`lib.part` fixture families).

Bundled parts ship under kernelCAD's MIT license — see `record.license`.

## Remote tier — built-in public catalog (default)

When a query has no bundled match, discovery and fetch fall through to a
built-in public parts catalog automatically — this is how kernelCAD finds
off-the-shelf parts (motors, bearings, connectors, brackets) it does not bundle.
No configuration is required.

```typescript
// Falls through to the public catalog when not bundled — nothing to configure.
const matches = await lib.findPart('flanged linear bearing');
const bearing = await lib.fetchPart('linear-bearing-lmk10luu');
```

What kernelCAD adds on top of the raw catalog, so a *found* part is as usable as
a bundled one:

- **Byte integrity.** The STEP is downloaded to `~/.cache/kernelcad/parts/` and
  verified against the catalog's `sha256` before use.
- **Synthesized connectors.** Catalog STEP ships no connector frames, so they
  are derived from the geometry at fetch time: `mating-face` / `top-face` from
  the bounding box, `bolt-holes-N` from detected mounting holes (coaxial
  segments collapsed; deterministically numbered), and `bore` from a distinct
  central hole. The part participates in `add_mate` with no manual
  `partRef.connector(...)`. Oddly-shaped parts may still need a hand-authored
  frame — inspect the synthesized set before relying on it.
- **Provenance.** The default catalog is built from a license-clean mechanical
  parts library (CC-BY-3.0), so each record carries its own `license` (commonly
  `'CC-BY-3.0'`) plus `attribution`. Read `record.license` / `record.attribution`
  rather than assuming — a record's terms govern it. Keep the attribution when
  shipping a deliverable that embeds the geometry.

**Overriding or disabling the source:**

- Point at a different catalog (e.g. a self-hosted index serving the same
  `/v1/parts` schema) with `partsBaseUrl` per call or the
  `KERNELCAD_PARTS_BASE_URL` env var.
- Set `KERNELCAD_PARTS_BASE_URL=off` (or `none`) to disable the remote tier
  entirely; unmatched lookups then return `parts.fetch.remote-disabled` and you
  stay fully offline on the bundled seed.

Bytes returned from the remote tier are cached under
`~/.cache/kernelcad/parts/<sha256>.step` with sha256 verification at write
time, so a flaky upstream cannot poison the cache.

## License and provenance

Every record carries `license` + optional `attribution`. The assembly's
provenance manifest records which parts came from where so downstream
review (CHANGELOG, license audit) has a single source of truth.

## Cookbook snippets

### M3 bolt through bracket (fastened mate)

```typescript
const arm = assembly('arm');
const bracketShape = box(40, 20, 3).holes('top', {
  positions: [{ u: -10, v: 0 }, { u: 10, v: 0 }],
  diameter: 3.2,
  depth: 'through',
});
const bracket = arm.part('bracket', bracketShape);
bracket.connector('bolt-holes-1', {
  type: 'frame',
  origin: { kind: 'vec3', value: [-10, 0, 1.5] },
});
const bolt = await lib.standard.boltSHCS({ thread: 'M3', lengthMm: 10 });
arm.part('bolt', bolt);
arm.mate('bolt-1', 'bolt.head-bearing', 'bracket.bolt-holes-1', 'fastened');
return arm.model();
```

### 608 bearing on an 8 mm shaft (cylindrical mate)

There is no `lib.standard.*` shortcut for linear shafts — fetch the catalog
record by id (`shaft-d<diameter>-l<length>`, Ø3..Ø12 × 20..200 mm). The
shaft's `axis` connector mates into the bearing's `inner-bore`. Catalog
parts already carry those connectors on the **part** — no manual frames.
Use the 4-arg mate (see cookbook `shaft-and-bearing-cylindrical-mate` for
the offline BREP stand-in when the catalog is absent).

```typescript
const arm = assembly('arm');
const shaft = await lib.fetchPart('shaft-d8-l50'); // Ø8 × 50 mm linear shaft
const bearing = await lib.standard.bearing608();   // Ø8 bore deep-groove bearing
arm.part('shaft', shaft);
arm.part('bearing', bearing);
arm.mate('seat', 'shaft.axis', 'bearing.inner-bore', 'cylindrical');
return arm.model();
```

### NEMA 17 mounted to a plate

Catalog `nema17` already exposes `bolt-holes-1..4` on the **motor part**.
Plate-side `.holes()` auto-connectors stay on the holes **feature id**, so
declare matching frames on the plate part (cookbook
`nema-motor-mounting-plate`).

```typescript
const arm = assembly('arm');
const plateShape = box(80, 80, 5).holes('top', {
  positions: [
    { u: -15.5, v: -15.5 }, { u: 15.5, v: -15.5 },
    { u: -15.5, v: 15.5 },  { u: 15.5, v: 15.5 },
  ],
  diameter: 3.2,
  depth: 'through',
});
const plate = arm.part('plate', plateShape);
const offs = [[-15.5, -15.5], [15.5, -15.5], [-15.5, 15.5], [15.5, 15.5]] as const;
offs.forEach(([u, v], i) => {
  plate.connector(`bolt-holes-${i + 1}`, {
    type: 'frame',
    origin: { kind: 'vec3', value: [u, v, 2.5] },
  });
});
const motor = await lib.standard.nema17();
arm.part('motor', motor);
arm.mate('b1', 'motor.bolt-holes-1', 'plate.bolt-holes-1', 'fastened');
arm.mate('b2', 'motor.bolt-holes-2', 'plate.bolt-holes-2', 'fastened');
arm.mate('b3', 'motor.bolt-holes-3', 'plate.bolt-holes-3', 'fastened');
arm.mate('b4', 'motor.bolt-holes-4', 'plate.bolt-holes-4', 'fastened');
return arm.model();
```

## Diagnostic recovery map

| Code                              | When                                                                          | Recover by                                                                            |
|-----------------------------------|-------------------------------------------------------------------------------|---------------------------------------------------------------------------------------|
| `parts.input.id-or-query-required`| `find_part` / `fetch_part` called with no id and no query.                    | Pass `id` (known record) OR `query` (fuzzy).                                          |
| `parts.fetch.offline-and-uncached`| Remote needed, network unreachable, cache miss.                               | Call `find_part { source: 'local' }`; or restore network.                             |
| `parts.fetch.checksum-mismatch`   | Downloaded bytes sha256 ≠ record sha256.                                      | Bytes discarded; do not retry against the same endpoint without verifying upstream.   |
| `parts.fetch.checksum-drift`      | Cached bytes still match; remote now reports a different sha256.              | Re-fetch with `--refresh-parts-cache` to opt in to the new bytes.                     |
| `parts.fetch.api-error`           | Remote returned non-2xx or network failed.                                    | Retry later, check `partsBaseUrl` reachability, or fall back to `source: 'local'`.    |
| `parts.fetch.remote-disabled`     | A tool needed remote, but no `partsBaseUrl` (arg or env) was set.             | Pass `partsBaseUrl`, set `KERNELCAD_PARTS_BASE_URL`, or stick to bundled ids.         |

### Verify installed catalog screws

For a placed catalog screw use `verify({ check: 'fastener-installation', file,
fasteners: [{ part: 'screw', against: ['washer', 'plate'], engagementPart: 'nut',
minEngagementMm: 2, maxProtrusionMm: 1 }] })`. The names are assembly instances,
not catalog ids. The verifier uses retained hash-bound catalog interfaces and
actual BREP geometry/world poses. Locally imported catalog sidecars qualify only
when the imported STEP bytes match the catalog hash and sidecar identity validates.

Flat annular-bearing screws and full open cylindrical bores are supported;
unsupported heads, manual primitives/metadata, blind or ambiguous bores and failed
probes are unknown. Empty stations produce `no-coverage`, never a passing audit.
Measured axial engagement and protrusion meet user-declared geometric limits;
simplified catalog threads cannot prove thread contact, strength, torque or preload.
