# pen_holder_tab_front_scoop (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a slot-assembled pen holder with a front access scoop, designed for organizing desktop stationery using interlocking flat panels.

## Geometry and Dimensions
Approx. 92.0 mm × 82.0 mm × 122.0 mm.

## Material
Timber

## Manufacturing Method
Laser Cutting

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Desktop storage, holding pens and stationery items.

## Structural Features
Base panel; front panel with access scoop; back panel; left panel; right panel; top frame.

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
6

## Component Names
- base_panel
- front_panel
- back_panel
- left_panel
- right_panel
- top_frame

## Adjustable Parameters
- **outer_width**: 92.0 (76.0 ~ 116.0 mm). Defines the overall width of the pen holder.
- **outer_depth**: 82.0 (66.0 ~ 106.0 mm). Defines the overall depth of the pen holder.
- **wall_height**: 110.0 (82.0 ~ 150.0 mm). Determines the internal storage height for pens and tools.
- **wall_thickness**: 5.0 (3.8 ~ 7.0 mm). Thickness of the vertical panels, ensuring structural rigidity and compatible with standard sheet materials.
- **base_thickness**: 6.0 (4.8 ~ 8.0 mm). Thickness of the bottom panel to provide a stable, load-bearing foundation.
- **frame_thickness**: 6.0 (4.8 ~ 8.0 mm). Thickness of the top frame used to lock the vertical walls together.
- **tab_width**: 18.0 (18.0 ~ 42.0 mm). Width of the interlocking tabs (tenons) for assembly.
- **frame_border**: 11.0 (1.0 ~ 25.0 mm). Width of the top frame's border, defining the top opening size.
- **front_notch_width**: 34.0 (18.0 ~ 58.0 mm). Width of the front access scoop for easy retrieval of shorter items.
- **front_notch_height**: 26.0 (50.0 ~ 66.0 mm). Height of the front access scoop.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1. base_panel
The foundational support of the pen holder.
* **Component Purpose**: Acts as the main load-bearing base and provides localization references and mechanical interfaces (mortise slots) for the four vertical panels.
* **Assembly Direction**: Fixed base component, positioned at absolute Z = 0.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Features perimeter slots to receive the bottom tabs of the side panels.

### 2. front_panel
The front enclosure of the pen holder.
* **Component Purpose**: Provides front containment and features a central scoop (notch) to allow easy access to shorter stationery items.
* **Assembly Direction**: Inserted downwards along the -Z axis into the base panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Bottom features tabs inserted into the base panel; top features tabs inserted into the top frame.

### 3. back_panel
The rear enclosure of the pen holder.
* **Component Purpose**: Provides rear vertical support and containment.
* **Assembly Direction**: Inserted downwards along the -Z axis into the base panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Bottom features tabs inserted into the base panel; top features tabs inserted into the top frame.

### 4. left_panel
The left side enclosure of the pen holder.
* **Component Purpose**: Provides lateral containment and structural rigidity along the Y-axis.
* **Assembly Direction**: Inserted downwards along the -Z axis into the base panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Bottom features tabs inserted into the base panel; top features tabs inserted into the top frame.

### 5. right_panel
The right side enclosure of the pen holder.
* **Component Purpose**: Provides lateral containment and structural rigidity along the Y-axis.
* **Assembly Direction**: Inserted downwards along the -Z axis into the base panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Bottom features tabs inserted into the base panel; top features tabs inserted into the top frame.

### 6. top_frame
The upper structural reinforcement of the pen holder.
* **Component Purpose**: Locks the four vertical panels together at the top, preventing outward deflection and providing a finished upper edge.
* **Assembly Direction**: Pressed downwards along the -Z axis onto the assembled vertical panels.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features perimeter slots that receive the top tabs of the front, back, left, and right panels.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 6-component model:

* **front_panel -> base_panel** | Joint: interlocking | Note: Front panel bottom tabs inserted into base panel's front slots.
* **back_panel -> base_panel** | Joint: interlocking | Note: Back panel bottom tabs inserted into base panel's rear slots.
* **left_panel -> base_panel** | Joint: interlocking | Note: Left panel bottom tabs inserted into base panel's left slots.
* **right_panel -> base_panel** | Joint: interlocking | Note: Right panel bottom tabs inserted into base panel's right slots.
* **top_frame -> front_panel** | Joint: interlocking | Note: Top frame front slots pressed onto front panel's top tabs.
* **top_frame -> back_panel** | Joint: interlocking | Note: Top frame rear slots pressed onto back panel's top tabs.
* **top_frame -> left_panel** | Joint: interlocking | Note: Top frame left slots pressed onto left panel's top tabs.
* **top_frame -> right_panel** | Joint: interlocking | Note: Top frame right slots pressed onto right panel's top tabs.
