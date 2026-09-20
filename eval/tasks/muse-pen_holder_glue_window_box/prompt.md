# pen_holder_glue_window_box (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a glued desk pen box with lightened side windows for storing pens and desktop stationery.

## Geometry and Dimensions
Approx. 92.0 mm × 76.0 mm × 118.0 mm.

## Material
Timber

## Manufacturing Method
Laser Cutting

## Connection Method (Joint Type)
Bonding (Glue)

## Mechanical Condition
Desktop storage, stationary, light load-bearing.

## Structural Features
Base panel; front panel; back panel; left panel; right panel.

## Special Requirements
Keep assembly split unchanged. Ensure mating surfaces are clean and flat for optimal glue adhesion.

## Planned Component Quantity
5

## Component Names
- base_panel
- front_panel
- back_panel
- left_panel
- right_panel

## Adjustable Parameters
- **outer_width**: 92.0 (76.0 ~ 116.0 mm). Controls the overall width of the pen box.
- **outer_depth**: 76.0 (60.0 ~ 100.0 mm). Controls the overall depth of the pen box.
- **wall_height**: 114.0 (86.0 ~ 154.0 mm). Determines the internal storage height for pens and stationery.
- **wall_thickness**: 3.0 (2.0 ~ 5.0 mm). Defines the structural thickness of the vertical side panels.
- **base_thickness**: 4.0 (2.8 ~ 6.0 mm). Defines the thickness of the bottom load-bearing panel.
- **window_width**: 42.0 (26.0 ~ 66.0 mm). Width of the side and back cutouts for weight reduction and visibility.
- **window_height**: 50.0 (50.0 ~ 90.0 mm). Height of the side and back cutouts.
- **window_bottom**: 28.0 (18.0 ~ 42.0 mm). Controls the vertical offset of the windows from the base to retain items at the bottom.

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
The foundational support of the pen box.
* **Component Purpose**: Acts as the main load-bearing bottom and provides a flat surface for attaching the vertical walls.
* **Assembly Direction**: Fixed base component, positioned at absolute Z = 0.
* **Connection & Kinematics**: Bonding (Glue) (Fully constrained in all directions (permanent)). 

### 2. front_panel
The front enclosure of the box.
* **Component Purpose**: Retains the stored items from the front. Spans the inner width between the left and right panels.
* **Assembly Direction**: Placed vertically along the +Z axis, resting on the base panel at the front edge.
* **Connection & Kinematics**: Bonding (Glue) (Fully constrained in all directions (permanent)). Glued to the base panel and the inner faces of the side panels.

### 3. back_panel
The rear enclosure of the box.
* **Component Purpose**: Retains the stored items from the back. Features a central window cutout for visibility and material reduction.
* **Assembly Direction**: Placed vertically along the +Z axis, resting on the base panel at the rear edge.
* **Connection & Kinematics**: Bonding (Glue) (Fully constrained in all directions (permanent)). Glued to the base panel and the inner faces of the side panels.

### 4. left_panel
The left side enclosure of the box.
* **Component Purpose**: Provides lateral support and encloses the left side. Features a central window cutout. Spans the full outer depth.
* **Assembly Direction**: Placed vertically along the +Z axis, resting on the base panel at the left edge.
* **Connection & Kinematics**: Bonding (Glue) (Fully constrained in all directions (permanent)). Glued to the base panel and caps the edges of the front and back panels.

### 5. right_panel
The right side enclosure of the box.
* **Component Purpose**: Provides lateral support and encloses the right side. Features a central window cutout. Spans the full outer depth.
* **Assembly Direction**: Placed vertically along the +Z axis, resting on the base panel at the right edge.
* **Connection & Kinematics**: Bonding (Glue) (Fully constrained in all directions (permanent)). Glued to the base panel and caps the edges of the front and back panels.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 5-component model:

* **front_panel -> base_panel** | Joint: Bonding (Glue) | Note: Bottom edge glued to the front top surface of the base panel.
* **back_panel -> base_panel** | Joint: Bonding (Glue) | Note: Bottom edge glued to the rear top surface of the base panel.
* **left_panel -> base_panel** | Joint: Bonding (Glue) | Note: Bottom edge glued to the left top surface of the base panel.
* **right_panel -> base_panel** | Joint: Bonding (Glue) | Note: Bottom edge glued to the right top surface of the base panel.
* **left_panel -> front_panel & back_panel** | Joint: Bonding (Glue) | Note: Inner face of the left panel glued to the left edges of the front and back panels.
* **right_panel -> front_panel & back_panel** | Joint: Bonding (Glue) | Note: Inner face of the right panel glued to the right edges of the front and back panels.
