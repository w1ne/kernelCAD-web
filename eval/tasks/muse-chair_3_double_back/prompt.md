# chair_3_double_back (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a slatted wooden chair featuring a double-sided frame, a multi-slat backrest, and a slatted seat, designed for dowel-based assembly.

## Geometry and Dimensions
Approx. 425.0 mm × 420.0 mm × 750.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
Dowel Joint

## Mechanical Condition
Single-person seating.

## Structural Features
Slatted seat panel; left and right side frames (each with front/back uprights and upper/lower rails); under-seat support rails; multi-slat backrest.

## Special Requirements
Keep assembly split unchanged. Ensure all cylindrical cuts for dowel pins align perfectly between mating components.

## Planned Component Quantity
28

## Component Names
- seat_slat_01 to seat_slat_12
- left_under_seat_rail
- right_under_seat_rail
- right_back_upright
- right_front_upright
- right_lower_side_rail
- right_upper_side_rail
- left_back_upright
- left_front_upright
- left_lower_side_rail
- left_upper_side_rail
- back_slat_01 to back_slat_06

## Adjustable Parameters
- **board_length**: 750.0 (600.0 ~ 900.0 mm). Determines the overall height of the chair and the backrest uprights.
- **board_thickness**: 10.0 (6.0 ~ 24.0 mm). Controls the structural thickness of the slats and frame members.
- **seat_length**: 400.0 (320.0 ~ 520.0 mm). Determines the transverse width of the seating area.
- **seat_height**: 400.0 (320.0 ~ 520.0 mm). Ergonomic height of the seat surface from the ground.
- **board_width**: 25.0 (12.0 ~ 50.0 mm). Width of the individual slats and structural frame members.
- **seat_board_gap**: 6.96 (2.0 ~ 18.0 mm). Spacing between adjacent seat slats to allow for visual design and material expansion.
- **hole_radius**: 1.0 (0.5 ~ 3.0 mm). Radius of the cylindrical cuts used for the dowel joints.
- **hole_depth**: 3.0 (1.0 ~ 8.0 mm). Depth of the blind holes for the dowel insertions.
- **horizontal_bottom_board_length**: 400.0 (300.0 ~ 560.0 mm). Determines the depth of the chair's side frames and under-seat rails.
- **back_slat_spacing**: 28.0 (18.0 ~ 50.0 mm). Vertical center-to-center distance between the backrest slats.
- **back_slat_top_margin**: 20.0 (10.0 ~ 45.0 mm). Distance from the top of the back uprights to the highest back slat.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1~12. Seat Slats (`seat_slat_01` to `seat_slat_12`)
The horizontal surfaces forming the seating area.
* **Component Purpose**: Directly supports the user's weight. Distributes the load to the under-seat rails.
* **Assembly Direction**: Placed downwards along the -Z axis onto the under-seat rails.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features cylindrical holes on the bottom face to align with the under-seat rails.

### 13~14. Under Seat Rails (`left_under_seat_rail`, `right_under_seat_rail`)
The primary horizontal load-bearing beams beneath the seat.
* **Component Purpose**: Supports the seat slats and transfers the vertical load to the front and back uprights.
* **Assembly Direction**: Horizontal placement along the Y axis between the uprights.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features vertical holes on the top edge for seat slats and horizontal holes on the ends for the uprights.

### 15, 16, 19, 20. Side Uprights (`right_back_upright`, `right_front_upright`, `left_back_upright`, `left_front_upright`)
The main vertical structural pillars of the chair.
* **Component Purpose**: Transfers all loads to the ground. The back uprights extend upwards to support the back slats.
* **Assembly Direction**: Vertical standing components, acting as the base frame reference.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features multiple blind holes on the inner faces to receive side rails, under-seat rails, and back slats.

### 17, 18, 21, 22. Side Rails (`right_lower_side_rail`, `right_upper_side_rail`, `left_lower_side_rail`, `left_upper_side_rail`)
Horizontal braces for the left and right side frames.
* **Component Purpose**: Prevents the front and back uprights from splaying, ensuring structural rigidity of the side frames.
* **Assembly Direction**: Inserted horizontally along the Y axis between the front and back uprights.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features holes on the end faces mating with the uprights.

### 23~28. Back Slats (`back_slat_01` to `back_slat_06`)
The horizontal boards forming the backrest.
* **Component Purpose**: Provides lumbar and back support for the user. Ties the left and right back uprights together.
* **Assembly Direction**: Inserted horizontally along the X axis between the left and right back uprights.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features holes on the end faces mating with the inner faces of the back uprights.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 28-component model:

* **Seat Slats (01-12) -> Under Seat Rails** | Joint: Dowel Joint | Note: Bottom of seat slats connect to the top edge of the under-seat rails.
* **Under Seat Rails -> Front & Back Uprights** | Joint: Dowel Joint | Note: Ends of the under-seat rails connect to the inner faces of the uprights.
* **Lower/Upper Side Rails -> Front & Back Uprights** | Joint: Dowel Joint | Note: Ends of the side rails connect to the inner faces of the uprights to form rigid side frames.
* **Back Slats (01-06) -> Left & Right Back Uprights** | Joint: Dowel Joint | Note: Ends of the back slats connect to the inner faces of the extended back uprights.
