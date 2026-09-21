# Prompt — single-spool turbojet cutaway

Build an exhibit-grade cutaway of a J85-class single-spool turbojet as one `.kcad.ts` assembly.

Architecture: one axial spool in a casing, cut open for display.

- A single revolute **spool** (nose cone, 8 compressor discs + twisted blade rows, 2 turbine discs + twisted blade rows) turns inside a split **casing**: lower half is ground, upper half fastens to it, so hiding the upper half exposes the whole gas path.
- Inlet guide vanes and 8 stator rings sit between the compressor stages on thin bands buried in the casing bore; can-annular combustor (8 cans + liner + outer shell + fuel manifold) between compressor exit and turbine inlet; NGV rings guide the 2 turbine stages; a convergent nozzle closes the exit.
- Every blade is a 5-section twisted loft: per-section stagger, chord and thickness interpolation with loft `rotationDeg`; rotor profiles embed 2 mm into their disc rims, band-rooted vanes embed 2 mm into their bands, so every boolean fuses watertight.
- Keep it a display model: 10 blades per row (measured cost budget), 42 named parts (one revolute, rest fastened), colors per leaf primitive so the cutaway reads (alloy compressor, bronze hot section, dark casing, tan fuel).

Deliver a static pose (spoolDeg 0) with: `evaluate` clean, `validate` clean, `interference` 0 pairs over the documented intended-contact list, and watertight STEP/STL/GLB exports.
