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

`fetch_part { url }` pulls geometry on demand from an **allowlisted** host
(`raw.githubusercontent.com`, `objects.githubusercontent.com`, `github.com`,
`gitlab.com`, `api.step.parts`) — it is cached locally, never re-hosted
(`redistribution: 'fetch-only'`):

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
```

`lib.fetchPart('iso-4762-m3x12')` and
`lib.standard.boltSHCS({ thread: 'M3', lengthMm: 12 })` resolve to the same
record; pick the typed call when arguments are static, the generic call
when ids are computed.

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

## The universal `bolt-holes-N` auto-rule

Any `.hole(...)` or `.holes(...)` feature on an authored or imported Shape
automatically receives `bolt-holes-N` connector frames at the hole's
bottom face plus through-axis. Names are numbered first by feature order,
then by `(u, v)` to break ties, so the same script always emits the same
connector names across re-runs.

```typescript
const arm = assembly('arm');
const bracket = box(40, 20, 3).holes('top', {
  positions: [{ u: -10, v: 0 }, { u: 10, v: 0 }],
  diameter: 3.2,
  depth: 'through',
});
arm.part('bracket', bracket);
const bolt = await lib.standard.boltSHCS({ thread: 'M3', lengthMm: 10 });
arm.part('bolt', bolt);
// The bracket's bolt-holes-1 mates against the bolt's head-bearing —
// neither connector was hand-authored.
arm.mate('bolt.head-bearing', 'bracket.bolt-holes-1', { kind: 'fastened' });
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

Bundled tier coverage (273 records on the seed catalog):

- M2 / M2.5 / M3 / M4 / M5 / M6 socket head, button head, flat head
  countersunk screws (ISO 4762 / 7380 / 10642).
- M2 / M2.5 / M3 / M4 / M5 / M6 hex nuts, lock nuts, flat / lock washers
  (ISO 4032 / DIN 985 / ISO 7089 / DIN 127B).
- M2.5 / M3 / M4 heat-set inserts (3.8 mm and 5.7 mm length).
- Deep-groove ball bearings 608 / 623 / 624 / 625 / 626 / 6800 / 688 / 6900.
- Linear shaft Ø3..Ø12 × 20..200 mm.
- Spur gears module 1 / 2, 12–40 teeth (20° pressure angle, bored Ø5 / Ø6).
- NEMA 8 / 11 / 14 / 17 / 23 stepper motor envelopes with auto-emitted
  4-bolt-hole connector frames at the standard bolt circle.
- 2.54 mm and 1.27 mm pin headers, 2–20 pins, straight and right-angle.
- JST-XH housings, 2 / 3 / 4 / 5 / 6 pin.

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
const bracket = box(40, 20, 3).holes('top', {
  positions: [{ u: -10, v: 0 }, { u: 10, v: 0 }],
  diameter: 3.2,
  depth: 'through',
});
arm.part('bracket', bracket);
const bolt = await lib.standard.boltSHCS({ thread: 'M3', lengthMm: 10 });
arm.part('bolt', bolt);
arm.mate('bolt.head-bearing', 'bracket.bolt-holes-1', { kind: 'fastened' });
return arm.model();
```

### 608 bearing on an 8 mm shaft (cylindrical mate)

There is no `lib.standard.*` shortcut for linear shafts — fetch the catalog
record by id (`shaft-d<diameter>-l<length>`, Ø3..Ø12 × 20..200 mm). The
shaft's `axis` connector mates into the bearing's `inner-bore`.

```typescript
const arm = assembly('arm');
const shaft = await lib.fetchPart('shaft-d8-l50'); // Ø8 × 50 mm linear shaft
const bearing = await lib.standard.bearing608();   // Ø8 bore deep-groove bearing
arm.part('shaft', shaft);
arm.part('bearing', bearing);
arm.mate('shaft.axis', 'bearing.inner-bore', { kind: 'cylindrical' });
return arm.model();
```

### NEMA 17 mounted to a plate

```typescript
const arm = assembly('arm');
const plate = box(80, 80, 5).holes('top', {
  positions: [
    { u: -15.5, v: -15.5 }, { u: 15.5, v: -15.5 },
    { u: -15.5, v: 15.5 },  { u: 15.5, v: 15.5 },
  ],
  diameter: 3.2,
  depth: 'through',
});
arm.part('plate', plate);
const motor = await lib.standard.nema17();
arm.part('motor', motor);
// 4-bolt pattern: the motor's bolt-holes-N frames already sit at the
// standard bolt circle, so mate them to the plate's auto-emitted holes.
arm.mate('motor.bolt-holes-1', 'plate.bolt-holes-1', { kind: 'fastened' });
arm.mate('motor.bolt-holes-2', 'plate.bolt-holes-2', { kind: 'fastened' });
arm.mate('motor.bolt-holes-3', 'plate.bolt-holes-3', { kind: 'fastened' });
arm.mate('motor.bolt-holes-4', 'plate.bolt-holes-4', { kind: 'fastened' });
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
