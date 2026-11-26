# Deadbeat contact dynamics: measured failure

The independent forward simulation does **not** reproduce repeated tick-tock motion.
At both timesteps, the wheel advances approximately 0.11116 degrees and locks on the
entry pallet. The exit pallet never receives load. This is a useful failed acceptance
check: the original animation contains no restoring oscillator and prescribes both
moving coordinates.

## What was tested

This derivative ports the rendered demonstration's 15 eight-point tooth profiles,
24-sample conjugate impulse profiles, and 18-segment concentric locking arcs into a
native kernelCAD assembly. It has a wheel hinge, an independent anchor hinge, and
separate entry and exit pallets rigidly attached to the anchor. Concave profiles are
split into triangular convex prisms. Their summed areas must equal the input profile
area before the source can evaluate.

The simulation applies a constant clockwise wheel torque of 0.00001 N m. After the
initial wheel angle of 47.4 degrees and anchor angle of 7.5 degrees, no prescribed
position or velocity drives either joint. The two studies start from rest and cover
the same 2 seconds. Contact acceptance runs at every integration step; video traces
are sampled every 10 ms.

The source CAD associated with the video is a different model. It uses rectangular
pallets, different phase and center-distance formulas, no joints, and disabled
validation. The renderer uses conjugate profiles but assigns the wheel and anchor
positions from a phase formula. Neither source supplies a pendulum, balance spring,
calibrated mass/inertia, drive torque, or measured friction. Their hashes and reference
URLs are in [provenance.json](provenance.json). Neither original was modified.

## Physical seating gate

The full local MCP evaluator reports `ok: true`, `mechanism: real`, 998 features,
and no diagnostics. This is the geometry and kinematic gate, not the independent
contact-dynamics verdict below. The study runner requires this gate before running
MuJoCo. A successful composition build alone is insufficient.

The anchor bore is cut after all unions at the explicit arbor axis. The clamp jaws
form open seats at the unchanged pallet back faces, rather than occupying ruby
volume. Matching fixed connectors lie on those shared faces. No overlap ignore list
or disabled-validation option is used. These corrections change support geometry
and inertia; the tooth and pallet contact profiles remain unchanged.

## Measured results on 2026-11-26

| Metric | 0.50 ms timestep | 0.25 ms timestep |
|---|---:|---:|
| Integration steps | 4,000 | 8,000 |
| Entry contact episodes | 3 | 2 |
| Exit contact episodes | 0 | 0 |
| Completed entry-to-exit sequences | 0 | 0 |
| Peak entry normal force | 53.8915 mN | 45.5345 mN |
| Maximum entry penetration | 0.7710 micrometers | 0.4258 micrometers |
| Wheel advance | 0.11116 degrees | 0.11116 degrees |
| Acceptance result | FAIL | FAIL |

Acceptance requires at least two episodes on each pallet, two ordered entry-to-exit
sequences, and penetration no greater than 0.1 mm. Contact chatter can create extra
episodes; an episode count is not a clock cycle. Timestep refinement preserves the
failure and near-zero wheel advance. It changes the peak impact force by about 15.5%
relative to the coarse result, so the peak force is **not a converged load prediction**.

## Declared assumptions and limits

The radius is 34 mm. Densities are assumed: wheel 8,500 kg/m3, anchor 7,850 kg/m3,
pallets 4,000 kg/m3, and base 2,700 kg/m3. Inertia is computed from the derivative
BREP volume and these densities. Moving decorative pinion, arbors, clamps and screws
are omitted. Bevels are omitted; the retained contact outlines are the un-bevelled
middle sections. Hub collision cylinders fill the shaft holes; the corresponding
base-to-shaft contact is excluded by the revolute mates.

Both hinge axes point along Z and the mechanism lies in XY. Gravity does not create
an in-plane restoring moment. Joint damping is 1e-7 N m s/rad. Default anchor spring
stiffness is zero because no oscillator exists in the source. The named
`anchorStiffnessNmmPerDeg` parameter permits an explicitly declared surrogate torsion
spring for a separate experiment; these retained results use zero.

Friction and solver compliance are test settings, not measured material properties.
The results are local rigid-contact simulation evidence. They do not establish
contact stress, wear, manufacturing tolerance, a clock period, or hardware acceptance.
A working clock requires an authored physical oscillator and measured or justified
properties before its repeated operation can be accepted.

## Reproduce and inspect

From the repository root:

```sh
npx tsx docs/demos/contact-dynamics-20261126/run-studies.ts
npx tsx docs/demos/contact-dynamics-20261126/capture-demo.ts
```

- [escapement.kcad.ts](escapement.kcad.ts): native source and explicit assumptions.
- [run-studies.ts](run-studies.ts): CAD compilation and the two independent solver runs.
- [settings.json](settings.json): declared controls and acceptance requirements.
- [evaluation.json](evaluation.json): composition evaluation; exit code 0 and no diagnostics.
- [mcp-evaluation.json](mcp-evaluation.json): full MCP geometry and mechanism checks; green with no diagnostics.
- [evaluate-mcp.ts](evaluate-mcp.ts): standalone full MCP gate for this fixture.
- [model.xml](model.xml): compiled collision geometry, joints, inertia and exclusions.
- [results.json](results.json): complete acceptance results and sampled native poses/loads.
- [capture-demo.ts](capture-demo.ts): deterministic replay renderer, never a motion driver.
- [demo.mp4](demo.mp4): readable contact detail, measured wheel advance and load trace.
- [verification.json](verification.json): source/video hashes, invocation and visual review.

The MP4 replays native solver states at five times slower speed. It projects the exact
compiled convex collision pieces, including a magnified entry-contact detail. It does
not reuse the original phase animation.
