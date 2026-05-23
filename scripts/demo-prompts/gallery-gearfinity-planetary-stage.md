# Build a Gearfinity-inspired planetary gear stage as a parameterized kernelCAD assembly

Inspired by Gearfinity's open-source `planetary_gear_stage` module (MIT, 3D-printable kit). Reproduce a complete planetary drive as a connected kernelCAD assembly with proper involute teeth and a single `driveAngleDeg` parameter that animates the meshing.

Required mechanism (12 : 8 : 28 planetary set, module 3.5 mm, 20° pressure angle, 3.33 : 1 reduction):

- Bolted rear flange (cylindrical, six hex bolt heads on a ~62 mm bolt circle) housing the internal-tooth ring gear.
- Internal ring gear with 28 involute teeth, slightly shorter axially than the interior gears so the inner toothed flanks stay visible from any iso angle.
- 12-tooth drive sun gear keyed onto a protruding input shaft.
- Three 8-tooth planet gears riding on fixed pins seated in a three-spoke carrier web.
- Slewing roller bearing race (single annular part with a bright polished inner-track band) on top of the ring gear — the surface the carrier turns on.
- Output drive shaft fastened to the carrier, carrying a 5-blade turbine fan with realistic outward pitch.

All visible rotation must be driven by the single `driveAngleDeg` parameter via revolute mates at the planetary set's kinematic ratios:

```
carrier  =  Z_sun / (Z_sun + Z_ring)        × driveAngleDeg  =  +0.30 ×
planet   = -(Z_sun / Z_planet) × (1 - 0.30) × driveAngleDeg  =  -1.05 ×   (relative to its carrier pin)
fan      =  +0.30 × driveAngleDeg                                         (coupled to carrier output)
```

Z-up, millimetres. Part and connector names use the kebab-case identifier grammar `^[A-Za-z][A-Za-z0-9_-]*$`. Return the final assembly via `.solvedModel({}, { validate: 'off' })`.
