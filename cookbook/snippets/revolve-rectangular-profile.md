---
id: revolve-rectangular-profile
title: Cylindrical wall or ring via path + revolve
tags: [revolve, sketch, primitive]
keywords:
  - thin cylindrical wall
  - ring or tube
  - revolve a rectangle offset from the axis
when_to_use: You want a thin cylindrical wall, ring, or tube — author the rectangular profile via path() with the inner radius as the x offset, then call .revolve() to sweep it around Z.
---

```typescript
return path()
  .moveTo(15, 0)
  .lineTo(17, 0)
  .lineTo(17, 20)
  .lineTo(15, 20)
  .close()
  .revolve();
```
