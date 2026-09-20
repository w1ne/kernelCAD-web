# laptop_stand_2 (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a wide, dual-frame laptop or equipment stand designed for stable desktop support and ergonomic viewing angles.

## Geometry and Dimensions
Approx. 800.0 mm × 800.0 mm × 347.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
Nailing

## Mechanical Condition
Static load-bearing support for laptops or similar desktop equipment.

## Structural Features
Two side frames (front and rear profiles); three cross-support rods (one upper, two base).

## Special Requirements
Keep assembly split unchanged. Ensure rod clearances are maintained for proper assembly.

## Planned Component Quantity
5

## Component Names
- front_side_frame
- rear_side_frame
- upper_support_rod
- left_base_rod
- right_base_rod

## Adjustable Parameters
- **panel_thickness**: 40 (20.0 ~ 80.0 mm). Determines the structural rigidity of the side frames and the depth of the rod insertion.
- **rod_radius**: 15 (8.0 ~ 30.0 mm). Controls the thickness of the cross-support rods; lower limit ensures load-bearing stiffness, upper limit prevents interference with the frame profile.
- **rod_span**: 800 (500.0 ~ 1200.0 mm). Defines the overall width of the stand and the distance between the two side frames.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1. front_side_frame
The primary side support profile of the stand.
* **Component Purpose**: Acts as the main structural side bracket, providing the angled resting surface for the equipment and housing the insertion holes for the cross rods.
* **Assembly Direction**: Fixed base component, positioned at absolute Y = 0.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features three circular cutouts with a defined `rod_clearance` to accept the support rods.

### 2. rear_side_frame
The secondary side support profile of the stand.
* **Component Purpose**: Mirrors the front frame to provide parallel support on the opposite side, ensuring lateral stability.
* **Assembly Direction**: Positioned parallel to the front frame, offset along the -Y axis by `rod_span`.
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Features three circular cutouts identical to the front frame to accept the opposite ends of the support rods.

### 3. upper_support_rod
The top horizontal connecting cylinder.
* **Component Purpose**: Connects the upper sections of the two side frames, providing structural rigidity and acting as a backstop or upper resting point for the equipment.
* **Assembly Direction**: Inserted horizontally along the Y axis between the frames at support point (40, 0, 295).
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Inserted into the upper circular cutouts of both side frames.

### 4. left_base_rod
The front/left lower horizontal connecting cylinder.
* **Component Purpose**: Connects the lower front sections of the two side frames, preventing the frames from splaying and providing base stability.
* **Assembly Direction**: Inserted horizontally along the Y axis between the frames at support point (40, 0, 45).
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Inserted into the lower-front circular cutouts of both side frames.

### 5. right_base_rod
The rear/right lower horizontal connecting cylinder.
* **Component Purpose**: Connects the lower rear sections of the two side frames, completing the rigid triangular base structure.
* **Assembly Direction**: Inserted horizontally along the Y axis between the frames at support point (740, 0, 45).
* **Connection & Kinematics**: Dowel Joint (Constrains 2 translations + 2 rotations). Inserted into the lower-rear circular cutouts of both side frames.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 5-component model:

* **upper_support_rod -> front_side_frame** | Joint: Dowel Joint | Note: Rod end inserted into the upper hole of the front frame.
* **upper_support_rod -> rear_side_frame** | Joint: Dowel Joint | Note: Rod end inserted into the upper hole of the rear frame.
* **left_base_rod -> front_side_frame** | Joint: Dowel Joint | Note: Rod end inserted into the lower-front hole of the front frame.
* **left_base_rod -> rear_side_frame** | Joint: Dowel Joint | Note: Rod end inserted into the lower-front hole of the rear frame.
* **right_base_rod -> front_side_frame** | Joint: Dowel Joint | Note: Rod end inserted into the lower-rear hole of the front frame.
* **right_base_rod -> rear_side_frame** | Joint: Dowel Joint | Note: Rod end inserted into the lower-rear hole of the rear frame.
