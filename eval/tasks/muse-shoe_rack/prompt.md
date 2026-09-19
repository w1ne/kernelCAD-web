# shoe_rack (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a multi-tier, open-shelf shoe rack designed for wood-based assembly using dowel joints.

## Geometry and Dimensions
Approx. 600.0 mm × 280.0 mm × 500.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
Nailing

## Mechanical Condition
Load-bearing storage for footwear.

## Structural Features
Four vertical uprights; horizontal side rails (bottom, top, and intermediate tiers); horizontal slats forming the shelves.

## Special Requirements
Keep assembly split unchanged. Ensure all dowel holes align perfectly between mating components.

## Planned Component Quantity
38

## Component Names
- right_front_upright
- right_back_upright
- left_front_upright
- left_back_upright
- right_bottom_rail
- left_bottom_rail
- tier_1_left_rail
- tier_1_right_rail
- tier_1_slat_01 to tier_1_slat_08
- tier_2_left_rail
- tier_2_right_rail
- tier_2_slat_01 to tier_2_slat_08
- tier_3_left_rail
- tier_3_right_rail
- tier_3_slat_01 to tier_3_slat_08
- right_top_rail
- left_top_rail

## Adjustable Parameters
- **rack_width**: 600.0 (400.0 ~ 900.0 mm). Controls the overall width of the shoe rack to accommodate different spatial constraints.
- **rack_depth**: 280.0 (200.0 ~ 350.0 mm). Determines the depth of the shelves, sized to fit standard footwear.
- **rack_height**: 500.0 (350.0 ~ 700.0 mm). Controls the total height of the rack.
- **num_tiers**: 3 (2.0 ~ 5.0). Determines the number of storage shelves available.
- **board_thickness**: 10.0 (6.0 ~ 14.0 mm). Ensures structural stiffness of the timber boards while preventing excessive weight.
- **board_width**: 25.0 (15.0 ~ 40.0 mm). Defines the width of the individual structural members (uprights, rails, and slats).
- **slat_gap**: 8.0 (3.0 ~ 15.0 mm). Spacing between slats to provide ventilation for shoes and reduce material usage.
- **hole_radius**: 1.0 (0.5 ~ 3.0 mm). Radius of the dowel holes used for alignment and assembly.
- **hole_depth**: 3.0 (1.0 ~ 8.0 mm). Depth of the blind holes for dowel insertion, ensuring adequate bite without piercing through the boards.

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
The primary vertical supports of the rack.
* **Component Purpose**: Vertical structural support. Transfers the load of the tiers to the ground and provides localization references for all horizontal rails.
* **Assembly Direction**: Vertical base components, positioned along the Z-axis.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features through-holes along the Y-axis for side rail dowels, and blind holes on the top face for top rail dowels.

### 5~6. Bottom Rails (Right, Left)
The foundational horizontal links.
* **Component Purpose**: Structural linking between front and back uprights at the base to prevent splaying and ensure frame rigidity.
* **Assembly Direction**: Inserted horizontally along the Y-axis between the front and back uprights.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features dowel holes on the front and back ends mating with the uprights.

### 7~12. Tier Rails (Left and Right for Tiers 1~3)
The horizontal supports for the shoe shelves.
* **Component Purpose**: Links the front and back uprights at each tier level and provides the mounting base for the horizontal slats.
* **Assembly Direction**: Inserted horizontally along the Y-axis between the front and back uprights.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features dowel holes on the ends for upright connection, and upward-facing blind holes for slat alignment.

### 13~36. Tier Slats (Tiers 1~3, Slats 01~08)
The resting surfaces for the footwear.
* **Component Purpose**: Spans the width of the rack to form the breathable shelf surfaces for storing shoes.
* **Assembly Direction**: Placed downwards along the -Z axis onto the tier rails.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features through-holes at each end that align with the upward-facing holes of the tier rails.

### 37~38. Top Rails (Right, Left)
The upper capping structures.
* **Component Purpose**: Caps the front and back uprights, providing top structural rigidity and a finished look.
* **Assembly Direction**: Pressed downwards along the -Z axis onto the top faces of the uprights.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features vertical through-holes that drop dowels into the uprights' top blind holes.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 38-component model:

* **Bottom Rails -> Uprights** | Joint: Dowel Joint | Note: Rail ends connect to the lower side holes of the front and back uprights.
* **Tier Rails -> Uprights** | Joint: Dowel Joint | Note: Rail ends connect to the side holes of the uprights at their respective tier heights.
* **Top Rails -> Uprights** | Joint: Dowel Joint | Note: Top rail bottom faces connect to the upright top faces via vertical dowels.
* **Tier Slats -> Tier Rails** | Joint: Dowel Joint | Note: Slat ends connect to the upward-facing dowel holes on the left and right tier rails.
