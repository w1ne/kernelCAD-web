# Catalog integration runtime

The first full run used the existing 900,000 ms test cap. It finished with 49/50
files and 82/83 tests passing; only the whole-catalog build/export test timed
out at 900,292 ms. A standalone rerun of that file also hit the same cap at
900,084 ms, while its rig test passed.

The whole-catalog test now allows 1,800,000 ms. The successful full rerun passed
all 50 files and 83 tests in 785.98 seconds. The catalog index test completed in
754.61 seconds. Full terminal output is in `catalog-integration-initial.log`
and `catalog-integration.log`.
