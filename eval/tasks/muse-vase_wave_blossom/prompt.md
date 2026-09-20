# vase_wave_blossom (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a decorative blossom vase with a fuller upper body and a gently ruffled opening, featuring a continuous, parametrically generated wavy shell.

## Geometry and Dimensions
Approx. 85.0 mm × 85.0 mm × 202.0 mm.

## Material
PLA

## Manufacturing Method
3D Printing

## Connection Method (Joint Type)
N/A (Single solid body)

## Mechanical Condition
Static decorative display; suitable for holding lightweight dried flowers or acting as a standalone aesthetic centerpiece.

## Structural Features
Wavy outer shell; matching inner shell offset by wall thickness; solid bottom base; ruffled top rim connecting the inner and outer shells.

## Special Requirements
Must maintain a continuous, non-intersecting manifold shell to ensure successful slicing and 3D printing. Overhangs must be kept gradual to avoid the need for internal support structures.

## Planned Component Quantity
1

## Component Names
- vase_body

## Adjustable Parameters
- **height**: 202.0 (142.0 ~ 282.0 mm). Controls the total vertical dimension of the vase.
- **wall_thickness**: 3.0 (1.8 ~ 5.0 mm). Determines the shell thickness, ensuring structural integrity and printability without excessive material use.
- **steps**: 18 (12.0 ~ 28.0). Defines the vertical resolution (number of layers) used to loft the vase profile.
- **pts_per_layer**: 120 (96.0 ~ 156.0). Defines the horizontal resolution of the spline curves for each layer.
- **wave_count**: 6 (4.0 ~ 10.0). Determines the number of primary petals or ruffles distributed around the circumference.
- **twist**: 0.018 (0.0 ~ 0.048). Applies a helical twist to the wave pattern along the Z-axis, creating a dynamic sweeping effect.
- **secondary_amp**: 0.8 (0.0 ~ 2.0). Controls the amplitude of secondary, higher-frequency ripples superimposed on the primary waves for added surface texture.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Generate horizontal spline profiles for the inner and outer shells based on base radius, wave amplitude, and twist parameters.
2. Loft the outer profiles to create the exterior surface and the inner profiles to create the interior cavity.
3. Cap the bottom with planar faces and connect the top inner and outer wires with a ruled surface.
4. Sew all surfaces together into a single, watertight solid body.

---

### 1. vase_body
The sole structural and aesthetic entity of the design.
* **Component Purpose**: Acts as the primary decorative vessel, containing the internal volume while displaying the complex parametric wave pattern on the exterior.
* **Assembly Direction**: N/A (Standalone part, printed vertically from the bottom base upwards along the +Z axis).
* **Connection & Kinematics**: N/A (Single solid body).

---

## Component Assembly Graph (Textual)
vase_body -> Standalone | Joint: None | Note: Single continuous body; no assembly required.
