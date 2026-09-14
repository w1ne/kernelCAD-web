---
id: typed-params-boolean-choice-string
title: Boolean, choice, and string script params (beyond numeric param())
tags: [parameter, hole, typed-params, choice-param, boolean-feature-toggle]
keywords:
  - boolean param toggles a feature
  - choice param drives a hole diameter lookup
  - string param drives sketch text
  - param() with choices meta
  - editable text label param
  - fastener size dropdown
  - HasLid toggle
  - typed script parameters
when_to_use: >-
  A `.kcad.ts` script needs an editable value that isn't a plain number:
  a feature on/off switch (`param('HasLid', true)`), a closed set of
  named options like a fastener size (`param('Screw', 'M4', { choices:
  [...] })`), or free text such as a nameplate/label
  (`param('Label', 'KCAD', { maxLength })`). All three resolve eagerly —
  read `.value` in script logic (`if`, object-key lookup, `sketch.text`)
  instead of the numeric ParamRef's symbolic `.add()`/`.multiply()` chain.
---

```typescript
const hasFoot = param('HasFoot', true, { description: 'add a mounting foot' });

const screw = param('Screw', 'M4', { choices: ['M3', 'M4', 'M5'] });
const screwHoleDiameterMm: Record<string, number> = { M3: 3.4, M4: 4.5, M5: 5.5 };

const label = param('Label', 'KCAD', { maxLength: 24 });

let body = box(50, 30, 10).hole('top', {
  u: -15,
  v: 0,
  diameter: screwHoleDiameterMm[screw.value],
  depth: 'through',
});

if (hasFoot.value) {
  body = body.union(box(10, 10, 4).translate(0, 0, -7));
}

const text = sketch
  .text(label.value, { size: 4, align: 'center', position: [0, 0] })
  .extrude(0.5)
  .rotate([1, 0, 0], 90)
  .translate(15, -15.5, 5);

return body.union(text);
```
