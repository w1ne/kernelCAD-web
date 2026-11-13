# Overhead pantograph head contact-rail material review — 13 November 2026

This round reviewed five ev-charging-infrastructure previews and fixed one
material mismatch in the existing `ev-charging-infrastructure/overhead-pantograph-head`
asset. No catalog IDs or kits were added. The kit had no earlier semantic or
material review.

## Finding and correction

In the baseline, the `contact-rail` part used the `engineeringPolymer` colour
(`#657f84`, grey). The contact rail is the part that carries the charging
current from the overhead head to the vehicle roof rails, so it must be a
conductor. A polymer finish labels the defining functional part as an
insulator.

The updated model:

- adds a `contactCopper` colour control (default `#b87545`, the same copper
  value used in the grid-substation kit) and assigns it to `contact-rail`;
- sets `contactCopper` in both presets (`fleetReady` `#c27c48`,
  `nightService` `#9a6440`);
- removes `engineeringPolymer`, because no part used it after the change. An
  unused colour control would show a knob that changes nothing;
- updates the source comment and description.

Geometry does not change: 180 triangles (budget 2,400). See the
[before preview](before/overhead-pantograph-head.png), the
[updated preview](after/overhead-pantograph-head.png) and the
[side-by-side image](before-after.png).

## Five-preview ledger

| Asset | Source SHA-256 (16) | Preview SHA-256 (16) | Observation | Result |
| --- | --- | --- | --- | --- |
| `modular-charger-power-stack` | `3c5af95282ff246a` | `31edbf299fe2e6ea` | Four stacked modules, drawer fronts and handles on a base frame read as a power stack. Base frame uses `stainlessSteel`; galvanised steel is more usual. | Minor; recorded, not fixed. |
| `battery-buffer-charger-container` | `f7e51c625d56d88e` | `7976b7400552aa1c` | Container body, doors, louvre bank and cable ports read correctly. Painted body and metal louvres are coherent. | No defect found. |
| `liquid-cooled-charging-cable` | `2a6ba1c7cd65b920` | `62f69e1c2409f6af` | Elastomer cable and coolant lines, polymer connector shell. `strain-guard` and coolant collars use `powderCoat`; on real cables these are moulded polymer or elastomer. | Minor; recorded, not fixed. |
| `overhead-pantograph-head` | `22ac97dd4534cc50` | `dfe242d5040f8a10` | Current-carrying contact rail uses `engineeringPolymer`. | Fixed in this round. |
| `remote-charger-power-cabinet` | `58341b1724b4d078` | `4506e10a7c48b09f` | Enclosure, door seams, vent slots and plinth read as an outdoor cabinet. `ground-terminal` uses `powderCoat`; a real earth stud is bare copper or brass, but it is small and mostly hidden. | Minor; recorded, not fixed. |

The [five-preview sample](sample/five-preview-sample.png) shows the baseline
renders.

Related defect, not fixed in this round: `bus-depot-pantograph-post` assigns
`engineeringPolymer` to both `contact-head` and `contact-bar`. The
`contact-bar` has the same conductor-as-polymer mismatch. It is left for a
separate change to keep this round to one asset.

Known limitation, not a material issue: the pantograph head geometry is a
blockout. The mounting yoke sits under the housing and the pivots are inside
it, so the preview does not show a working pantograph linkage.

## Overlap check

- The other eight open PRs (#1359, #1309, #1253, #1215, #1211, #1195, #1187,
  #1094) change no file under `ev-charging-infrastructure`. #1258 is the
  destination PR.
- An issue search for `pantograph` (open and closed) returned no matches.
- #1298, #1305, #1307 and #1308 are merged and change no file under
  `ev-charging-infrastructure`.

## Verification

```sh
npx tsx scripts/renderCatalogPreviews.ts overhead-pantograph-head
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/ev-charging-infrastructure/ tests/integration/catalog/overheadPantographContactCopper.test.ts
npx vitest run tests/integration/catalog/overheadPantographContactCopper.test.ts
python3 scripts/checkCatalogQuality.py --kit ev-charging-infrastructure
npx vitest run tests/integration/catalog/
```

Results on 13 November 2026:

- The focused test passes 1/1. With the baseline source restored, it fails
  (description does not contain `bare copper contact bar`).
- ESLint is clean.
- The ev-charging-infrastructure quality gate passes 50/50.
- The regenerated index changes only the `overhead-pantograph-head` row. Its
  `sourceSha256` (`bd75e5cf2f65cf77ec332ff893ae45cd7685d4a731c4399ea021629a99be2588`)
  matches the source file.
- Full catalog integration suite: see [verification/catalog-integration.md](verification/catalog-integration.md).

The focused test checks the triangle count, colour controls, preset values,
palette mapping, that `engineeringPolymer` is gone, and that the exported GLB
colours of `contact-rail` match `#b87545`.

No MP4 was produced in this round. The change is a colour reassignment on one
existing asset; the before/after previews are the visual evidence.

This generic low-poly asset is not a vendor design, current rating or
charging-interface specification.
