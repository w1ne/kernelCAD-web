# Manufacturing examples in progress

These sources are editable CAD starting points for distinct manufacturing jobs.
They are not released fabrication specifications. Dimensions are millimetres.
The seven STEP files produced locally were reopened as valid solids in an
independent STEP reader (one solid per single-part case, two in the enclosure,
four in the bearing assembly). This checks the exported geometry, not whether
the parts are physically fit, strong enough or ready for a shop.

| Process | Model | Intended interface | Local evidence | Still needed |
| --- | --- | --- | --- | --- |
| Laser / waterjet | [Motor mounting plate](cut-motor-plate.kcad.ts) | NEMA 17: 31 mm hole pattern and 22 mm pilot; four M5 clearance mounts | OCCT size/volume, DXF loops, diameters, centres and thickness variation; independent ezdxf readback | Confirm motor drawing, tolerances and cutter compensation; physically cut and fit |
| CNC milling | [Bearing block](bearing-block.kcad.ts) | Nominal 608 bearing seat, 8.5 mm shaft clearance, four M5 clearance mounts | OCCT size and analytic volume, including exact 7 mm seat depth after local counterbore fix; STEP independently reopened | Bearing-seat tolerance, axial retention, machining setup and shop review |
| Sheet metal | [Bent bracket](bent-mounting-bracket.kcad.ts) | Two M5 clearance holes per leg | Flat-pattern test measures four holes and one bend line; independent DXF readback finds five closed cut loops and one bend line | Confirm material, bend allowance/K-factor and tooling; physical bend/fit |
| Turning | [Shoulder spacer](shoulder-spacer.kcad.ts) | 8.5 mm through bore, 30 mm flange, 20 mm body | OCCT envelope and analytic volume; STEP independently reopened | Length variants, tolerances, edge break and physical fit |
| 3D printing | [Electronics enclosure](electronics-enclosure.kcad.ts) | Removable lid with locating lip, four lid screws, PCB posts and connector window | Two-part geometry builds; rendered exterior and window inspected | Validate board and fastener fit, sections, print orientation, clearances and STL; print and assemble |
| Injection molding | [Moulded housing base](moulded-housing.kcad.ts) | Open housing with 2 mm nominal wall and four cored board posts | Local moulding DFM reports passing draft, wall and undercut checks | No ribs, board retention, ejection or tool design; hosted DFM does not yet support this local check; toolmaker review and physical parts |
| Assembly | [Bearing and shaft](bearing-shaft-assembly.kcad.ts) | 608 bearing, housing, two-screw retainer and shouldered shaft | Four named parts with fastened bearing/retainer and limited revolute mate; mechanical review without errors on the tested poses | Hardware geometry, fits, explicit base support, manufacturing and physical motion |

The bearing assembly needs an installed generated catalog to find the 608 bearing.
The review uses an assumed fixed housing, cannot verify its topology-bound hole
connectors in the pose envelope, and does not prove bearing retention or loads.
The catalog bearing is a simple annular envelope, not separate races and balls;
the model does not simulate rolling-bearing contact.
The retainer's two screws are specified by holes but are not modeled.
The [planetary gear stage](../../showcase/planetary-gear-stage/) is an additional
assembly starting point, with its own documented motion-check limits.

The flat-part DXF writer and counterbore depth changes accompanying these examples are
local changes until they pass review, CI and deployment. In particular, a DXF
from an older hosted backend may not open in strict readers, and its counterbore
floor may extend 0.01 mm beyond the declared depth. Do not infer live behavior
from these local results. The separate drawing-sheet DXF writer is not covered
by the flat-part fix and needs its own compatibility review.
