# chair (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a four-legged dining chair with a backrest designed for wood-based assembly.

## Geometry and Dimensions
Approx. 400.0 mm × 400.0 mm × 880.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Single-person seating.

## Structural Features
Seat panel; four legs; backrest.

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
6

## Component Names
- seat_panel
- front_left_leg
- rear_left_leg
- front_right_leg
- rear_right_leg
- backrest_panel

## Adjustable Parameters
- **width**: 400.0 (300.0 ~ 700.0 mm). Constrains the extreme values to prevent tipping caused by unbalanced length-to-width ratios.
- **depth**: 400.0 (300.0 ~ 700.0 mm). Determines the seating depth for ergonomic comfort and overall footprint.
- **seat_height**: 450.0 (350.0 ~ 520.0 mm). Strictly follows ergonomic standards for single-person seating posture.
- **backrest_height**: 400.0 (250.0 ~ 600.0 mm). Provides adequate lumbar support without raising the center of gravity too high.
- **leg_thickness**: 40.0 (20.0 ~ 80.0 mm). Lower limit ensures load-bearing stiffness; upper limit prevents interference and material waste.
- **seat_thickness**: 30.0 (15.0 ~ 60.0 mm). Must be thick enough to accommodate the insertion depth of the leg and backrest tenons.
- **tenon_length**: 13.5 (8.0 ~ 15.0 mm). Determines the bite depth of the physical connections.
- **tenon_offset**: 5.0 (2.0 ~ 20.0 mm). Controls the setback distance of the tenon relative to the part edge to prevent wood splitting.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1. Seat Panel
The central hub of the chair.
* **Component Purpose**: Acts as the main load-bearing base and provides localization references and mechanical interfaces (sockets) for the legs and backrest.
* **Assembly Direction**: Fixed base component, positioned at absolute $Z = seat\_height$.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Bottom features four rectangular sockets for the legs; top/rear features a long slot for the backrest.

### 2~5. Four Legs (Front Left, Rear Left, Front Right, Rear Right)
The supporting entities of the chair.
* **Component Purpose**: Vertical support. Transfers the seat load to the ground, ensuring anti-overturning stability in the X-Y plane.
* **Assembly Direction**: Inserted upwards along the +Z axis into the seat panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Top features a tenon of length `tenon_length` that interference-fits into the bottom sockets of the seat panel.

### 6. Backrest Panel
The functional support entity of the chair.
* **Component Purpose**: Vertical guide. Provides back support for human-computer interaction, ensuring structural strength under large torque via a long mortise-and-tenon joint.
* **Assembly Direction**: Pressed downwards along the -Z axis into the seat panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Bottom features a full-width strip tenon inserted into the dedicated long slot at the rear of the seat panel.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 6-component model:

* **front_left_leg -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's front-left socket.
* **front_right_leg -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's front-right socket.
* **rear_left_leg -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's rear-left socket.
* **rear_right_leg -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's rear-right socket.
* **backrest_panel -> seat_panel** | Joint: interlocking | Note: Backrest bottom strip tenon inserted into seat's rear slot.
* **seat_panel -> All Components** | Joint: Support Base | Note: Acts as the core hub; all connection sockets generated via boolean cut.
