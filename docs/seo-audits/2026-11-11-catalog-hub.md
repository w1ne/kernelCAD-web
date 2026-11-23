# Catalog hub discovery — measured 2026-11-11

## Production before this change

At 11:15 UTC, before the `kernelCAD-server#650` marketing deployment completed, `https://kernelcad.com/catalog/` and a sampled asset page both returned HTTP 404; live sitemap XML contained 81 URLs and **zero** catalog URLs. At 11:23–11:25 UTC, after the successful marketing deployment workflow (`kernelCAD-server` run `43009456564`), the sitemap contained **2,484** URLs, including **2,403** catalog URLs (one hub and 2,402 distinct part pages).

A bounded production crawl requested all 2,403 catalog HTML URLs: **2,403 HTTP 200**, **zero** missing titles, descriptions or exact self-canonicals. All 2,402 detail pages exposed Product JSON-LD, valid model preview markup, an exact Studio edit link, and contextual `/code-cad/` and `/mcp/` links. An independent HEAD check on all 2,402 `preview.png` assets returned **2,402 HTTP 200**, non-empty image responses. No duplicate part-page titles were found. The only catalog page without JSON-LD was the **hub**, `/catalog/`; its body linked asset pages but not the code-first CAD or MCP workflow pages.

## Search performance baseline (authenticated domain Search Console, Web text)

Exported **2026-11-11 11:13–11:14 UTC** from `sc-domain:kernelcad.com`, latest complete reporting date 2026-11-09. Dates are those displayed in Search Console; CSV exports do not separately specify a timezone.

| Metric | Nov 3–9 | Oct 27–Nov 2 | Oct 13–Nov 9 | Sep 15–Oct 12 |
| --- | ---: | ---: | ---: | ---: |
| Clicks | 64 | 40 | 215 | 191 |
| Impressions | 279 | 241 | 1,037 | 596 |
| CTR | 22.9% | 16.6% | 20.7% | 32.0% |
| Site-wide average position | 5.1 | 6.0 | 5.8 | 4.1 |

At least **52/64** recent 7-day clicks and **172/215** recent 28-day clicks came from exposed branded variants. Google omits some individual query rows for privacy; no exact nonbranded share can be computed from those rows. No `/catalog/` page appeared in the top-pages export before launch. An absent row does **not** prove zero impressions. These aggregate positions are **not** fixed-keyword local ranks and are not evidence of a release-driven ranking change.

Country 28-day Google Search Console totals (clicks/impressions/average position): HU **2/8/2.62**; DE **9/60/4.38**; US **33/262/8.5**; GB **8/45/3.42**. Raw 7-day and 28-day compare ZIP exports and crawl details are stored on work-1 under `/data/kernelcad-seo-20261111/gsc/run-1211-20261111/` (not published, because they are account data).

## Improvement in this PR

Add truthful schema.org `CollectionPage` and `BreadcrumbList` data to the catalog hub; `ItemList.numberOfItems` reads the exact current published catalog source count, not a hard-coded marketing claim. Add two contextual, crawlable links to the existing `/code-cad/` and `/mcp/` workflows near the hub introduction, without moving or hiding the model finder.

**Source-level before/after:** catalog pages carrying structured data **2,402 / 2,403 → 2,403 / 2,403**, conditional on deployment of this code and an unchanged catalog size. It is not a measured Google indexing gain. Downloads are deliberately out of scope because the GLB+STEP work is already tracked in `kernelCAD-web#1253` and is not merged. No traffic lift, AI app directory approval or conversion count is claimed.

## Gates

Validate package typecheck, catalog generator tests, mandatory GitHub CI, and the deploy consuming the updated public `develop` code. After deploy, re-fetch the live catalog hub and verify its schema and both links. Continue GSC comparison and per-page query/country analysis when Google reports asset data.
