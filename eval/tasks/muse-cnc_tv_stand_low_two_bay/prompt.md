# cnc_tv_stand_low_two_bay (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Low two-bay TV stand with one center divider and a single shelf level, designed for flat-pack assembly and media storage.

## Geometry and Dimensions
Approx. 1380.0 mm × 400.0 mm × 460.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Load-bearing storage (supporting a television on top and media devices on internal shelves).

## Structural Features
Top panel; bottom panel; left side panel; right side panel; center divider; two shelf panels.

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
7

## Component Names
- Top panel
- Bottom panel
- Left side panel
- Right side panel
- Center divider 01
- Shelf l01 b01
- Shelf l01 b02

## Adjustable Parameters
- **width**: 1380.0 (1280.0 ~ 1520.0 mm). Determines the overall span of the TV stand.
- **depth**: 400.0 (300.0 ~ 540.0 mm). Determines the overall depth to accommodate various TV base sizes and media equipment.
- **height**: 460.0 (400.0 ~ 540.0 mm). Sets the viewing height of the television.
- **thickness**: 18.0 (12.0 ~ 26.0 mm). Controls the thickness of the vertical support panels (sides and divider) for structural stability.
- **top_thickness**: 18.0 (12.0 ~ 26.0 mm). Controls the thickness of the top load-bearing panel.
- **bottom_thickness**: 18.0 (12.0 ~ 26.0 mm). Controls the thickness of the bottom base panel.
- **tab_width**: 18.0 (100.0 ~ 158.0 mm). Defines the width of the interlocking tenons for the assembly joints.
- **corner_radius**: 10.0 (0.0 ~ 30.0 mm). Defines the fillet radius on the corners of the top panel for aesthetics and safety.
- **shelf_depth**: 360.0 (260.0 ~ 500.0 mm). Determines the depth of the internal storage shelves.
- **shelf_thickness**: 18.0 (12.0 ~ 26.0 mm). Controls the load-bearing thickness of the internal shelves.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1. Top panel
The upper horizontal surface of the TV stand.
* **Component Purpose**: Acts as the primary load-bearing surface for the television and provides mortise slots to lock the vertical supports in place.
* **Assembly Direction**: Placed downwards along the -Z axis onto the vertical panels.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Features slots on its underside to receive the top tabs of the side panels and center divider.

### 2. Bottom panel
The lower horizontal base of the TV stand.
* **Component Purpose**: Acts as the foundational base, connecting the vertical panels at the bottom to ensure structural rigidity and ground contact.
* **Assembly Direction**: Positioned at the base, receiving vertical panels along the +Z axis.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Features slots to receive the bottom tabs of the side panels and center divider.

### 3. Left side panel
The left vertical support structure.
* **Component Purpose**: Transfers the load from the top panel to the bottom panel and encloses the left side of the stand.
* **Assembly Direction**: Inserted vertically between the top and bottom panels.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Features protruding tabs on the top and bottom edges, and mortise slots on the inner face for the shelf.

### 4. Right side panel
The right vertical support structure.
* **Component Purpose**: Transfers the load from the top panel to the bottom panel and encloses the right side of the stand.
* **Assembly Direction**: Inserted vertically between the top and bottom panels.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Features protruding tabs on the top and bottom edges, and mortise slots on the inner face for the shelf.

### 5. Center divider 01
The central vertical support structure.
* **Component Purpose**: Divides the internal space into two bays and provides central vertical support to prevent the top panel from sagging under the TV's weight.
* **Assembly Direction**: Inserted vertically between the top and bottom panels.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Features tabs on the top and bottom, and mortise slots on both sides to support the inner edges of the shelves.

### 6. Shelf l01 b01
The horizontal storage surface in the left bay.
* **Component Purpose**: Provides a platform for media devices in the left compartment.
* **Assembly Direction**: Inserted horizontally between the left side panel and the center divider.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Features tabs on its left and right edges that slot into the left side panel and center divider.

### 7. Shelf l01 b02
The horizontal storage surface in the right bay.
* **Component Purpose**: Provides a platform for media devices in the right compartment.
* **Assembly Direction**: Inserted horizontally between the center divider and the right side panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Features tabs on its left and right edges that slot into the center divider and right side panel.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 7-component model:

* **Left side panel -> Bottom panel** | Joint: interlocking | Note: Bottom tabs of left panel inserted into bottom panel slots.
* **Right side panel -> Bottom panel** | Joint: interlocking | Note: Bottom tabs of right panel inserted into bottom panel slots.
* **Center divider 01 -> Bottom panel** | Joint: interlocking | Note: Bottom tabs of divider inserted into bottom panel slots.
* **Top panel -> Left side panel** | Joint: interlocking | Note: Top tabs of left panel inserted into top panel slots.
* **Top panel -> Right side panel** | Joint: interlocking | Note: Top tabs of right panel inserted into top panel slots.
* **Top panel -> Center divider 01** | Joint: interlocking | Note: Top tabs of divider inserted into top panel slots.
* **Shelf l01 b01 -> Left side panel** | Joint: interlocking | Note: Left tabs of shelf inserted into left side panel slots.
* **Shelf l01 b01 -> Center divider 01** | Joint: interlocking | Note: Right tabs of shelf inserted into center divider slots.
* **Shelf l01 b02 -> Center divider 01** | Joint: interlocking | Note: Left tabs of shelf inserted into center divider slots.
* **Shelf l01 b02 -> Right side panel** | Joint: interlocking | Note: Right tabs of shelf inserted into right side panel slots.
