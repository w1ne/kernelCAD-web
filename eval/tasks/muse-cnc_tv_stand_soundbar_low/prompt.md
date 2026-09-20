# cnc_tv_stand_soundbar_low (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a low-profile, soundbar-friendly TV stand with a shallow shelf and a generous open front bay, designed for flat-pack assembly.

## Geometry and Dimensions
Approx. 1500.0 mm × 360.0 mm × 380.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Load-bearing storage (supporting a television, soundbar, and media accessories).

## Structural Features
Top panel; bottom panel; left side panel; right side panel; shallow shelf.

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
5

## Component Names
- top_panel
- bottom_panel
- left_side_panel
- right_side_panel
- shelf_l01_b01

## Adjustable Parameters
- **width**: 1500.0 (1400.0 ~ 1640.0 mm). Defines the overall span of the TV stand.
- **depth**: 360.0 (260.0 ~ 500.0 mm). Determines the footprint and anti-overturning stability.
- **height**: 380.0 (320.0 ~ 460.0 mm). Sets the elevation of the top surface for optimal TV viewing height.
- **thickness**: 18.0 (12.0 ~ 26.0 mm). Global material thickness ensuring structural stiffness.
- **top_thickness**: 18.0 (12.0 ~ 26.0 mm). Specific thickness for the top load-bearing panel.
- **bottom_thickness**: 18.0 (12.0 ~ 26.0 mm). Specific thickness for the base panel.
- **tab_width**: 18.0 (100.0 ~ 158.0 mm). Controls the width of the mortise and tenon joints for assembly.
- **corner_radius**: 12.0 (0.0 ~ 32.0 mm). Rounds the corners of the top panel for safety and aesthetics.
- **shelf_depth**: 300.0 (200.0 ~ 440.0 mm). Depth of the internal storage shelf, kept shallow to accommodate wiring or specific devices.
- **shelf_thickness**: 18.0 (12.0 ~ 26.0 mm). Thickness of the shelf panel to prevent sagging under load.

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
The primary upper surface of the TV stand.
* **Component Purpose**: Acts as the main load-bearing base for the television. Features mortise slots to receive the vertical side panels.
* **Assembly Direction**: Placed downwards along the -Z axis onto the side panels.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose).

### 2. bottom_panel
The foundational base of the TV stand.
* **Component Purpose**: Provides ground contact and stability, tying the side panels together at the bottom to prevent splaying.
* **Assembly Direction**: Placed upwards along the +Z axis (or acts as the base into which side panels are inserted).
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose).

### 3. left_side_panel
The left vertical support structure.
* **Component Purpose**: Transfers the load from the top panel to the bottom panel. Features a "wing" profile, a "low" window cutout, top/bottom tenons, and slots for the shelf.
* **Assembly Direction**: Vertical insertion along the Z axis.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose).

### 4. right_side_panel
The right vertical support structure.
* **Component Purpose**: Transfers the load from the top panel to the bottom panel. Mirrors the left panel with a "wing" profile, a "low" window cutout, top/bottom tenons, and slots for the shelf.
* **Assembly Direction**: Vertical insertion along the Z axis.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose).

### 5. shelf_l01_b01
The internal horizontal storage surface.
* **Component Purpose**: Provides a dedicated platform for a soundbar or media devices.
* **Assembly Direction**: Inserted horizontally or captured between the side panels during assembly.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose).

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 5-component model:

* **left_side_panel -> bottom_panel** | Joint: interlocking | Note: Bottom tenons of the left panel inserted into the bottom panel's left slots.
* **right_side_panel -> bottom_panel** | Joint: interlocking | Note: Bottom tenons of the right panel inserted into the bottom panel's right slots.
* **shelf_l01_b01 -> left_side_panel** | Joint: interlocking | Note: Left end of the shelf inserted into the left panel's horizontal slot.
* **shelf_l01_b01 -> right_side_panel** | Joint: interlocking | Note: Right end of the shelf inserted into the right panel's horizontal slot.
* **top_panel -> left_side_panel** | Joint: interlocking | Note: Top panel slots fitted over the top tenons of the left side panel.
* **top_panel -> right_side_panel** | Joint: interlocking | Note: Top panel slots fitted over the top tenons of the right side panel.
