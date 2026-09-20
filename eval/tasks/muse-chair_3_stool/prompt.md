# chair_3_stool (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a backless slatted stool designed for board-based assembly using dowel pins.

## Geometry and Dimensions
Approx. 410.0 mm × 400.0 mm × 450.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
Dowel Joint

## Mechanical Condition
Single-person seating.

## Structural Features
Slatted seat surface; left side support frame; right side support frame; under-seat support rails.

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
20

## Component Names
- seat_slat_01 through seat_slat_10
- left_under_seat_rail
- right_under_seat_rail
- right_front_upright
- right_rear_upright
- right_lower_side_rail
- right_upper_side_rail
- left_front_upright
- left_rear_upright
- left_lower_side_rail
- left_upper_side_rail

## Adjustable Parameters
- **board_length**: 450.0 (360.0 ~ 560.0 mm). Determines the overall height of the stool uprights.
- **board_thickness**: 10.0 (6.0 ~ 24.0 mm). Defines the thickness of the structural boards, ensuring adequate material for dowel hole depth.
- **board_width**: 30.0 (15.0 ~ 60.0 mm). Defines the width of the frame members and seat slats.
- **seat_length**: 380.0 (300.0 ~ 480.0 mm). Determines the depth of the seating area.
- **seat_height**: 420.0 (360.0 ~ 520.0 mm). Strictly follows ergonomic standards for seating posture.
- **seat_board_gap**: 6.96 (2.0 ~ 18.0 mm). Controls the spacing between the seat slats, affecting the total number of slats generated.
- **hole_radius**: 1.0 (0.5 ~ 3.0 mm). Defines the radius of the cylindrical cuts for the dowel pins.
- **hole_depth**: 3.0 (1.0 ~ 8.0 mm). Determines the insertion depth for the dowel connections.
- **horizontal_bottom_board_length**: 380.0 (300.0 ~ 480.0 mm). Defines the length of the horizontal side rails connecting the uprights.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like cylindrical holes for dowel joints.
3. Place the part back in its original position within the sample assembly.

---

### 1~10. Seat Slats (seat_slat_01 to seat_slat_10)
The horizontal seating surface of the stool.
* **Component Purpose**: Acts as the primary load-bearing surface for the user, distributing weight to the under-seat rails.
* **Assembly Direction**: Placed horizontally along the X-axis, stacked along the Y-axis at absolute $Z = seat\_height$.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Bottom faces feature cylindrical holes to align with the under-seat rails.

### 11~12. Under Seat Rails (Left & Right)
The primary horizontal supports beneath the seat.
* **Component Purpose**: Bridges the front and rear uprights while providing a mounting base for the seat slats.
* **Assembly Direction**: Positioned horizontally along the Y-axis beneath the seat slats.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Top face features holes for the seat slats; side faces feature holes to connect to the uprights.

### 13, 14, 17, 18. Uprights (Right Front, Right Rear, Left Front, Left Rear)
The vertical supporting legs of the stool.
* **Component Purpose**: Transfers the load from the seat to the ground and acts as the vertical framework for the side rails.
* **Assembly Direction**: Positioned vertically along the Z-axis.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Inner faces feature cylindrical holes to receive the horizontal side rails and under-seat rails.

### 15, 16, 19, 20. Side Rails (Right Lower, Right Upper, Left Lower, Left Upper)
The horizontal bracing for the side frames.
* **Component Purpose**: Connects the front and rear uprights on each side to prevent racking and ensure structural stability.
* **Assembly Direction**: Positioned horizontally along the Y-axis between the uprights.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). End faces feature cylindrical holes aligning with the uprights.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 20-component model:

* **Seat Slats -> Under Seat Rails** | Joint: Dowel Joint | Note: Bottom of slats align with top of under-seat rails via dowel pins.
* **Left Under Seat Rail -> Left Uprights** | Joint: Dowel Joint | Note: Ends of the rail connect to the inner faces of the left front and rear uprights.
* **Right Under Seat Rail -> Right Uprights** | Joint: Dowel Joint | Note: Ends of the rail connect to the inner faces of the right front and rear uprights.
* **Left Side Rails (Upper/Lower) -> Left Uprights** | Joint: Dowel Joint | Note: Horizontal rails bridge the left front and rear uprights.
* **Right Side Rails (Upper/Lower) -> Right Uprights** | Joint: Dowel Joint | Note: Horizontal rails bridge the right front and rear uprights.
