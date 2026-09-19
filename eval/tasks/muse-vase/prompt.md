# vase (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a parametric, thin-walled vase with a continuous sine-wave modulated profile, designed to serve as a decorative container.

## Geometry and Dimensions
Approx. 75.0 mm × 75.0 mm × 177.0 mm.

## Material
PLA

## Manufacturing Method
3D Printing

## Connection Method (Joint Type)
Not applicable
## Mechanical Condition
Static display and containment; resting on a flat surface to hold lightweight decorative items, dried flowers, or act as a standalone aesthetic piece.

## Structural Features
Wavy lofted outer shell; hollow interior cavity; solid bottom base (2mm thick); flat top rim.

## Special Requirements
The final geometry must be sewn into a single, watertight closed solid (TopAbs_SOLID) to ensure printability and structural integrity of the thin walls.

## Planned Component Quantity
1

## Component Names
- vase_body

## Adjustable Parameters
- **vase_height**: 177 (80.0 ~ 320.0 mm). Determines the overall vertical capacity and aesthetic proportion of the vase.
- **profile_radius_scale**: 25 (10.0 ~ 60.0 mm). Controls the base scaling factor for the vase's radius, directly affecting the overall volume and footprint.
- **wall_thickness**: 2 (1.0 ~ 8.0 mm). Defines the shell thickness; the lower limit ensures FDM printability without gaps, while the upper limit provides structural rigidity.
- **profile_segments**: 10 (4 ~ 24). Determines the vertical resolution and the number of control wire profiles used for the lofting operation.
- **profile_wave_cycles**: 1 (0.5 ~ 3.0). Controls the number of sine wave undulations (bulges and constrictions) along the height of the vase.
- **profile_phase_span**: 1 (0.5 ~ 2.0). Defines the span of the sine wave phase evaluated from the bottom to the top profile.
- **profile_phase_start**: 0 (-0.5 ~ 0.5). Sets the initial phase of the sine wave at the base, determining whether the base starts at a bulge or a constriction.
- **profile_radius_offset**: 0.5 (0.3 ~ 1.2). Provides a baseline offset to the radius calculation to ensure the inner diameter remains positive and the vase maintains a minimum functional width.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Generate a series of outer and inner circular wires along the Z-axis based on sine-wave modulated radii.
2. Lift the first inner wire by the specified wall thickness to create a solid floor.
3. Loft the outer wires and inner wires separately to create the main shell surfaces.
4. Generate the bottom cap and top ring surfaces.
5. Sew all surfaces (inner floor, inner loft, top ring, outer loft, bottom cap) into a single closed solid.

---

### 1. vase_body
The primary and only structural body of the vase.
* **Component Purpose**: Acts as the main container and aesthetic exterior, providing both the internal cavity for holding items and the stable base for resting on flat surfaces.
* **Assembly Direction**: Not applicable (Standalone component).
* **Connection & Kinematics**: Not applicable (Single continuous body).

---

## Component Assembly Graph (Textual)
vase_body -> Standalone | Joint: None | Note: Single continuous solid model; no assembly required.
