# pen_holder_print_fluted_square (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a one-piece 3D printed fluted square pen cup for desktop stationery storage.

## Geometry and Dimensions
Approx. 86.0 mm × 86.0 mm × 116.0 mm.

## Material
PLA

## Manufacturing Method
3D Printing

## Connection Method (Joint Type)
Not applicable
## Mechanical Condition
Desktop storage, non-load-bearing, holding lightweight stationery items.

## Structural Features
Solid base; fluted outer walls; rounded corners; hollow interior cavity.

## Special Requirements
Must be manufactured as a single continuous solid body; designed to be printed without internal supports.

## Planned Component Quantity
1

## Component Names
- Printed body

## Adjustable Parameters
- **outer_width**: 86.0 (70.0 ~ 110.0 mm). Defines the overall width of the pen holder footprint.
- **outer_depth**: 86.0 (70.0 ~ 110.0 mm). Defines the overall depth of the pen holder footprint.
- **wall_height**: 116.0 (88.0 ~ 156.0 mm). Determines the total height, ensuring pens are adequately supported without tipping over.
- **wall_thickness**: 3.2 (2.0 ~ 5.2 mm). Ensures structural rigidity of the walls during printing and daily use.
- **base_thickness**: 4.4 (3.2 ~ 6.4 mm). Provides a solid bottom to lower the center of gravity and support the resting stationery.
- **corner_radius**: 10.0 (18.0 ~ 34.0 mm). Controls the rounding of the vertical corners for aesthetics and ergonomic handling.
- **base_band_height**: 20.0 (50.0 ~ 60.0 mm). Defines the height of the un-fluted solid band at the bottom of the cup.
- **groove_width**: 2.1 (18.0 ~ 26.1 mm). Sets the width of the decorative vertical flutes on the exterior walls.
- **groove_depth**: 1.2 (18.0 ~ 25.2 mm). Sets the indentation depth of the decorative vertical flutes.
- **groove_pitch**: 5.0 (1.0 ~ 19.0 mm). Controls the spacing/frequency of the vertical flutes along the perimeter.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main rounded box profile of the part based on the original script.
2. Complete key features like the inner cavity subtraction and the exterior fluted groove cuts.
3. Place the part back in its original position within the sample assembly.

---

### 1. Printed body
The main and only component of the pen holder.
* **Component Purpose**: Acts as the storage container for pens, featuring a solid base and decorative fluted walls.
* **Assembly Direction**: N/A (Printed in place, typically built upwards along the +Z axis from the base).
* **Connection & Kinematics**: None (Single continuous body).

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 1-component model:

* **Printed body** | Joint: None | Note: Standalone single-piece component.
