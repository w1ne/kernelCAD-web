# Hatchback port — source provenance

`hatchback.kcad.ts` (and the main block of the cookbook recipe
`automotive-body-envelope`) is a port of an existing open model, not a
free-hand shape.

## Source

- Model: `hatchback` from the OSRF Gazebo model database.
- Repository: <https://github.com/osrf/gazebo_models>, path `hatchback/`
  (`model.config`, `model.sdf`, `meshes/hatchback.obj`).
- Commit used: `8163eb4b5e7e21985c6591d1c0bfb56468c0093f` (2023-07-15).
- SHA-256 of `meshes/hatchback.obj`:
  `75d609dee9b8c2467ddac0cc1fc0b23c750b250f50cc75d6480a21302358d4d8`.
- Author: Nate Koenig (`model.config` `<author>`), Open Source Robotics
  Foundation.
- License: **Creative Commons Attribution 3.0 Unported (CC-BY 3.0)**, repository
  `LICENSE` ("Copyright 2012 Nathan Koenig"):
  <https://creativecommons.org/licenses/by/3.0/>.
- Changes: the mesh is not redistributed. Its shape was measured into station
  tables and re-modelled as NURBS lofts (see below); proportions, cross-sections
  and the wheel layout follow the source. Lamps, intake, mirrors, rims and the
  window/pillar layout are simplified kernelCAD additions.
- The source is a generic, unbranded compact hatchback (no logos or badges);
  this port adds none.

## Why this source

Selected against a CC0/CC-BY/MIT/BSD/Apache bar for a generic real-proportioned
passenger car whose shape is available as numbers:

| candidate | license | verdict |
|---|---|---|
| OSRF gazebo_models `hatchback` | CC-BY 3.0 | **chosen**: generic 5-door hatch, real proportions (4.0 m L, 2.52 m WB), clean 410-vertex mesh, separate wheel groups give axle positions |
| OSRF gazebo_models `suv`, `prius_hybrid` | CC-BY 3.0 | runner-up / rejected: SUV is a different class; Prius is a branded replica |
| DrivAer (TU Munich) | CAD "on request", no public license | rejected: terms unclear |
| DrivAerNet / DrivAerNet++ | CC BY-NC 4.0 | rejected: non-commercial |
| DrivAerML | CC BY-SA 4.0 | rejected for this repo: share-alike; 100 MB+ meshes |
| Khronos glTF `CarConcept` | CC-BY 4.0 | rejected: concept supercar, not a passenger-car reference |
| Khronos glTF `ToyCar` | CC0 | rejected: stylised 1950s toy, not real proportions |
| Kenney / Quaternius car kits | CC0 | rejected: low-poly game stylisation (host also blocked here) |

## Extraction

`extract-stations.py <hatchback.obj>` (numpy only):

1. Converts inches to mm, puts `s` = distance from the front bumper, `w` =
   half-width, `z` = height above the tyre contact patch.
2. Drops the wheel groups and the two door-mirror shells; slices the body shell
   every 10 mm in `s`; takes the mirrored convex hull of each section.
3. Measures per station: sill height, maximum half-width and its height,
   shoulder height/half-width just under the beltline (or under the bonnet /
   tailgate top), and for the greenhouse the half-width at the beltline, at 55 %
   of the glass height, and 25 mm under the roof.
4. Restores the clean body side inside the source wheel-arch cut-outs
   (s 470–1140 and 2990–3650), because the port cuts its own wheel wells.
5. Smooths each column along `s` (moving average, 5–15 samples) and samples
   the station rows used in the script.

Measured source envelope: body 4001 × 1880 (± 940) × 1568 mm, sill 196 mm,
tyres Ø641 at s = 804 and 3320 (wheelbase 2516), half-track 787.

## Hand edits after extraction

The source mesh is coarse (≈ 400 vertices), so a few cells were faired by hand
where a single triangle edge produced a kink. Everything else is the measured
value:

- `LOWER` zMaxWidth (column 3): 522/403/404/560/571/543/542/564/611 →
  500/440/450/540/560/550/550/570/600, which keeps the widest line as one
  smooth band instead of jumping between triangle vertices.
- `LOWER` wShoulder at s = 800 / 1000 / 3780: 742 / 745 / 586 → 770 / 785 / 640
  (the source's bonnet-to-A-pillar transition is a single sliver triangle).
- `LOWER` end rows: measured at s = 40 and 3960, placed at s = 0 and 4001 so the
  loft caps sit on the bumper faces instead of a near-point section.
- `GREENHOUSE` at s = 860: wBelt / wMid 560 / 285 → 600 / 300; at s = 1450:
  wBelt / wMid 863 / 720 → 800 / 700 (the mirror-sail triangles bulge there).

## Model-side additions (not in the source)

- Window openings / pillars: A-pillar foot to s = 1130, B-pillar s 2030–2130,
  C-pillar s 3170–3330, roof panel inboard of |w| 520 from s 1470 to 3400.
- Headlamps s 60–430, z 640–820; tail lamps s 3700–3970, z 760–1110; lower
  intake z 330–480 — placed from the source texture's lamp regions, simplified.
- Rims Ø400, tyre section 200 wide, door mirrors as ellipsoid caps on stalks.
