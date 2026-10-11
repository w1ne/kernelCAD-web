# kernelCAD competitor watch

Track competitors by the engineering job they compete for. Distinguish vendor claims,
roadmap items, independently exercised behavior, and proposals for kernelCAD.

This is a repository watchlist; no scheduled kernelCAD refresh was configured in this change.
Review the entry below monthly, with the next check due 2026-11-11.

## Watchlist

| Company / product | Competitive overlap | Last checked | Source |
|---|---|---|---|
| **Weave 2D Inc / CADalyst** (one entry) | Production drawing automation; narrower than kernelCAD's design-to-export workflow. Primary relevance: kernelCAD. LabWired relevance: workflow ideas only. | 2026-10-11 | [Official site](https://weave2d.com/) |

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

- **2026-10-11:** Added CADalyst and its maker Weave 2D as one kernelCAD competitor entry,
  focused on manufacturing documentation. Recorded transferable LabWired ideas separately.
  Checked the public homepage and its referenced component source; no product installation
  or customer drawing was exercised.
