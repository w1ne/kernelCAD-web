# pen_holder_glue_square_scoop (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a square pen cup with a lowered front scoop, designed to be assembled from flat panels using adhesive.

## Geometry and Dimensions
Approx. 84.0 mm × 84.0 mm × 116.0 mm.

## Material
Acrylic

## Manufacturing Method
Laser Cutting

## Connection Method (Joint Type)
Bonding (Glue)

## Mechanical Condition
Desktop storage for holding pens, pencils, and other stationery items.

## Structural Features
Base panel; front panel with notch; back panel; left panel; right panel.

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
5

## Component Names
- base_panel
- front_panel
- back_panel
- left_panel
- right_panel

## Adjustable Parameters
- **outer_width**: 84.0 (68.0 ~ 108.0 mm). Determines the overall width of the pen holder.
- **outer_depth**: 84.0 (68.0 ~ 108.0 mm). Determines the overall depth of the pen holder.
- **wall_height**: 112.0 (84.0 ~ 152.0 mm). Controls the internal storage height for the pens.
- **wall_thickness**: 3.0 (2.0 ~ 5.0 mm). Matches standard sheet material thickness suitable for laser cutting.
- **base_thickness**: 4.0 (2.8 ~ 6.0 mm). Provides a stable and sufficiently heavy bottom foundation for the holder.
- **front_notch_width**: 34.0 (18.0 ~ 58.0 mm). Sets the width of the front access scoop.
- **front_notch_height**: 28.0 (50.0 ~ 68.0 mm). Sets the height of the front access scoop to allow easy retrieval of shorter items.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1. base_panel
The bottom foundation of the pen holder.
* **Component Purpose**: Acts as the floor of the container and provides a flat base for attaching the vertical walls.
* **Assembly Direction**: Fixed base component, positioned at absolute Z = 0.
* **Connection & Kinematics**: Bonding (Glue) (Fully constrained in all directions (permanent)). 

### 2. front_panel
The front-facing wall with a scoop.
* **Component Purpose**: Retains items while providing a lowered rectangular notch for easy access to shorter stationery.
* **Assembly Direction**: Placed vertically on the front edge of the base panel along the +Z axis.
* **Connection & Kinematics**: Bonding (Glue) (Fully constrained in all directions (permanent)).

### 3. back_panel
The rear wall of the pen holder.
* **Component Purpose**: Encloses the back of the storage volume to keep tall items upright.
* **Assembly Direction**: Placed vertically on the rear edge of the base panel along the +Z axis.
* **Connection & Kinematics**: Bonding (Glue) (Fully constrained in all directions (permanent)).

### 4. left_panel
The left side wall.
* **Component Purpose**: Encloses the left side of the storage volume, spanning the full outer depth.
* **Assembly Direction**: Placed vertically on the left edge of the base panel along the +Z axis.
* **Connection & Kinematics**: Bonding (Glue) (Fully constrained in all directions (permanent)).

### 5. right_panel
The right side wall.
* **Component Purpose**: Encloses the right side of the storage volume, spanning the full outer depth.
* **Assembly Direction**: Placed vertically on the right edge of the base panel along the +Z axis.
* **Connection & Kinematics**: Bonding (Glue) (Fully constrained in all directions (permanent)).

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 5-component model:

* **left_panel -> base_panel** | Joint: Bonding (Glue) | Note: Bottom edge glued to the left top surface of the base.
* **right_panel -> base_panel** | Joint: Bonding (Glue) | Note: Bottom edge glued to the right top surface of the base.
* **front_panel -> base_panel** | Joint: Bonding (Glue) | Note: Bottom edge glued to the front top surface of the base.
* **back_panel -> base_panel** | Joint: Bonding (Glue) | Note: Bottom edge glued to the rear top surface of the base.
* **front_panel -> left_panel & right_panel** | Joint: Bonding (Glue) | Note: Side edges of the front panel are glued to the inner faces of the left and right panels.
* **back_panel -> left_panel & right_panel** | Joint: Bonding (Glue) | Note: Side edges of the back panel are glued to the inner faces of the left and right panels.
