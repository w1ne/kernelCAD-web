# chair_ladder (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a ladder-back style wooden chair designed for single-person seating, featuring a robust mortise-and-tenon assembly structure.

## Geometry and Dimensions
Approx. 420.0 mm × 400.0 mm × 900.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Single-person seating, load-bearing support, and backrest leaning torque resistance.

## Structural Features
Seat panel; two front legs; two rear posts (extending to form the backrest frame); three horizontal back slats.

## Special Requirements
Keep assembly split unchanged. Ensure exported STEP remains a closed solid.

## Planned Component Quantity
8

## Component Names
- seat_panel
- front_left_leg
- front_right_leg
- rear_left_post
- rear_right_post
- back_slat_01
- back_slat_02
- back_slat_03

## Adjustable Parameters
- **width**: 420 (300.0 ~ 650.0 mm). Determines the seating area width; constrains extreme values to prevent tipping caused by unbalanced length-to-width ratios.
- **depth**: 400 (300.0 ~ 600.0 mm). Determines the seating area depth.
- **seat_height**: 450 (350.0 ~ 520.0 mm). Strictly follows ergonomic standards for single-person seating posture.
- **post_height**: 900 (750.0 ~ 1150.0 mm). Determines the overall height of the backrest to provide adequate lumbar and shoulder support.
- **leg_thickness**: 40 (20.0 ~ 70.0 mm). Lower limit ensures load-bearing stiffness; upper limit prevents interference and material waste.
- **seat_thickness**: 30 (15.0 ~ 50.0 mm). Must be thick enough to accommodate the insertion depth of the front leg tenons and support the user's weight.
- **slat_height**: 45 (20.0 ~ 80.0 mm). Defines the vertical contact area of the backrest slats for ergonomic comfort.
- **slat_thickness**: 15 (8.0 ~ 30.0 mm). Ensures structural strength of the slats against leaning forces.
- **slat_spacing**: 30 (15.0 ~ 60.0 mm). Controls the vertical gap between back slats for aesthetic proportion and weight reduction.
- **tenon_length**: 20 (8.0 ~ 40.0 mm). Determines the bite depth of the physical connections for legs and slats.
- **tenon_offset**: 5 (2.0 ~ 20.0 mm). Controls the setback distance of the tenon relative to the part edge to prevent wood splitting during assembly.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1. seat_panel
The central hub of the chair.
* **Component Purpose**: Acts as the main load-bearing base and provides localization references and mechanical interfaces (sockets and through-holes) for the front legs and rear posts.
* **Assembly Direction**: Fixed base component, positioned at absolute $Z = seat\_height$.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Bottom features two rectangular sockets for front legs; rear features two oversized through-holes for the rear posts.

### 2~3. front_left_leg & front_right_leg
The front supporting entities of the chair.
* **Component Purpose**: Vertical support. Transfers the front seat load to the ground, ensuring anti-overturning stability.
* **Assembly Direction**: Inserted upwards along the +Z axis into the seat panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Top features a tenon of length `tenon_length` that interference-fits into the bottom sockets of the seat panel.

### 4~5. rear_left_post & rear_right_post
The rear supporting and backrest framing entities.
* **Component Purpose**: Vertical support and backrest frame. Transfers the rear seat load to the ground and provides mortise interfaces for the horizontal back slats.
* **Assembly Direction**: Passes vertically through the seat panel along the Z axis.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Passes through the seat panel's rear holes; inner faces feature three mortise sockets to receive the back slats.

### 6~8. back_slat_01, back_slat_02, back_slat_03
The horizontal functional support entities of the backrest.
* **Component Purpose**: Provides horizontal back support for human-computer interaction, connecting the two rear posts to form a rigid ladder-back structure.
* **Assembly Direction**: Inserted horizontally along the X axis into the rear posts.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Both left and right ends feature tenons that insert into the corresponding mortises on the inner faces of the rear posts.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 8-component model:

* **front_left_leg -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's front-left socket.
* **front_right_leg -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's front-right socket.
* **rear_left_post -> seat_panel** | Joint: interlocking | Note: Post passes through seat's rear-left through-hole.
* **rear_right_post -> seat_panel** | Joint: interlocking | Note: Post passes through seat's rear-right through-hole.
* **back_slat_01 -> rear_left_post & rear_right_post** | Joint: interlocking | Note: Top slat's left/right tenons inserted into top mortises of rear posts.
* **back_slat_02 -> rear_left_post & rear_right_post** | Joint: interlocking | Note: Middle slat's left/right tenons inserted into middle mortises of rear posts.
* **back_slat_03 -> rear_left_post & rear_right_post** | Joint: interlocking | Note: Bottom slat's left/right tenons inserted into bottom mortises of rear posts.
