# Hole-driven insert — LinkedIn (KernelCAD company page)

**Images:** attach `docs/demos/hole-driven-insert/insert.hero.png`, `insert-detail.png` and `insert-front.pose-0-0.png`.
**Video alternative:** `docs/demos/hole-driven-insert/demo.mp4` (23 s).
**Playbook note:** the playbook rates a personal profile higher for reach; the same text works there. The repo link goes in the first comment either way.

---

## Post

```
The plate is already drilled. That is the input.

lib.insert reads the bores on a part, sizes the thread from the hole diameter (Ø3.4 becomes M3, Ø5.5 becomes M5), covers every similar hole including patterns, and cuts the seat the fastener family needs. Flat heads get a 90° countersink to the head diameter. Cap heads get nothing unless you ask for a counterbore.

Then it hands back the fasteners, placed: screw, washer under the head, washer and hex nut on the back, oriented along the detected axis.

Two honest edges. A bore that sits exactly on a larger thread's tap drill comes back flagged as a possible pilot, not silently sized. A counterbore already at the mouth is left alone instead of being cut twice. The fasteners are envelope solids: no thread modeled, no strength claim.

The same script runs in Studio, in the browser, and from Claude or ChatGPT through MCP.

Repo link in the first comment.
#CAD #OpenSource #Manufacturing #kernelCAD
```

*(954 chars · first comment: `github.com/w1ne/kernelCAD-web`)*
