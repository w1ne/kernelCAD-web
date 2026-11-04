# Manufacturing examples in progress

These seven sources are editable, millimetre-based starting points for distinct
manufacturing jobs. They are not released fabrication specifications. The
declared parameter bounds and representative geometry variants are checked by
integration tests, and the STEP exports are reopened by the kernel's STEP
inspector. This checks CAD geometry and file round-trip behavior; it does not
establish physical fit, strength or shop readiness.

| Process | Model | Intended interface | Local checks | Still needed |
| --- | --- | --- | --- | --- |
| Laser / waterjet | [Motor mounting plate](cut-motor-plate.kcad.ts) | NEMA 17: 31 mm hole pattern and 22 mm pilot; four M5 clearance mounts | Length 100–130 mm, width 80–110 mm, outer-hole Y pitch 50–60 mm and thickness 2–8 mm; DXF loops, diameters, centres and thickness variation | Confirm motor drawing, tolerances and cutter compensation; physically cut and fit |
| CNC milling | [Bearing block](bearing-block.kcad.ts) | Nominal 608 bearing seat, 8.5 mm shaft clearance, four M5 clearance mounts | Length 70–120 mm, thickness 14–30 mm, seat diameter 21.8–22.2 mm; OCCT size and analytic volume include the 7 mm seat depth | Bearing-seat tolerance, axial retention, machining setup and shop review |
| Sheet metal | [Bent bracket](bent-mounting-bracket.kcad.ts) | Two mounting holes per leg; 2 mm sheet and illustrative K-factor 0.4 | Bend angle 45–120°, width 40–100 mm, hole diameter 4.5–8 mm; flat-pattern checks four holes and one bend line | Confirm material, bend allowance/K-factor and tooling; physical bend/fit |
| Turning | [Shoulder spacer](shoulder-spacer.kcad.ts) | Default 8.5 mm through bore, 30 mm flange and 20 mm body | Length 8–60 mm, flange diameter 27–36 mm, bore diameter 6–12 mm; envelope and analytic volume | Tolerances, edge break and physical fit |
| 3D printing | [Electronics enclosure](electronics-enclosure.kcad.ts) | Removable lid with locating lip, four lid screws, PCB posts and connector window | Two named parts; tested minimum footprint/maximum wall combination | Validate board and fastener fit, sections, print orientation, clearances and STL; print and assemble |
| Injection molding | [Drafted housing with cored posts](moulded-housing.kcad.ts) | Open housing, 2 mm nominal wall, four cored board posts | Width 70–120 mm, height 20–40 mm, draft 1–5°; local moulding DFM passes nominal and combined range endpoints, while insufficient-draft and trapped-core controls fail | No ribs or board retention; ejection, gate, parting and tool design need a toolmaker; physical parts are untested |
| Assembly | [Bearing and shaft](bearing-shaft-assembly.kcad.ts) | 608 bearing, housing, two-screw retainer and shouldered shaft | Shaft length 24–50 mm, diameter 7.7–7.95 mm, shoulder diameter 10–14 mm; four named parts and default motion review | Hardware geometry, fits, explicit base support, manufacturing and physical motion |

The enclosure clearance note is a geometric starting point, not a connector or
PCB fit check. The bearing interfaces need supplier drawings and specified fits.
The bearing assembly assumes a fixed housing and simplified annular catalog
bearing; it has no modeled screws, rolling contact or load validation. The
moulding DFM check measures draft, undercuts, walls and corners, but does not
check ribs, gate/ejector placement, flow, parting strategy or tool design.
Physical prototypes and shop acceptance remain open for all seven cases.
