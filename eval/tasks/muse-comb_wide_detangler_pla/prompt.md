# comb_wide_detangler_pla (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a wide-tooth detangling comb designed for FDM 3D printing, featuring a reinforced spine and rounded teeth optimized for hair care.

## Geometry and Dimensions
Approx. 119.6 mm × 47.0 mm × 4.5 mm.

## Material
PLA

## Manufacturing Method
3D Printing

## Connection Method (Joint Type)
Not applicable
## Mechanical Condition
Handheld personal care item; teeth experience cantilever bending stress during hair detangling.

## Structural Features
Main spine/handle; 12 wide teeth with widened roots for structural reinforcement.

## Special Requirements
Keep as a single fused solid body. Ensure teeth roots are deeply embedded and fused into the spine to prevent snapping along layer lines.

## Planned Component Quantity
1

## Component Names
- wide_detangler_body

## Adjustable Parameters
- **teeth_count**: 12. Determines the total number of detangling teeth.
- **tooth_width**: 4.6 mm. Defines the width of each tooth to ensure structural rigidity.
- **gap**: 4.4 mm. Sets the spacing between teeth, optimized for wide detangling without snagging.
- **tooth_length**: 34.0 mm. Determines the reach of the comb through hair.
- **spine_depth**: 13.0 mm. Provides the main structural backbone and gripping area.
- **thickness**: 4.5 mm. Overall Z-axis thickness ensuring printability and bending resistance.
- **end_margin**: 8.0 mm. Adds extra material at the left and right ends of the spine for handling and strength.
- **first_last_length_scale**: 0.85. Shortens the outermost teeth to create a tapered, ergonomic profile and reduce edge snagging.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main spine profile.
2. Generate the array of teeth with widened roots and scale the outer teeth.
3. Fuse all teeth and the spine into a single continuous solid.

---

### 1. wide_detangler_body
The monolithic structure of the comb.
* **Component Purpose**: Acts as both the structural handle (spine) and the functional interface (teeth) for detangling hair.
* **Assembly Direction**: N/A (Single component).
* **Connection & Kinematics**: None (Single Body).

---

## Component Assembly Graph (Textual)
wide_detangler_body -> None | Joint: None | Note: Single monolithic part; no assembly required.
