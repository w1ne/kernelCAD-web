# plant_shelf (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a multi-tier wooden plant shelf with slatted shelves and dowel-based assembly for displaying potted plants.

## Geometry and Dimensions
Approx. 630.0 mm × 310.0 mm × 750.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
Nailing

## Mechanical Condition
Load-bearing storage for plants.

## Structural Features
Four vertical uprights; horizontal side rails (bottom and 3 tiers); slatted shelf panels for 3 tiers.

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
36

## Component Names
- right_front_upright
- right_back_upright
- left_front_upright
- left_back_upright
- right_bottom_rail
- left_bottom_rail
- tier1_left_rail
- tier1_right_rail
- tier1_slat_01 to tier1_slat_08
- tier2_left_rail
- tier2_right_rail
- tier2_slat_01 to tier2_slat_08
- tier3_left_rail
- tier3_right_rail
- tier3_slat_01 to tier3_slat_08

## Adjustable Parameters
- **frame_width**: 600.0 (400.0 ~ 800.0 mm). Controls the overall width of the shelf frame.
- **frame_depth**: 300.0 (200.0 ~ 400.0 mm). Controls the depth of the shelf frame.
- **tier1_height**: 250.0 (150.0 ~ 400.0 mm). Sets the vertical position of the first shelf tier.
- **tier2_height**: 500.0 (350.0 ~ 650.0 mm). Sets the vertical position of the second shelf tier.
- **tier3_height**: 750.0 (550.0 ~ 900.0 mm). Sets the vertical position of the top shelf tier and determines the total height of the uprights.
- **board_thickness**: 10.0 (6.0 ~ 14.0 mm). Determines the structural thickness of the timber boards.
- **board_width**: 30.0 (20.0 ~ 40.0 mm). Determines the width of the uprights, rails, and slats.
- **slat_gap**: 7.0 (3.0 ~ 12.0 mm). Controls the spacing between adjacent slats on each tier for drainage and aesthetics.
- **hole_radius**: 1.0 (0.5 ~ 3.0 mm). Defines the radius of the dowel holes for assembly.
- **hole_depth**: 3.0 (1.0 ~ 8.0 mm). Determines the insertion depth of the dowel pins into the components.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1~4. Uprights (Right Front, Right Back, Left Front, Left Back)
The vertical supporting entities of the shelf.
* **Component Purpose**: Vertical support. Transfers the load of the shelves to the ground, ensuring structural stability.
* **Assembly Direction**: Vertical base components, positioned along the Z-axis.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features horizontal holes on the inner faces to connect with the side rails at each tier height.

### 5~12. Rails (Bottom and Tiers 1-3, Left and Right)
The horizontal structural supports connecting the uprights.
* **Component Purpose**: Horizontal framework. Connects the front and back uprights and provides a resting base for the slats.
* **Assembly Direction**: Inserted horizontally along the Y-axis between the front and back uprights.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features holes on the ends for upright connection and on the top face for slat alignment.

### 13~36. Slats (Tiers 1-3)
The functional shelf surfaces.
* **Component Purpose**: Shelf platform. Spans across the left and right rails to form the load-bearing surface for potted plants.
* **Assembly Direction**: Placed downwards along the -Z axis onto the tier rails.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features through-holes at each end to align with the top holes of the rails.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 36-component model:

* **Left Bottom Rail -> Left Front/Back Uprights** | Joint: Dowel Joint | Note: Rail ends connect to upright inner faces.
* **Right Bottom Rail -> Right Front/Back Uprights** | Joint: Dowel Joint | Note: Rail ends connect to upright inner faces.
* **Tier Rails -> Uprights** | Joint: Dowel Joint | Note: Rail ends connect to upright inner faces at respective tier heights.
* **Tier Slats -> Tier Rails** | Joint: Dowel Joint | Note: Slat bottom faces connect to rail top faces via dowel alignment.
