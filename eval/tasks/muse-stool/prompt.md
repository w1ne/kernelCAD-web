# stool (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a four-legged stool designed for wood-based assembly.

## Geometry and Dimensions
Approx. 500.0 mm × 500.0 mm × 415.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Single-person seating.

## Structural Features
Seat panel; four legs.

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
5

## Component Names
- seat_panel
- front_left_leg
- front_right_leg
- rear_left_leg
- rear_right_leg

## Adjustable Parameters
- **leg_height**: 400 (250.0 ~ 520.0 mm). Determines the seating height, constrained for ergonomic single-person use.
- **seat_half_size**: 200 (120.0 ~ 320.0 mm). Controls the overall width and depth of the seating area.
- **seat_thickness**: 15 (10.0 ~ 40.0 mm). Ensures structural integrity and must be thick enough to accommodate the socket depth.
- **seat_corner_radius**: 10 (0.0 ~ 40.0 mm). Prevents sharp edges on the seat panel for user safety and comfort.
- **leg_half_size**: 20 (10.0 ~ 40.0 mm). Determines the thickness and robustness of the legs for load-bearing stability.
- **leg_corner_radius**: 3 (0.0 ~ 12.0 mm). Smooths the edges of the legs to prevent splintering and improve aesthetics.
- **tenon_half_size**: 5 (3.0 ~ 16.0 mm). Controls the width of the connecting tenon at the top of each leg.
- **socket_half_size**: 5.2 (3.0 ~ 18.0 mm). Slightly larger than the tenon to provide necessary tolerance for physical assembly.
- **tenon_height**: 7.5 (3.0 ~ 18.0 mm). Determines the insertion depth of the tenon into the seat panel.
- **socket_depth**: 7.7 (3.0 ~ 18.0 mm). Slightly deeper than the tenon to ensure flush seating of the leg shoulder against the bottom of the panel.

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
The central hub of the stool.
* **Component Purpose**: Acts as the main load-bearing base and provides localization references and mechanical interfaces (sockets) for the four legs.
* **Assembly Direction**: Fixed base component, positioned at absolute $Z = leg\_height + seat\_thickness / 2.0$.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). The bottom features four rectangular sockets generated via boolean cut.

### 2~5. Four Legs (Front Left, Front Right, Rear Left, Rear Right)
The supporting entities of the stool.
* **Component Purpose**: Vertical support. Transfers the seat load to the ground, ensuring anti-overturning stability in the X-Y plane.
* **Assembly Direction**: Inserted upwards along the +Z axis into the seat panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). The top of each leg features a protruding tenon of height `tenon_height` that fits into the bottom sockets of the seat panel.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 5-component model:

* **Front Left Leg -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's front-left socket.
* **Front Right Leg -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's front-right socket.
* **Rear Left Leg -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's rear-left socket.
* **Rear Right Leg -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's rear-right socket.
* **Seat Panel -> All Components** | Joint: Support Base | Note: Acts as the core hub; all connection sockets generated via boolean cut.
