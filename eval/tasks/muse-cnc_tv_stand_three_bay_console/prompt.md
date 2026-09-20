# cnc_tv_stand_three_bay_console (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a three-bay media console (TV stand) with two internal dividers and a continuous shelf level, designed for flat-pack CNC-machined assembly.

## Geometry and Dimensions
Approx. 1680.0 mm × 420.0 mm × 480.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Load-bearing storage (supports television and media equipment).

## Structural Features
Top panel; bottom panel; left side panel; right side panel; two center dividers; three shelf segments.

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
- center_divider_02
- shelf_l01_b01
- shelf_l01_b02
- shelf_l01_b03

## Adjustable Parameters
- **width**: 1680.0 (1580.0 ~ 1820.0 mm). Defines the overall span of the media console.
- **depth**: 420.0 (320.0 ~ 560.0 mm). Determines the storage capacity and footprint.
- **height**: 480.0 (420.0 ~ 560.0 mm). Sets the vertical elevation of the console.
- **thickness**: 18.0 (12.0 ~ 26.0 mm). Standard material thickness for vertical structural stability.
- **top_thickness**: 18.0 (12.0 ~ 26.0 mm). Thickness of the top load-bearing surface to prevent sagging under TV weight.
- **bottom_thickness**: 18.0 (12.0 ~ 26.0 mm). Thickness of the base panel.
- **tab_width**: 18.0 (100.0 ~ 158.0 mm). Controls the width of the tenons/tabs for assembly joints.
- **corner_radius**: 12.0 (0.0 ~ 32.0 mm). Defines the rounding of the top panel corners for safety and aesthetics.
- **shelf_depth**: 372.0 (272.0 ~ 512.0 mm). Depth of the internal shelving.
- **shelf_thickness**: 18.0 (12.0 ~ 26.0 mm). Thickness of the shelf panels to support media devices.

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
The main upper load-bearing surface.
* **Component Purpose**: Supports the television and encloses the top of the console. Provides mortise slots to locate and secure the side panels and dividers.
* **Assembly Direction**: Placed downwards along the -Z axis onto the vertical supports.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose).

### 2. bottom_panel
The base structural surface.
* **Component Purpose**: Acts as the foundational base, providing mortise slots for all vertical panels to ensure structural rigidity.
* **Assembly Direction**: Fixed base component, positioned at the bottom of the assembly.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose).

### 3~4. left_side_panel & right_side_panel
The outer vertical supports.
* **Component Purpose**: Encloses the sides of the console and transfers the load from the top panel to the bottom panel. Features tabs (tenons) on the top/bottom and slots for the outer shelf segments.
* **Assembly Direction**: Inserted vertically between the top and bottom panels.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose).

### 5~6. center_divider_01 & center_divider_02
The internal vertical supports.
* **Component Purpose**: Divides the console into three distinct bays, supports the top panel mid-span to prevent sagging, and provides bilateral slots for the inner shelf segments.
* **Assembly Direction**: Inserted vertically between the top and bottom panels.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose).

### 7~9. shelf_l01_b01, shelf_l01_b02, & shelf_l01_b03
The horizontal storage dividers.
* **Component Purpose**: Provides internal storage levels within each of the three bays for media equipment.
* **Assembly Direction**: Inserted horizontally into the slots of the vertical panels.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose).

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 9-component model:

* **left_side_panel -> bottom_panel** | Joint: interlocking | Note: Bottom tabs inserted into the bottom panel's far-left slots.
* **right_side_panel -> bottom_panel** | Joint: interlocking | Note: Bottom tabs inserted into the bottom panel's far-right slots.
* **center_divider_01 -> bottom_panel** | Joint: interlocking | Note: Bottom tabs inserted into the bottom panel's inner-left slots.
* **center_divider_02 -> bottom_panel** | Joint: interlocking | Note: Bottom tabs inserted into the bottom panel's inner-right slots.
* **top_panel -> All Vertical Panels** | Joint: interlocking | Note: Top panel slots fit over the top tabs of the side panels and center dividers.
* **shelf_l01_b01 -> left_side_panel & center_divider_01** | Joint: interlocking | Note: Left bay shelf tabs inserted into the adjacent vertical supports.
* **shelf_l01_b02 -> center_divider_01 & center_divider_02** | Joint: interlocking | Note: Center bay shelf tabs inserted into the two center dividers.
* **shelf_l01_b03 -> center_divider_02 & right_side_panel** | Joint: interlocking | Note: Right bay shelf tabs inserted into the adjacent vertical supports.
