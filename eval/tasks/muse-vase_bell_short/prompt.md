# vase_bell_short (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a short bell-shaped vase with a generous lower chamber and a gentle taper, designed for aesthetic display and containment.

## Geometry and Dimensions
Approx. 104.0 mm × 104.0 mm × 168.0 mm.

## Material
PLA

## Manufacturing Method
3D Printing

## Connection Method (Joint Type)
Not applicable
## Mechanical Condition
Static aesthetic display, holding lightweight items (e.g., dried flowers) without internal pressure.

## Structural Features
Single hollow vase body; closed bottom floor; open top ring; lofted smooth or wavy wall profile.

## Special Requirements
Maintain uniform wall thickness throughout the lofted profile to ensure successful slicing and structural integrity during 3D printing.

## Planned Component Quantity
1

## Component Names
- Vase body

## Adjustable Parameters
- **height**: 168.0 (120.0 ~ 248.0 mm). Controls the overall vertical dimension of the vase.
- **wall_thickness**: 2.8 (1.6 ~ 4.8 mm). Determines the shell thickness, balancing material usage, print time, and structural rigidity.
- **steps**: 12 (10.0 ~ 22.0). Defines the vertical resolution and the number of lofting sections used to generate the smooth or wavy profile.
- **profile_radius**: 52.0 (14.0 ~ 68.0 mm). Controls the radial bounds of the spline profile to shape the bell curve, with the maximum radius dictating the overall width.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Generate the base profile points and interpolate the radii along the Z-axis.
2. Create inner and outer wire cross-sections based on the wall thickness.
3. Loft the wires to create the inner and outer shells, and cap the top and bottom to sew into a single solid.

---

### 1. Vase body
The primary and sole component of the model.
* **Component Purpose**: Acts as the main container, providing the internal volume and external aesthetic shape.
* **Assembly Direction**: Not applicable (Base component, built vertically along the +Z axis).
* **Connection & Kinematics**: Not applicable (Single continuous body).

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 1-component model:

* **Vase body -> Standalone** | Joint: None | Note: Single-component design, no assembly required.
