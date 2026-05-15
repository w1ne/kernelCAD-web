# Sheet-metal U-channel

Build a U-channel from a 2 mm steel sheet.

- Flat blank: 120 mm x 80 mm rectangle.
- Two parallel 90 degree bends, folding up:
  - First at x = 20 mm along the long axis.
  - Second at x = 100 mm along the long axis.
- Inner bend radius: 2.5 mm for both bends.
- K-factor 0.40.

Return the bent Shape.

## Hints

- Chain two `.bend()` calls. Each returns a new Shape; chain on the previous result.
- Both bend axes use `{ atX: <value> }` slice-1 shorthand.
