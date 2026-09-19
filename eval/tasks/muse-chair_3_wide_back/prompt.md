# chair_3_wide_back (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a slatted-seat chair with a single wide back panel and side rail supports, designed for dowel-based wood assembly.

## Geometry and Dimensions
Approx. 430.0 mm × 420.0 mm × 650.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
Dowel Joint

## Mechanical Condition
Single-person seating.

## Structural Features
Multiple seat slats; two under-seat rails; four vertical uprights (legs); four horizontal side rails; single wide back panel.

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
22

## Component Names
- seat_slat_01
- seat_slat_02
- seat_slat_03
- seat_slat_04
- seat_slat_05
- seat_slat_06
- seat_slat_07
- seat_slat_08
- seat_slat_09
- seat_slat_10
- seat_slat_11
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
- back_panel

## Adjustable Parameters
- **board_length**: 650.0 (500.0 ~ 800.0 mm). Determines the overall height of the chair and the vertical uprights.
- **board_thickness**: 10.0 (6.0 ~ 24.0 mm). Defines the thickness of the structural boards and panels.
- **seat_length**: 400.0 (320.0 ~ 520.0 mm). Determines the depth of the seating area.
- **seat_height**: 400.0 (320.0 ~ 520.0 mm). Sets the ergonomic height of the seating surface from the ground.
- **board_width**: 30.0 (15.0 ~ 60.0 mm). Width of the structural frame boards and seat slats.
- **seat_board_gap**: 6.96 (2.0 ~ 18.0 mm). Controls the spacing between individual seat slats.
- **hole_radius**: 1.0 (0.5 ~ 3.0 mm). Radius of the cylindrical cuts used for dowel connections.
- **hole_depth**: 3.0 (1.0 ~ 8.0 mm). Determines the insertion depth for the dowel joints.
- **horizontal_bottom_board_length**: 400.0 (300.0 ~ 560.0 mm). Length of the horizontal side rails connecting the front and back uprights.
- **back_panel_height**: 180.0 (100.0 ~ 300.0 mm). Defines the vertical coverage of the wide backrest panel.
- **back_panel_margin**: 20.0 (10.0 ~ 50.0 mm). Sets the vertical clearance between the seat surface and the bottom edge of the back panel.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1~11. Seat Slats (seat_slat_01 to seat_slat_11)
The horizontal seating surface components.
* **Component Purpose**: Distributes the user's weight across the under-seat rails.
* **Assembly Direction**: Placed downwards along the -Z axis onto the under-seat rails.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features vertical cylindrical holes on the bottom face to align with the under-seat rails.

### 12~13. Under-Seat Rails (left_under_seat_rail, right_under_seat_rail)
The primary horizontal load-bearing supports for the seat.
* **Component Purpose**: Bridges the front and back uprights and provides a mounting base for the seat slats.
* **Assembly Direction**: Horizontal alignment along the Y-axis between the uprights.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features vertical holes on the top face for the slats, and horizontal holes on the ends to connect to the uprights.

### 14, 15, 18, 19. Vertical Uprights (right_back, right_front, left_back, left_front)
The main vertical structural pillars (legs).
* **Component Purpose**: Transfers all loads to the ground and provides the framework for rails and the back panel.
* **Assembly Direction**: Vertical base components.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features multiple horizontal cylindrical holes to receive the under-seat rails, side rails, and back panel.

### 16, 17, 20, 21. Side Rails (right_lower, right_upper, left_lower, left_upper)
Horizontal stabilizers connecting the front and back legs.
* **Component Purpose**: Prevents splaying of the legs and increases the overall rigidity of the chair frame.
* **Assembly Direction**: Horizontal insertion along the Y-axis into the uprights.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features horizontal holes at both ends mating with the uprights.

### 22. Back Panel
The single wide lumbar/back support.
* **Component Purpose**: Provides ergonomic back support for the user and adds lateral stability to the upper rear frame.
* **Assembly Direction**: Horizontal insertion along the X-axis between the left and right back uprights.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features horizontal holes on its side edges mating with the inner faces of the back uprights.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 22-component model:

* **Seat Slats (01-11) -> Under-Seat Rails** | Joint: Dowel Joint | Note: Bottom of slats connect to top of under-seat rails.
* **Under-Seat Rails -> Front & Back Uprights** | Joint: Dowel Joint | Note: Ends of under-seat rails connect to the inner faces of the uprights.
* **Upper & Lower Side Rails -> Front & Back Uprights** | Joint: Dowel Joint | Note: Ends of side rails connect to the inner faces of the uprights at top and bottom positions.
* **Back Panel -> Left & Right Back Uprights** | Joint: Dowel Joint | Note: Sides of the back panel connect to the inner faces of the rear uprights.
