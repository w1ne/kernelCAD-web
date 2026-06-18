# business_card_holder (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
A desktop stand designed to hold and display business cards at an ergonomic viewing angle.

## Geometry and Dimensions
Approx. 104.0 mm × 20.0 mm × 25.0 mm.

## Material
PLA

## Manufacturing Method
3D Printing

## Connection Method (Joint Type)
Not applicable
## Mechanical Condition
Desktop display, static load-bearing for lightweight paper cards.

## Structural Features
Main rectangular base block; tilted card insertion slot.

## Special Requirements
Ensure the tilted slot is free of internal supports during manufacturing to maintain a clean insertion space for the cards.

## Planned Component Quantity
1

## Component Names
- card_holder_body

## Adjustable Parameters
- **card_height**: 25 (10.0 ~ 80.0 mm). Defines the vertical depth of the card slot to ensure cards are adequately supported without being completely hidden.
- **card_length**: 47 (30.0 ~ 100.0 mm). Represents half of the card slot's total length, accommodating various standard business card widths.
- **card_width**: 4 (1.0 ~ 10.0 mm). Represents half of the card slot's opening thickness, determining how many cards can be stacked in the holder.
- **stand_offset_back_width**: 6 (2.0 ~ 20.0 mm). Wall thickness behind the card slot to provide rear structural support and prevent backward tipping.
- **stand_offset_front_width**: 10 (2.0 ~ 25.0 mm). Wall thickness in front of the card slot to balance the center of gravity and prevent forward tipping.
- **stand_offset_height**: 0 (0.0 ~ 20.0 mm). Additional solid base height added below the card slot.
- **stand_offset_length**: 5 (1.0 ~ 20.0 mm). Additional margin length added to the left and right sides of the base beyond the card slot.
- **tilt_angle**: 15 (5.0 ~ 30.0 degrees). The backward tilt angle of the slot, optimizing the viewing ergonomics for a seated user.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main rectangular base profile of the part.
2. Generate a tilted box geometry representing the card stack volume.
3. Execute a boolean cut to subtract the tilted box from the base, forming the slot.

---

### 1. card_holder_body
The main and only body of the business card holder.
* **Component Purpose**: Provides a stable, weighted base and a precisely angled slot to securely hold and display business cards on a flat surface.
* **Assembly Direction**: Standalone component, placed flat on a desktop (XY plane).
* **Connection & Kinematics**: Not applicable (Single solid body).

---

## Component Assembly Graph (Textual)
* **card_holder_body -> Desktop** | Joint: Support Base | Note: Single-piece design, no internal assembly required.
