# cnc_tv_stand_storage_bench (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a storage-bench media stand with two shelf levels and a broad top surface, designed for CNC-machined wood assembly.

## Geometry and Dimensions
Approx. 1440.0 mm × 420.0 mm × 560.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Load-bearing storage, supporting media equipment (e.g., TV) and providing internal shelf storage.

## Structural Features
Top panel; bottom panel; two side panels (left/right); center divider; four shelf segments.

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
9

## Component Names
- top_panel
- bottom_panel
- left_side_panel
- right_side_panel
- center_divider_01
- shelf_l01_b01
- shelf_l01_b02
- shelf_l02_b01
- shelf_l02_b02

## Adjustable Parameters
- **width**: 1440.0 (1340.0 ~ 1580.0 mm). Defines the overall span of the stand.
- **depth**: 420.0 (320.0 ~ 560.0 mm). Defines the footprint depth of the stand.
- **height**: 560.0 (500.0 ~ 640.0 mm). Defines the overall height of the stand.
- **thickness**: 18.0 (12.0 ~ 26.0 mm). Defines the thickness of the main vertical support panels.
- **top_thickness**: 18.0 (12.0 ~ 26.0 mm). Defines the thickness of the top panel to ensure adequate load-bearing capacity for media equipment.
- **bottom_thickness**: 18.0 (12.0 ~ 26.0 mm). Defines the thickness of the bottom base panel.
- **tab_width**: 18.0 (100.0 ~ 158.0 mm). Defines the width of the tenon tabs used for interlocking the panels.
- **corner_radius**: 8.0 (0.0 ~ 28.0 mm). Defines the rounding radius of the top panel corners for safety and aesthetics.
- **shelf_depth**: 360.0 (260.0 ~ 500.0 mm). Defines the depth of the internal shelves, typically slightly recessed from the main frame.
- **shelf_thickness**: 18.0 (12.0 ~ 26.0 mm). Defines the thickness of the shelf panels to prevent sagging under load.

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
The main upper surface of the media stand.
* **Component Purpose**: Provides a broad, continuous surface for placing a TV or other media equipment. Features mortise slots on its underside to receive the tenons of the vertical supports.
* **Assembly Direction**: Placed downwards along the -Z axis onto the vertical supports.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose).

### 2. bottom_panel
The base surface of the media stand.
* **Component Purpose**: Provides a structural base and stability for the entire assembly. Features mortise slots to receive the bottom tenons of the vertical supports.
* **Assembly Direction**: Fixed base component, positioned at the bottom (absolute Z = 0).
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose).

### 3. left_side_panel
The left vertical support structure.
* **Component Purpose**: Supports the top panel and shelves on the left side. Features tenons on its top and bottom edges, and mortise slots on its inner face for the shelves.
* **Assembly Direction**: Inserted vertically between the top and bottom panels.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted).

### 4. right_side_panel
The right vertical support structure.
* **Component Purpose**: Supports the top panel and shelves on the right side. Features tenons on its top and bottom edges, and mortise slots on its inner face for the shelves.
* **Assembly Direction**: Inserted vertically between the top and bottom panels.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted).

### 5. center_divider_01
The central vertical support structure.
* **Component Purpose**: Divides the internal space into two bays and provides central load-bearing support for the top panel and shelves to prevent sagging.
* **Assembly Direction**: Inserted vertically between the top and bottom panels.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted).

### 6. shelf_l01_b01
The lower shelf in the left bay.
* **Component Purpose**: Provides a horizontal storage surface within the first (lower) level of the left bay.
* **Assembly Direction**: Inserted horizontally between the left side panel and the center divider.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted).

### 7. shelf_l01_b02
The lower shelf in the right bay.
* **Component Purpose**: Provides a horizontal storage surface within the first (lower) level of the right bay.
* **Assembly Direction**: Inserted horizontally between the center divider and the right side panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted).

### 8. shelf_l02_b01
The upper shelf in the left bay.
* **Component Purpose**: Provides a horizontal storage surface within the second (upper) level of the left bay.
* **Assembly Direction**: Inserted horizontally between the left side panel and the center divider.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted).

### 9. shelf_l02_b02
The upper shelf in the right bay.
* **Component Purpose**: Provides a horizontal storage surface within the second (upper) level of the right bay.
* **Assembly Direction**: Inserted horizontally between the center divider and the right side panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted).

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 9-component model:

* **left_side_panel -> bottom_panel** | Joint: interlocking | Note: Bottom tenons of the left panel inserted into the bottom panel's left slots.
* **right_side_panel -> bottom_panel** | Joint: interlocking | Note: Bottom tenons of the right panel inserted into the bottom panel's right slots.
* **center_divider_01 -> bottom_panel** | Joint: interlocking | Note: Bottom tenons of the center divider inserted into the bottom panel's center slots.
* **shelf_l01_b01 -> left_side_panel, center_divider_01** | Joint: interlocking | Note: Level 1, Bay 1 shelf tenons inserted into the corresponding slots of the left panel and center divider.
* **shelf_l01_b02 -> center_divider_01, right_side_panel** | Joint: interlocking | Note: Level 1, Bay 2 shelf tenons inserted into the corresponding slots of the center divider and right panel.
* **shelf_l02_b01 -> left_side_panel, center_divider_01** | Joint: interlocking | Note: Level 2, Bay 1 shelf tenons inserted into the corresponding slots of the left panel and center divider.
* **shelf_l02_b02 -> center_divider_01, right_side_panel** | Joint: interlocking | Note: Level 2, Bay 2 shelf tenons inserted into the corresponding slots of the center divider and right panel.
* **top_panel -> left_side_panel, right_side_panel, center_divider_01** | Joint: interlocking | Note: Top panel slots fit over the top tenons of all three vertical supports.
