# pegboard_hex_stand (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a desktop hexagonal pegboard stand designed for organizing and displaying small items via a perforated grid.

## Geometry and Dimensions
Approx. 400.0 mm × 120.0 mm × 366.4 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Desktop storage and display, light load-bearing.

## Structural Features
Hexagonal perforated panel; rectangular support base.

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
2

## Component Names
- perforated_panel
- base

## Adjustable Parameters
- **hex_size**: 200 (100.0 ~ 350.0 mm). Determines the overall display area and bounding width of the hexagonal pegboard.
- **panel_thickness**: 8 (5.0 ~ 15.0 mm). Controls the structural rigidity of the pegboard and the thickness of the connecting tenon.
- **spacing**: 25 (10.0 ~ 50.0 mm). Defines the distance between adjacent peg holes in the hexagonal grid pattern.
- **hole_radius**: 3 (1.0 ~ 8.0 mm). Sets the size of the holes to accommodate standard pegboard hooks or dowels.
- **base_depth**: 120 (60.0 ~ 200.0 mm). Ensures the stand's anti-overturning stability on a flat surface.
- **base_height**: 20 (10.0 ~ 40.0 mm). Provides sufficient depth for the mortise slot to securely hold the panel's tenon.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1. perforated_panel
The main vertical display surface of the stand.
* **Component Purpose**: Provides a grid of holes for attaching hooks or accessories, acting as the primary functional area.
* **Assembly Direction**: Inserted downwards along the -Z axis into the base.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). The bottom edge features a protruding rectangular tenon.

### 2. base
The supporting foundation of the stand.
* **Component Purpose**: Acts as the stable base, preventing the vertical panel from tipping over under eccentric loads.
* **Assembly Direction**: Fixed base component, positioned at the bottom (absolute Z from 0 to `base_height`).
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). The top surface features a central rectangular slot (mortise) matching the panel's tenon.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 2-component model:

* **perforated_panel -> base** | Joint: interlocking | Note: Panel bottom tenon inserted into the base's top slot.
