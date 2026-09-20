# pen_holder_print_round_ribbed (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a one-piece 3D printed round pen cup with a ribbed outer wall for desktop stationery organization.

## Geometry and Dimensions
Approx. 86.0 mm × 86.0 mm × 118.0 mm.

## Material
PLA

## Manufacturing Method
3D Printing

## Connection Method (Joint Type)
Not applicable
## Mechanical Condition
Desktop storage, holding lightweight vertical loads (pens, pencils, markers) with a low center of gravity to prevent tipping.

## Structural Features
Ribbed exterior wall (24-sided polygon); faceted interior cavity (56-sided polygon); solid integrated base.

## Special Requirements
Must be manufactured as a single continuous solid body. Designed to be printed upright without the need for support structures.

## Planned Component Quantity
1

## Component Names
- printed_body

## Adjustable Parameters
- **outer_radius**: 43.0 (27.0 ~ 67.0 mm). Determines the overall footprint and internal storage capacity of the pen holder.
- **wall_height**: 118.0 (90.0 ~ 158.0 mm). Controls the depth of the cup to adequately support standard writing instruments without them falling out.
- **wall_thickness**: 3.2 (2.0 ~ 5.2 mm). Ensures structural rigidity of the vertical walls while optimizing print time and material consumption.
- **base_thickness**: 4.2 (3.0 ~ 6.2 mm). Provides a solid, weighted bottom to lower the center of gravity and prevent tipping.
- **outer_sides**: 24. Defines the ribbed aesthetic and tactile grip of the exterior wall.
- **inner_sides**: 56. Defines the relatively smooth interior surface to prevent pens from catching on sharp internal corners.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main outer profile of the part using a 24-sided polygon prism.
2. Cut the interior cavity using a 56-sided polygon prism offset by the wall thickness and base thickness.
3. Export the resulting monolithic shell.

---

### 1. printed_body
The main and only structural entity of the pen holder.
* **Component Purpose**: Acts as the primary containment vessel, providing a stable base and vertical walls to organize desktop items.
* **Assembly Direction**: Not applicable (Manufactured in place from the base up along the +Z axis).
* **Connection & Kinematics**: Not applicable (Monolithic structure).

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 1-component model:

* **printed_body -> Standalone** | Joint: None | Note: Monolithic 3D printed structure; no assembly required.
