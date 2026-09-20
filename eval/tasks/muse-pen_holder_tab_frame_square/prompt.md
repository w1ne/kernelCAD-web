# pen_holder_tab_frame_square (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a slot-assembled square pen holder with a top locking frame designed for desktop organization and stationery storage.

## Geometry and Dimensions
Approx. 86.0 mm × 86.0 mm × 122.0 mm.

## Material
Timber

## Manufacturing Method
Laser Cutting

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Desktop storage, holding pens, pencils, and other lightweight stationery items.

## Structural Features
Base panel; four side wall panels (front, back, left, right); top locking frame.

## Special Requirements
Keep assembly split unchanged. Ensure tight tolerances for interference fit during assembly.

## Planned Component Quantity
6

## Component Names
- Base panel
- Front panel
- Back panel
- Left panel
- Right panel
- Top frame

## Adjustable Parameters
- **outer_width**: 86.0 (70.0 ~ 110.0 mm). Controls the overall external width of the pen holder.
- **outer_depth**: 86.0 (70.0 ~ 110.0 mm). Controls the overall external depth of the pen holder.
- **wall_height**: 110.0 (82.0 ~ 150.0 mm). Determines the internal vertical storage space for pens.
- **wall_thickness**: 5.0 (3.8 ~ 7.0 mm). Defines the structural thickness of the four side panels.
- **base_thickness**: 6.0 (4.8 ~ 8.0 mm). Defines the thickness of the bottom load-bearing panel.
- **frame_thickness**: 6.0 (4.8 ~ 8.0 mm). Defines the thickness of the top locking frame.
- **tab_width**: 18.0 (18.0 ~ 42.0 mm). Determines the width of the interlocking tabs (tenons) used for assembly.
- **frame_border**: 11.0 (1.0 ~ 25.0 mm). Controls the width of the top frame's border, defining the size of the top opening.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1. Base panel
The bottom support of the pen holder.
* **Component Purpose**: Acts as the main load-bearing base, providing mortise slots (sockets) for the side panels to insert into.
* **Assembly Direction**: Fixed base component, positioned at absolute Z = 0.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Features rectangular slots along its perimeter to receive the bottom tabs of the side panels.

### 2. Front panel
The front enclosure wall.
* **Component Purpose**: Encloses the front side of the storage volume and provides vertical structure.
* **Assembly Direction**: Inserted downwards along the -Z axis into the base panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features protruding tabs at the bottom for base insertion and at the top for the locking frame.

### 3. Back panel
The rear enclosure wall.
* **Component Purpose**: Encloses the rear side of the storage volume and provides vertical structure.
* **Assembly Direction**: Inserted downwards along the -Z axis into the base panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features protruding tabs at the bottom for base insertion and at the top for the locking frame.

### 4. Left panel
The left enclosure wall.
* **Component Purpose**: Encloses the left side of the storage volume and provides vertical structure.
* **Assembly Direction**: Inserted downwards along the -Z axis into the base panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features protruding tabs at the bottom for base insertion and at the top for the locking frame.

### 5. Right panel
The right enclosure wall.
* **Component Purpose**: Encloses the right side of the storage volume and provides vertical structure.
* **Assembly Direction**: Inserted downwards along the -Z axis into the base panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features protruding tabs at the bottom for base insertion and at the top for the locking frame.

### 6. Top frame
The upper locking collar.
* **Component Purpose**: Locks the four side panels together at the top, ensuring structural integrity and preventing the walls from splaying outward under load.
* **Assembly Direction**: Pressed downwards along the -Z axis onto the assembled side panels.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features mortise slots along its inner border that receive the top tabs of all four side panels.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 6-component model:

* **Front panel -> Base panel** | Joint: interlocking | Note: Front panel bottom tabs inserted into base panel's front slots.
* **Back panel -> Base panel** | Joint: interlocking | Note: Back panel bottom tabs inserted into base panel's rear slots.
* **Left panel -> Base panel** | Joint: interlocking | Note: Left panel bottom tabs inserted into base panel's left slots.
* **Right panel -> Base panel** | Joint: interlocking | Note: Right panel bottom tabs inserted into base panel's right slots.
* **Top frame -> Front panel** | Joint: interlocking | Note: Top frame's front slots receive front panel's top tabs.
* **Top frame -> Back panel** | Joint: interlocking | Note: Top frame's rear slots receive back panel's top tabs.
* **Top frame -> Left panel** | Joint: interlocking | Note: Top frame's left slots receive left panel's top tabs.
* **Top frame -> Right panel** | Joint: interlocking | Note: Top frame's right slots receive right panel's top tabs.
