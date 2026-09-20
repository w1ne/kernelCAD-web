# chair_cross (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a four-legged dining chair with a backrest and cross stretchers designed for wood-based assembly.

## Geometry and Dimensions
Approx. 430.0 mm × 410.0 mm × 850.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Single-person seating.

## Structural Features
Seat panel; four legs; backrest panel; front stretcher; rear stretcher.

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
8

## Component Names
- Seat panel
- Front left leg
- Front right leg
- Rear left leg
- Rear right leg
- Backrest panel
- Front stretcher
- Rear stretcher

## Adjustable Parameters
- **width**: 430 (300.0 ~ 700.0 mm). Constrains the extreme values to prevent tipping caused by unbalanced length-to-width ratios.
- **depth**: 410 (300.0 ~ 650.0 mm). Determines the seating depth for ergonomic comfort.
- **seat_height**: 450 (350.0 ~ 520.0 mm). Strictly follows ergonomic standards for single-person seating posture.
- **backrest_height**: 370 (200.0 ~ 550.0 mm). Provides adequate lumbar support without raising the center of gravity too high.
- **leg_thickness**: 40 (20.0 ~ 70.0 mm). Lower limit ensures load-bearing stiffness; upper limit prevents interference and material waste.
- **seat_thickness**: 30 (15.0 ~ 50.0 mm). Must be thick enough to accommodate the insertion depth of the leg and backrest tenons.
- **stretcher_height**: 130 (60.0 ~ 280.0 mm). Determines the vertical placement of the stretchers to optimize leg stability and prevent splaying.
- **stretcher_thickness**: 22 (12.0 ~ 45.0 mm). Ensures the stretchers are robust enough to handle horizontal tension and compression forces.
- **tenon_length**: 20 (8.0 ~ 15.0 mm). Determines the bite depth of the physical connections. *(Note: Default value exceeds the defined dictionary range, but dictates the physical insertion depth).*
- **tenon_offset**: 5 (2.0 ~ 20.0 mm). Controls the setback distance of the tenon relative to the part edge to prevent wood splitting.

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
* **Assembly Direction**: Fixed base component, positioned at absolute Z = `seat_height`.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Bottom features four rectangular sockets for the legs; rear features a socket for the backrest.

### 2~5. Four Legs (Front Left, Front Right, Rear Left, Rear Right)
The supporting entities of the chair.
* **Component Purpose**: Vertical support. Transfers the seat load to the ground, ensuring anti-overturning stability in the X-Y plane.
* **Assembly Direction**: Inserted upwards along the +Z axis into the seat panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Top features a tenon of length `tenon_length` that interference-fits into the bottom sockets of the seat panel. The inner X-facing side features a mortise to receive the stretcher tenons.

### 6. Backrest Panel
The functional support entity of the chair.
* **Component Purpose**: Vertical guide. Provides back support for human-computer interaction, ensuring structural strength under large torque via a mortise-and-tenon joint.
* **Assembly Direction**: Pressed downwards along the -Z axis into the seat panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Bottom features a tenon inserted into the dedicated socket at the rear of the seat panel.

### 7~8. Stretchers (Front, Rear)
The horizontal bracing entities of the chair.
* **Component Purpose**: Horizontal support. Connects the left and right legs to prevent splaying and significantly increases the overall structural rigidity of the base.
* **Assembly Direction**: Inserted horizontally along the X axis between the left and right legs.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Both ends feature tenons that insert into the corresponding mortises on the inner faces of the legs.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 8-component model:

* **Front Left Leg -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's front-left socket.
* **Front Right Leg -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's front-right socket.
* **Rear Left Leg -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's rear-left socket.
* **Rear Right Leg -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's rear-right socket.
* **Backrest Panel -> Seat Panel** | Joint: interlocking | Note: Backrest bottom tenon inserted into seat's rear socket.
* **Front Stretcher -> Front Left Leg** | Joint: interlocking | Note: Left tenon inserted into front-left leg's inner mortise.
* **Front Stretcher -> Front Right Leg** | Joint: interlocking | Note: Right tenon inserted into front-right leg's inner mortise.
* **Rear Stretcher -> Rear Left Leg** | Joint: interlocking | Note: Left tenon inserted into rear-left leg's inner mortise.
* **Rear Stretcher -> Rear Right Leg** | Joint: interlocking | Note: Right tenon inserted into rear-right leg's inner mortise.
* **Seat Panel -> All Components** | Joint: Support Base | Note: Acts as the core hub; all connection sockets generated via boolean cut.
