# pen_holder_glue_double_caddy (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a glued rectangular desk caddy with two compartments for organizing pens and stationery.

## Geometry and Dimensions
Approx. 126.0 mm × 78.0 mm × 112.0 mm.

## Material
Acrylic

## Manufacturing Method
Laser Cutting

## Connection Method (Joint Type)
Bonding (Glue)

## Mechanical Condition
Desktop storage, stationary load-bearing for pens and small tools.

## Structural Features
Base panel; front and back panels; left and right side panels; center divider.

## Special Requirements
Keep assembly split unchanged. Ensure all mating surfaces are clean and flat for optimal solvent welding/glue adhesion.

## Planned Component Quantity
6

## Component Names
- base_panel
- front_panel
- back_panel
- left_panel
- right_panel
- center_divider

## Adjustable Parameters
- **outer_width**: 126.0 (110.0 ~ 150.0 mm). Controls the overall width of the caddy.
- **outer_depth**: 78.0 (62.0 ~ 102.0 mm). Controls the overall depth of the caddy.
- **wall_height**: 108.0 (80.0 ~ 148.0 mm). Determines the internal storage depth for the compartments.
- **wall_thickness**: 3.0 (2.0 ~ 5.0 mm). Defines the thickness of the vertical panels, constrained by standard laser cutting sheet thicknesses.
- **base_thickness**: 4.0 (2.8 ~ 6.0 mm). Defines the thickness of the bottom panel to ensure structural stability and a solid gluing foundation.

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
The foundational platform of the caddy.
* **Component Purpose**: Acts as the bottom support, holding the stored items and providing a flat base for gluing the vertical walls.
* **Assembly Direction**: Fixed base component, positioned at absolute Z = 0.
* **Connection & Kinematics**: Bonding (Glue) (Fully constrained in all directions (permanent)).

### 2. front_panel
The front boundary of the caddy.
* **Component Purpose**: Retains items within the front of the compartments and provides structural rigidity to the side panels.
* **Assembly Direction**: Placed vertically along the +Z axis, resting on the base panel at the front edge.
* **Connection & Kinematics**: Bonding (Glue) (Fully constrained in all directions (permanent)). Glued to the base panel and the inner faces of the left and right panels.

### 3. back_panel
The rear boundary of the caddy.
* **Component Purpose**: Retains items within the rear of the compartments and provides structural rigidity.
* **Assembly Direction**: Placed vertically along the +Z axis, resting on the base panel at the rear edge.
* **Connection & Kinematics**: Bonding (Glue) (Fully constrained in all directions (permanent)). Glued to the base panel and the inner faces of the left and right panels.

### 4. left_panel
The left boundary of the caddy.
* **Component Purpose**: Encloses the left side, spanning the full depth of the caddy to cap the front and back panels.
* **Assembly Direction**: Placed vertically along the +Z axis, resting on the base panel at the left edge.
* **Connection & Kinematics**: Bonding (Glue) (Fully constrained in all directions (permanent)). Glued to the base panel and the end faces of the front and back panels.

### 5. right_panel
The right boundary of the caddy.
* **Component Purpose**: Encloses the right side, spanning the full depth of the caddy to cap the front and back panels.
* **Assembly Direction**: Placed vertically along the +Z axis, resting on the base panel at the right edge.
* **Connection & Kinematics**: Bonding (Glue) (Fully constrained in all directions (permanent)). Glued to the base panel and the end faces of the front and back panels.

### 6. center_divider
The internal partition of the caddy.
* **Component Purpose**: Divides the internal volume into two separate compartments for organization.
* **Assembly Direction**: Placed vertically along the +Z axis, resting on the center of the base panel.
* **Connection & Kinematics**: Bonding (Glue) (Fully constrained in all directions (permanent)). Glued to the base panel and the inner faces of the front and back panels.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 6-component model:

* **front_panel -> base_panel** | Joint: Bonding (Glue) | Note: Bottom edge glued to the front top surface of the base panel.
* **back_panel -> base_panel** | Joint: Bonding (Glue) | Note: Bottom edge glued to the rear top surface of the base panel.
* **left_panel -> base_panel** | Joint: Bonding (Glue) | Note: Bottom edge glued to the left top surface of the base panel.
* **right_panel -> base_panel** | Joint: Bonding (Glue) | Note: Bottom edge glued to the right top surface of the base panel.
* **center_divider -> base_panel** | Joint: Bonding (Glue) | Note: Bottom edge glued to the center top surface of the base panel.
* **front_panel -> left_panel & right_panel** | Joint: Bonding (Glue) | Note: Side edges of the front panel are glued to the inner faces of the left and right panels.
* **back_panel -> left_panel & right_panel** | Joint: Bonding (Glue) | Note: Side edges of the back panel are glued to the inner faces of the left and right panels.
* **center_divider -> front_panel & back_panel** | Joint: Bonding (Glue) | Note: Ends of the divider are glued to the inner faces of the front and back panels.
