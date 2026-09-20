# chair_stretcher (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a four-legged dining chair with a backrest and reinforcing stretchers designed for wood-based assembly.

## Geometry and Dimensions
Approx. 420.0 mm × 400.0 mm × 860.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Single-person seating with enhanced structural stability provided by lower stretchers.

## Structural Features
Seat panel; four legs; backrest panel; four stretchers (front, rear, left, right).

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
10

## Component Names
- Seat panel
- Front left leg
- Front right leg
- Rear left leg
- Rear right leg
- Backrest panel
- Front stretcher
- Rear stretcher
- Left stretcher
- Right stretcher

## Adjustable Parameters
- **width**: 420 (300.0 ~ 700.0 mm). Determines the overall width of the chair seat and backrest.
- **depth**: 400 (300.0 ~ 700.0 mm). Determines the seating depth.
- **seat_height**: 450 (350.0 ~ 520.0 mm). Strictly follows ergonomic standards for single-person seating posture.
- **backrest_height**: 380 (250.0 ~ 600.0 mm). Provides adequate lumbar and back support without raising the center of gravity too high.
- **leg_thickness**: 40 (20.0 ~ 80.0 mm). Lower limit ensures load-bearing stiffness; upper limit prevents interference and material waste.
- **seat_thickness**: 30 (15.0 ~ 60.0 mm). Must be thick enough to accommodate the insertion depth of the leg and backrest tenons.
- **tenon_length**: 20 (8.0 ~ 15.0 mm). Determines the bite depth of the physical connections.
- **tenon_offset**: 5 (2.0 ~ 20.0 mm). Controls the setback distance of the tenon relative to the part edge to prevent wood splitting.
- **stretcher_height**: 150 (80.0 ~ 300.0 mm). Sets the vertical position of the stretchers from the ground to prevent leg splay.
- **stretcher_thickness**: 20 (10.0 ~ 40.0 mm). Determines the robustness of the horizontal bracing.

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
* **Assembly Direction**: Fixed base component, positioned at absolute $Z = seat\_height + seat\_thickness / 2.0$.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Bottom features four rectangular sockets for the legs; rear features a long slot for the backrest.

### 2~5. Four Legs (Front Left, Front Right, Rear Left, Rear Right)
The supporting entities of the chair.
* **Component Purpose**: Vertical support. Transfers the seat load to the ground, ensuring anti-overturning stability. Contains mortises to receive the stretchers.
* **Assembly Direction**: Inserted upwards along the +Z axis into the seat panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Top features a tenon that interference-fits into the bottom sockets of the seat panel. Inner faces feature mortises for the stretchers.

### 6. Backrest Panel
The functional support entity of the chair.
* **Component Purpose**: Vertical guide. Provides back support for human-computer interaction, ensuring structural strength under large torque via a long mortise-and-tenon joint.
* **Assembly Direction**: Pressed downwards along the -Z axis into the seat panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Bottom features a full-width strip tenon inserted into the dedicated long socket at the rear of the seat panel.

### 7~10. Four Stretchers (Front, Rear, Left, Right)
The horizontal bracing entities of the chair.
* **Component Purpose**: Connects the legs horizontally to prevent splaying, significantly increasing the overall structural rigidity and shear resistance of the base.
* **Assembly Direction**: Inserted horizontally along the X axis (front/rear) or Y axis (left/right) into the legs.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Both ends feature tenons that insert into the corresponding mortises on the inner faces of the legs. Left/right stretchers are vertically offset from front/rear stretchers to prevent internal tenon collision.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 10-component model:

* **Front Left Leg -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's front-left socket.
* **Front Right Leg -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's front-right socket.
* **Rear Left Leg -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's rear-left socket.
* **Rear Right Leg -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's rear-right socket.
* **Backrest Panel -> Seat Panel** | Joint: interlocking | Note: Backrest bottom tenon inserted into seat's rear socket.
* **Front Stretcher -> Front Left & Right Legs** | Joint: interlocking | Note: Stretcher tenons inserted into inner X-faces of front legs.
* **Rear Stretcher -> Rear Left & Right Legs** | Joint: interlocking | Note: Stretcher tenons inserted into inner X-faces of rear legs.
* **Left Stretcher -> Front & Rear Left Legs** | Joint: interlocking | Note: Stretcher tenons inserted into inner Y-faces of left legs.
* **Right Stretcher -> Front & Rear Right Legs** | Joint: interlocking | Note: Stretcher tenons inserted into inner Y-faces of right legs.
* **Seat Panel -> All Components** | Joint: Support Base | Note: Acts as the core hub; all primary vertical connection sockets generated via boolean cut.
