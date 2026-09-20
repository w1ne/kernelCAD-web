# vase_wave_twist (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Create a decorative vase featuring a twisted wave profile with a moderate spiral motion along its body, designed as a single continuous shell for additive manufacturing.

## Geometry and Dimensions
Approx. 101.0 mm × 101.0 mm × 230.0 mm.

## Material
PLA

## Manufacturing Method
FDM 3D Printing

## Connection Method (Joint Type)
Not Applicable (Single solid body)

## Mechanical Condition
Static decorative display, suitable for holding lightweight dried flowers or acting as a standalone aesthetic centerpiece.

## Structural Features
Hollow twisted body; solid bottom base; open top rim; undulating inner and outer walls.

## Special Requirements
The lofted shell must remain a closed, manifold solid to ensure successful slicing and 3D printing. The inner wall must strictly offset from the outer wall to maintain a consistent wall thickness.

## Planned Component Quantity
1

## Component Names
- vase_body

## Adjustable Parameters
- **height**: 230.0 (170.0 ~ 310.0 mm). Determines the overall vertical dimension of the vase.
- **wall_thickness**: 3.0 (1.8 ~ 5.0 mm). Ensures sufficient shell thickness for FDM printability and structural stability.
- **steps**: 20 (14.0 ~ 30.0). Defines the number of vertical layers used to construct the lofted surface.
- **pts_per_layer**: 120 (96.0 ~ 156.0). Defines the radial resolution of the spline curves for each layer.
- **wave_count**: 6 (4.0 ~ 10.0). Sets the number of primary ridges/waves around the circumference of the vase.
- **twist**: 0.045 (0.025 ~ 0.075). Controls the degree of spiral torsion applied along the Z-axis.
- **secondary_amp**: 1.0 (0.2 ~ 2.2 mm). Amplitude of the secondary high-frequency wave, adding surface texture.
- **profile_radius**: (10.0 ~ 60.0 mm). Controls the base radius of the vase profile at different heights.
- **wave_amp**: (0.8 ~ 7.6 mm). Controls the amplitude of the primary wave deformation.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Generate horizontal spline profiles for the inner and outer walls at varying Z-heights based on wave and twist functions.
2. Loft the outer wires to form the exterior surface and the inner wires to form the interior cavity.
3. Cap the bottom and sew the top ring to form a single, watertight solid body.

---

### 1. vase_body
The primary and sole structural entity of the design.
* **Component Purpose**: Acts as the main decorative shell and container.
* **Assembly Direction**: Base component, built vertically along the +Z axis.
* **Connection & Kinematics**: Not Applicable (Single continuous body).

---

## Component Assembly Graph (Textual)
vase_body -> Standalone | Joint: None | Note: Single solid body generated via lofting; no assembly required.
