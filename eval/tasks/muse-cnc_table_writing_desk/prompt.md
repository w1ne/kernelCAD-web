# cnc_table_writing_desk (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a writing desk with panel legs and front-back apron rails below the top, designed for flat-pack CNC-machined assembly.

## Geometry and Dimensions
Approx. 1280.0 mm × 620.0 mm × 742.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Single-person working and writing surface; load-bearing desk structure requiring lateral stability.

## Structural Features
Top panel; left leg panel; right leg panel; front apron; rear apron.

## Special Requirements
Keep assembly split unchanged. Ensure all inner corners of mortises account for CNC tool radius offsets (dog-bone fillets) if machined practically, though the base geometry assumes perfect boolean cuts.

## Planned Component Quantity
5

## Component Names
- Top panel
- Left leg panel
- Right leg panel
- Front apron
- Rear apron

## Adjustable Parameters
- **width**: 1280.0 (1180.0 ~ 1420.0 mm). Determines the overall span of the primary workspace.
- **depth**: 620.0 (520.0 ~ 760.0 mm). Determines the front-to-back working area.
- **height**: 742.0 (682.0 ~ 822.0 mm). Strictly follows ergonomic standards for a seated writing desk.
- **top_thickness**: 22.0 (16.0 ~ 30.0 mm). Ensures structural rigidity of the work surface and provides sufficient depth for blind or through mortises.
- **support_thickness**: 18.0 (12.0 ~ 26.0 mm). Thickness of the vertical leg panels and aprons, balancing load-bearing capacity and weight.
- **support_depth**: 520.0 (420.0 ~ 660.0 mm). Depth of the leg panels at the base, ensuring anti-overturning stability.
- **support_span**: 920.0 (820.0 ~ 1060.0 mm). The clear distance between the left and right leg panels, dictating legroom.
- **corner_radius**: 12.0 (0.0 ~ 32.0 mm). Rounds the corners of the top panel for user safety and aesthetics.
- **tab_width**: 18.0 (100.0 ~ 158.0 mm). Width of the tenon tabs used for interlocking the panels.
- **apron_z**: 612.0 (552.0 ~ 692.0 mm). Vertical placement of the apron rails, ensuring adequate knee clearance while maintaining structural bracing.
- **apron_depth**: 40.0 (100.0 ~ 180.0 mm). The horizontal offset/positioning of the aprons relative to the desk edges.
- **apron_height**: 60.0 (40.0 ~ 140.0 mm). The vertical height of the apron panels to resist racking forces.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1. Top Panel
The central horizontal hub of the desk.
* **Component Purpose**: Acts as the main load-bearing work surface and provides localization references and mechanical interfaces (mortise slots) for the leg panels and aprons.
* **Assembly Direction**: Fixed base component, positioned at absolute $Z = height$.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). The underside features rectangular slots to receive the top tenons of the legs and aprons.

### 2. Left Leg Panel
The primary vertical support on the left side.
* **Component Purpose**: Vertical support. Transfers the desk load to the ground and features cutouts (windows) for weight reduction and aesthetics.
* **Assembly Direction**: Inserted upwards along the +Z axis into the top panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features top tenons that interface with the top panel, and vertical slots to receive the side tenons of the aprons.

### 3. Right Leg Panel
The primary vertical support on the right side.
* **Component Purpose**: Vertical support. Transfers the desk load to the ground, mirroring the left leg panel.
* **Assembly Direction**: Inserted upwards along the +Z axis into the top panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features top tenons that interface with the top panel, and vertical slots to receive the side tenons of the aprons.

### 4. Front Apron
The structural cross-beam at the front of the desk.
* **Component Purpose**: Lateral bracing. Prevents side-to-side racking of the desk and stabilizes the two leg panels.
* **Assembly Direction**: Inserted horizontally along the Y axis between the leg panels, and upwards into the top panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features tenons on the left/right ends to lock into the leg panels, and top tenons to lock into the top panel.

### 5. Rear Apron
The structural cross-beam at the rear of the desk.
* **Component Purpose**: Lateral bracing. Works in tandem with the front apron to ensure complete rigidity of the desk frame.
* **Assembly Direction**: Inserted horizontally along the Y axis between the leg panels, and upwards into the top panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features tenons on the left/right ends to lock into the leg panels, and top tenons to lock into the top panel.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 5-component model:

* **Left Leg Panel -> Top Panel** | Joint: interlocking | Note: Leg top tenons inserted into top panel's left-side slots.
* **Right Leg Panel -> Top Panel** | Joint: interlocking | Note: Leg top tenons inserted into top panel's right-side slots.
* **Front Apron -> Left Leg Panel** | Joint: interlocking | Note: Apron left tenon inserted into left leg's front slot.
* **Front Apron -> Right Leg Panel** | Joint: interlocking | Note: Apron right tenon inserted into right leg's front slot.
* **Rear Apron -> Left Leg Panel** | Joint: interlocking | Note: Apron left tenon inserted into left leg's rear slot.
* **Rear Apron -> Right Leg Panel** | Joint: interlocking | Note: Apron right tenon inserted into right leg's rear slot.
* **Front & Rear Aprons -> Top Panel** | Joint: interlocking | Note: Apron top tenons inserted into top panel's longitudinal slots.
