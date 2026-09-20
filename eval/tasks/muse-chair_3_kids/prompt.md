# chair_3_kids (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a child-sized chair composed of wooden slats and boards, featuring a slatted seat and backrest designed for dowel-based assembly.

## Geometry and Dimensions
Approx. 322.0 mm × 316.0 mm × 440.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
Dowel Joint

## Mechanical Condition
Single-child seating, load-bearing furniture.

## Structural Features
Slatted seat panel; under-seat support rails; four vertical uprights (legs/backrest supports); horizontal side rails; slatted backrest.

## Special Requirements
Keep assembly split unchanged. Ensure all dowel holes align perfectly between mating components.

## Planned Component Quantity
24

## Component Names
- seat_slat_01 ~ seat_slat_11
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
- back_slat_01 ~ back_slat_03

## Adjustable Parameters
- **board_length**: 440.0 (350.0 ~ 550.0 mm). Determines the overall height of the chair and the backrest uprights.
- **board_thickness**: 8.0 (5.0 ~ 16.0 mm). Affects the structural robustness and weight of the chair components.
- **seat_length**: 300.0 (240.0 ~ 400.0 mm). Determines the depth of the seating area.
- **seat_height**: 280.0 (220.0 ~ 350.0 mm). Strictly follows ergonomic standards for a child's seating posture.
- **board_width**: 22.0 (12.0 ~ 40.0 mm). Width of the individual slats and frame members.
- **seat_board_gap**: 5.0 (2.0 ~ 12.0 mm). Controls the spacing between seat slats for aesthetics and material savings.
- **hole_radius**: 0.8 (0.4 ~ 2.0 mm). Radius of the dowel holes for assembly connections.
- **hole_depth**: 2.5 (1.0 ~ 6.0 mm). Determines the insertion depth for the dowel pins.
- **horizontal_bottom_board_length**: 300.0 (240.0 ~ 400.0 mm). Length of the lower side rails providing base stability.
- **back_slat_spacing**: 28.0 (16.0 ~ 50.0 mm). Vertical gap between backrest slats.
- **back_slat_top_margin**: 20.0 (10.0 ~ 40.0 mm). Distance from the top of the uprights to the first back slat.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like dowel holes via boolean cuts.
3. Place the part back in its original position within the sample assembly.

---

### 1~11. Seat Slats (seat_slat_01 to seat_slat_11)
The primary seating surface of the chair.
* **Component Purpose**: Provides direct load-bearing support for the user.
* **Assembly Direction**: Placed horizontally along the X-axis, spaced evenly along the Y-axis.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Bottom faces feature cylindrical blind holes that mate with the under-seat rails.

### 12~13. Under Seat Rails (left_under_seat_rail, right_under_seat_rail)
The primary horizontal supports for the seat.
* **Component Purpose**: Bridges the front and back uprights and provides a mounting base for the seat slats.
* **Assembly Direction**: Horizontal placement along the Y-axis.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Top faces feature holes for seat slats; side faces feature holes for connecting to the vertical uprights.

### 14, 15, 18, 19. Vertical Uprights (right_back, right_front, left_back, left_front)
The main vertical structural pillars.
* **Component Purpose**: Transfers all loads to the ground. The back uprights extend upwards to support the back slats.
* **Assembly Direction**: Vertical insertion along the Z-axis.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Inner faces feature blind holes to receive the horizontal side rails, under-seat rails, and back slats.

### 16, 17, 20, 21. Side Horizontal Rails (right_lower, right_upper, left_lower, left_upper)
Lateral stabilizers for the chair frame.
* **Component Purpose**: Connects the front and rear uprights at the top and bottom to prevent racking and ensure structural rigidity.
* **Assembly Direction**: Horizontal placement along the Y-axis.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Ends feature dowel holes mating with the vertical uprights.

### 22~24. Back Slats (back_slat_01 to back_slat_03)
The functional back support entity.
* **Component Purpose**: Provides lumbar and back support for the child.
* **Assembly Direction**: Horizontal placement along the X-axis, stacked vertically.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Ends feature dowel holes mating with the inner faces of the left and right back uprights.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 24-component model:

* **Seat Slats -> Under Seat Rails** | Joint: Dowel Joint | Note: Bottom of seat slats pinned to the top of the under-seat rails.
* **Under Seat Rails -> Vertical Uprights** | Joint: Dowel Joint | Note: Ends of under-seat rails pinned to the inner faces of the front and back uprights.
* **Side Horizontal Rails -> Vertical Uprights** | Joint: Dowel Joint | Note: Ends of horizontal rails pinned to the front and back uprights at upper and lower positions.
* **Back Slats -> Back Uprights** | Joint: Dowel Joint | Note: Ends of back slats pinned to the inner faces of the left and right back uprights.
