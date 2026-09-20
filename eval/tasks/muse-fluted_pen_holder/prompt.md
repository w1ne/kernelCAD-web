# fluted_pen_holder (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a desktop pen holder featuring a decorative fluted exterior and a hollow internal cavity for organizing pens and stationery.

## Geometry and Dimensions
Approx. 74.0 mm × 74.0 mm × 96.0 mm.

## Material
PLA

## Manufacturing Method
3D Printing

## Connection Method (Joint Type)
Not applicable
## Mechanical Condition
Desktop storage, holding lightweight stationery items.

## Structural Features
Main hollow cup body; rounded lower base; exterior vertical fluted ribs; filleted top opening.

## Special Requirements
Keep exported STEP as a single closed solid.

## Planned Component Quantity
1

## Component Names
- fluted_pen_holder_body

## Adjustable Parameters
- **body_width**: 74.0 (50.0 ~ 110.0 mm). Determines the overall width of the pen holder.
- **body_depth**: 74.0 (50.0 ~ 110.0 mm). Determines the overall depth of the pen holder.
- **total_height**: 96.0 (70.0 ~ 150.0 mm). Controls the vertical capacity for holding pens.
- **base_height**: 18.0 (10.0 ~ 35.0 mm). Defines the height of the lower base section.
- **base_inset**: 1.2 (0.0 ~ 4.0 mm). Controls the step-in distance of the base relative to the upper body, creating a slight overhang.
- **wall_thickness**: 3.8 (2.0 ~ 8.0 mm). Ensures structural integrity and stiffness of the cup walls.
- **floor_thickness**: 5.0 (3.0 ~ 10.0 mm). Provides a solid bottom to prevent pens from piercing through and adds weight for anti-tipping stability.
- **upper_corner_radius**: 7.0 (3.0 ~ 14.0 mm). Softens the vertical edges of the main upper body.
- **base_corner_radius**: 10.0 (4.0 ~ 16.0 mm). Softens the vertical edges of the base.
- **top_edge_radius**: 1.2 (0.4 ~ 3.0 mm). Softens the mouth opening for ergonomic safety and aesthetics.
- **rib_width**: 1.4 (0.8 ~ 3.0 mm). Defines the thickness of the exterior decorative ribs.
- **rib_depth**: 1.2 (0.4 ~ 2.4 mm). Defines how far the ribs protrude from the main body.
- **rib_pitch**: 4.0 (2.5 ~ 8.0 mm). Controls the spacing and density of the fluted ribs along the exterior faces.
- **rib_margin**: 8.0 (4.0 ~ 14.0 mm). Sets the blank space at the corners where ribs are not placed to avoid geometric interference at the fillets.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the outer body (base and upper cup).
2. Cut the inner cavity to hollow out the holder.
3. Generate and fuse the exterior vertical ribs.
4. Apply fillets to the top edge of the mouth opening.

---

### 1. fluted_pen_holder_body
The central and sole entity of the model.
* **Component Purpose**: Acts as the main storage container, providing a stable base and a decorative fluted exterior for desktop organization.
* **Assembly Direction**: N/A (Standalone object).
* **Connection & Kinematics**: Not applicable (Single monolithic component).

---

## Component Assembly Graph (Textual)
fluted_pen_holder_body -> Standalone | Joint: None | Note: Single monolithic component; no assembly required.
