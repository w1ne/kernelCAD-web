# cnc_tv_stand_compact_console (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a compact TV console sized for smaller apartments, featuring one central divider and one shelf level, designed for flat-pack assembly.

## Geometry and Dimensions
Approx. 1180.0 mm × 380.0 mm × 460.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Load-bearing storage (supporting a television, media devices, and internal storage items).

## Structural Features
Top panel; bottom panel; left side panel; right side panel; center divider; two shelf segments.

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
7

## Component Names
- top_panel
- bottom_panel
- left_side_panel
- right_side_panel
- center_divider_01
- shelf_l01_b01
- shelf_l01_b02

## Adjustable Parameters
- **width**: 1180.0 (1080.0 ~ 1320.0 mm). Controls the overall span of the TV stand to accommodate different screen sizes.
- **depth**: 380.0 (280.0 ~ 520.0 mm). Determines the footprint and internal storage capacity.
- **height**: 460.0 (400.0 ~ 540.0 mm). Sets the vertical elevation of the TV for optimal viewing angles.
- **thickness**: 18.0 (12.0 ~ 26.0 mm). General panel thickness ensuring overall structural stiffness.
- **top_thickness**: 18.0 (12.0 ~ 26.0 mm). Thickness of the top load-bearing panel to prevent sagging under the TV's weight.
- **bottom_thickness**: 18.0 (12.0 ~ 26.0 mm). Thickness of the base panel for foundational stability.
- **tab_width**: 18.0 (100.0 ~ 158.0 mm). Width of the interlocking tenons (tabs) for assembly connections.
- **corner_radius**: 10.0 (0.0 ~ 30.0 mm). Rounds the corners of the top panel for safety and aesthetics.
- **shelf_depth**: 330.0 (230.0 ~ 470.0 mm). Depth of the internal shelves, slightly recessed from the main frame.
- **shelf_thickness**: 18.0 (12.0 ~ 26.0 mm). Thickness of the shelf panels to support media equipment without deformation.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1. top_panel
The main upper surface of the console.
* **Component Purpose**: Acts as the primary load-bearing platform for the TV and ties the vertical supports together at the top.
* **Assembly Direction**: Pressed downwards along the -Z axis onto the vertical panels.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Features mortise slots on its underside to receive the top tenons of the side panels and divider.

### 2. bottom_panel
The foundational base of the console.
* **Component Purpose**: Rests on the floor, providing a stable base and tying the vertical supports together at the bottom.
* **Assembly Direction**: Fixed base component, positioned at absolute $Z = 0$.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Features mortise slots on its top face to receive the bottom tenons of the side panels and divider.

### 3. left_side_panel
The left vertical enclosure and support.
* **Component Purpose**: Encloses the left side of the console, transferring loads from the top panel to the bottom panel, and supporting the left shelf.
* **Assembly Direction**: Inserted vertically between the top and bottom panels.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features top and bottom tenons (tabs) and internal mortise slots for the shelf.

### 4. right_side_panel
The right vertical enclosure and support.
* **Component Purpose**: Encloses the right side of the console, transferring loads from the top panel to the bottom panel, and supporting the right shelf.
* **Assembly Direction**: Inserted vertically between the top and bottom panels.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features top and bottom tenons (tabs) and internal mortise slots for the shelf.

### 5. center_divider_01
The central vertical support.
* **Component Purpose**: Divides the internal space into two bays and provides mid-span load-bearing support to prevent the top panel from sagging.
* **Assembly Direction**: Inserted vertically between the top and bottom panels.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features top and bottom tenons, and mortise slots on both sides to support the inner edges of the shelves.

### 6. shelf_l01_b01
The horizontal storage platform in the left bay.
* **Component Purpose**: Provides a dedicated surface for media devices or storage within the left section.
* **Assembly Direction**: Inserted horizontally along the X/Y axis into the left panel and center divider.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features side tenons that lock into the corresponding slots of the vertical supports.

### 7. shelf_l01_b02
The horizontal storage platform in the right bay.
* **Component Purpose**: Provides a dedicated surface for media devices or storage within the right section.
* **Assembly Direction**: Inserted horizontally along the X/Y axis into the right panel and center divider.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features side tenons that lock into the corresponding slots of the vertical supports.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 7-component model:

* **left_side_panel -> bottom_panel** | Joint: interlocking | Note: Bottom tabs of left panel inserted into bottom panel slots.
* **right_side_panel -> bottom_panel** | Joint: interlocking | Note: Bottom tabs of right panel inserted into bottom panel slots.
* **center_divider_01 -> bottom_panel** | Joint: interlocking | Note: Bottom tabs of divider inserted into bottom panel slots.
* **shelf_l01_b01 -> left_side_panel** | Joint: interlocking | Note: Left tabs of shelf inserted into left panel slots.
* **shelf_l01_b01 -> center_divider_01** | Joint: interlocking | Note: Right tabs of shelf inserted into left side of the center divider.
* **shelf_l01_b02 -> center_divider_01** | Joint: interlocking | Note: Left tabs of shelf inserted into right side of the center divider.
* **shelf_l01_b02 -> right_side_panel** | Joint: interlocking | Note: Right tabs of shelf inserted into right panel slots.
* **top_panel -> left_side_panel** | Joint: interlocking | Note: Top tabs of left panel inserted into top panel slots.
* **top_panel -> right_side_panel** | Joint: interlocking | Note: Top tabs of right panel inserted into top panel slots.
* **top_panel -> center_divider_01** | Joint: interlocking | Note: Top tabs of divider inserted into top panel slots.
