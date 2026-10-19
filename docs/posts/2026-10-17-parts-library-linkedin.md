# Standard parts library — LinkedIn (KernelCAD company page)

**Images:** attach `docs/demos/standard-parts/lineup.hero.png`,
`stack.hero.png` and `stack-detail.png` (multi-image, playbook format).
**Video alternative:** `docs/demos/standard-parts/demo.mp4` (23 s).
**Playbook note:** the playbook rates Andrii's personal profile higher for reach;
the same text works there. The repo link goes in the first comment either way.

---

## Post

```
Two steel bars in a lap joint. One M5 bolt. The grip is 12 mm.

kernelCAD now ships a fastener table. Socket head, button head and countersunk screws, hex and lock nuts, flat and lock washers, M2 through M12.

lib.part builds one part by family, thread and length. lib.stack takes the grip and places a washer under the head plus a washer and hex nut on the back. The screw length comes from the stocked table: the shortest that fits is an M5 × 18.

The solids are envelopes, head plus shank. No helical thread. In the browser they are built in memory; on a host with the parts catalog on disk, the STEP loads instead. Both paths come from the same table, so the geometry agrees.

The images are local renders of examples/parts/bolt-stack.kcad.ts and fastener-lineup.kcad.ts in the repo.

Repo link in the first comment.
#CAD #OpenSource #MechanicalEngineering #kernelCAD
```

*(870 chars · first comment: `github.com/w1ne/kernelCAD-web`)*
