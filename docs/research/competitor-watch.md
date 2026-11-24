# kernelCAD competitor watch

Track competitors by the engineering job they compete for. Distinguish vendor claims,
roadmap items, independently exercised behavior, and proposals for kernelCAD.

This is a repository watchlist; no scheduled kernelCAD refresh was configured in this change.
Review the entries below monthly, with the next check due 2026-12-23.

## Watchlist

| Company / product | Competitive overlap | Last checked | Source |
|---|---|---|---|
| **Weave 2D Inc / CADalyst** (one entry) | Production drawing automation; narrower than kernelCAD's design-to-export workflow. Primary relevance: kernelCAD. LabWired relevance: workflow ideas only. | 2026-10-11 | [Official site](https://weave2d.com/) |
| **Blueprint Labs / Blueprint.io** | Browser CAD plus AI-assisted generation; overlaps kernelCAD's model-generation entry path, not its verified/manufacturable CAD+electronics loop. Primary relevance: kernelCAD. LabWired relevance: none demonstrated. | 2026-11-23 | [Official site](https://www.blueprint.io/) |

## Blueprint.io by Blueprint Labs

### Public evidence

Blueprint Labs is a San Francisco company backed by a16z Speedrun. On 2026-11-23
its site reported 376,710 projects, 296,733 accounts and 17,495 published
community projects. These are vendor-published counters; we did not audit them
or exercise the product.

The product is a browser CAD surface with AI-assisted model generation, a
ForgeCAD integration announced in August 2026, and vendor-published tiers:
Basic $0, Pro $20/month and Ultra $100/month (captured 2026-11-23). The site
describes an LLM plan-and-generate flow; we did not verify it, its geometric
validity, any manufacturable constraint, or an electronics/firmware workflow.

### Assessment

Blueprint.io competes at the entry to model generation: a prompt or sketch
becomes a 3D model in a browser with a community gallery. kernelCAD's
differentiator is the verified, manufacturable CAD+electronics loop: scripted
geometry that compiles, deterministic review, and artifacts a shop can inspect.
That advantage is verified for kernelCAD; the LLM plan claim for Blueprint.io is
unverified. Do not repeat the vendor's counters as independent adoption evidence.

No LabWired overlap is demonstrated: a CAD model is not firmware simulation.
### Refresh checklist

| Signal | Record / action |
|---|---|
| Counters or pricing change | Record the date, exact figures and data-handling terms; counters are not audited adoption. |
| LLM generation becomes inspectable | Try one prompt; check geometric validity, dimensions and manufacturable export. |
| ForgeCAD integration ships | Name the version, export formats, and whether geometry round-trips. |
| Electronics or firmware scope appears | Reassess LabWired relevance only on an explicit circuit, firmware or simulation workflow. |

Update the check date and append material findings below. An unreachable source is
an incomplete check, not evidence of no change.

## CADalyst by Weave 2D

### Public evidence

The [official site](https://weave2d.com/) describes CADalyst as a native mechanical-CAD
add-in that annotates existing drawing views, considers manufacturing intent, and leaves
editable CAD dimensions. It advertises Windows/single-user pilots and a demo-led entry path.
SolidWorks, Creo, NX, AutoCAD Mechanical, and Onshape are demand-led roadmap targets;
the page does not identify the CAD host currently used by pilot customers. No public price
was found on the homepage. These are vendor claims; we did not install the product.

The public [homepage component source](https://weave2d.com/ui_kits/marketing_site/marketing.jsx)
uses a 3.4-second timer for the hero badge. Its demo-video component contains a placeholder.
Neither establishes measured drafting speed or a recorded product run.

### Assessment

CADalyst competes for the work after a mechanical model exists: producing documentation
that a shop can use. kernelCAD covers a broader source-to-model-to-review-to-export loop,
as described in the [repository README](../../README.md). The narrower drawing task could
become a buyer's immediate reason to choose a tool, so it deserves monitoring even without
overlap in model generation.

Its existing-CAD entry point may also make it a complementary downstream tool. Treat
competition versus integration as an open question until the output format and actual
supported host are known. Mechanical drafting does not establish competition with
LabWired's firmware simulation.

### Ideas to adapt

These are proposals, not claims about features shipped in either product.

1. **A concrete drawing deliverable.** Explore an editable drawing pack derived from the
   model: selected views, dimensions, hole/thread notes, and BOM references where relevant.
   Tie annotations to source features so a revision cannot silently leave stale dimensions.
2. **Manufacturing context as input.** Ask for process, mating interfaces, datum choices,
   and inspection needs before proposing annotations. Keep tolerances and GD&T subject
   to explicit engineering review; avoid inferring acceptance criteria from appearance.
3. **Fit into an existing workflow.** Evaluate a focused handoff through current exports
   before committing to several proprietary CAD integrations. Preserve editable source
   and make the human approval step clear.
4. **Demonstrate one completed job.** Show the actual model, resulting drawing, human
   edits, and elapsed time from a reproducible run. Include unsupported cases and review
   requirements in the example.

For **LabWired**, the analogous idea is generating an editable test harness and evidence
report from an existing firmware project, with model coverage and unverified hardware
behavior explicit. Keep that as product research, outside its direct competitor table.

### Refresh checklist

Fetch the [homepage](https://weave2d.com/) and follow its current Field Notes and product/demo
links. If a plain HTML fetch omits the copy, read the referenced marketing component source.

| Signal | Record / action |
|---|---|
| CAD integration becomes available | Name the host, version, installation path, and evidence. A roadmap logo alone does not establish support. |
| Outputs become inspectable | Check a real drawing for editable annotations, revision association, dimensions, notes, and output formats. |
| Manufacturing scope grows | Watch for tolerancing, GD&T, BOMs, assemblies, DFM, process-specific rules, or quoting. Separate proposals from demonstrated behavior. |
| Product access changes | Record pricing, trial/self-serve access, licensing, and deployment/data-handling terms when published. |
| Agent integration appears | Watch for CLI, API, MCP, or batch processing; assess whether it enables a kernelCAD handoff. |
| Independent evidence appears | Link actual recordings, sample drawings, and customer accounts. Do not substitute animated homepage counters for benchmarks. |
| Electronics or firmware scope appears | Reassess LabWired relevance only when there is an explicit circuit, firmware, or simulation workflow. |

Update this entry's check date and append material findings below. An unreachable source is
an incomplete check, not evidence of no change. Do not publish a competitive performance
claim without comparable, reproducible evidence.

## Change log

- **2026-11-23:** Added Blueprint Labs / Blueprint.io as a kernelCAD competitor entry
  focused on browser model generation. Recorded vendor-published counters (376,710
  projects, 296,733 accounts, 17,495 published community projects), the August 2026
  ForgeCAD integration, and Basic $0 / Pro $20/mo / Ultra $100/mo tiers. The LLM
  plan/verification claim is unverified; kernelCAD's verified manufacturable CAD+electronics
  advantage is stated as our position, not as a measured head-to-head result.
- **2026-10-11:** Added CADalyst and its maker Weave 2D as one kernelCAD competitor entry,
  focused on manufacturing documentation. Recorded transferable LabWired ideas separately.
  Checked the public homepage and its referenced component source; no product installation
  or customer drawing was exercised.
