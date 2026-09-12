# Third 20-tool release

Twenty additional browser-local utilities bring the application to **132 tools**. No new dependencies, services, accounts, API keys or databases are required.

Each feature has its own PR. Local lint, TypeScript, cumulative unit tests, a production build and mobile/desktop workflow checks gate each merge. The matching Railway commit is checked for SUCCESS and smoke-tested on https://uutil.space before the next feature merges. GitHub hosted PR checks are not configured; validation evidence is recorded in the PR descriptions.

## Feature synopsis

| # | Feature | Included behavior | PR |
|---|---|---|---|
| 1 | [JSON Array Chunker](https://uutil.space/tools/json-array-chunker) | Non-overlapping batches or sliding windows, configurable steps, keep/drop/null-pad remainders, and early serialized-output limits. | [42](https://github.com/nearbycoder/uutil.space/pull/42) |
| 2 | [JSON Record Indexer](https://uutil.space/tools/json-record-indexer) | Typed or plain-string keys, grouped/first/last/error duplicate handling, missing-key policies, and prototype-safe lookups. | [43](https://github.com/nearbycoder/uutil.space/pull/43) |
| 3 | [CSV Unpivot](https://uutil.space/tools/csv-unpivot) | Wide-to-long measurement rows, retained identifier columns, blank-cell policies, custom headings, and formula-safe CSV. | [44](https://github.com/nearbycoder/uutil.space/pull/44) |
| 4 | [CSV Row Filter](https://uutil.space/tools/csv-row-filter) | All/any text and numeric rules, inverse selection, case/whitespace controls, and unchanged original cells. | [45](https://github.com/nearbycoder/uutil.space/pull/45) |
| 5 | [CSV Cell Transformer](https://uutil.space/tools/csv-cell-transform) | Ordered column-specific trim, case, NFC normalization, literal replacement, and blank filling with bounded expansion. | [46](https://github.com/nearbycoder/uutil.space/pull/46) |
| 6 | [Markdown Table Formatter](https://uutil.space/tools/markdown-table-formatter) | Aligned pipe-table source, escaped pipes, preserved/overridden alignment, ragged-row handling, and renderer-equivalence tests. | [47](https://github.com/nearbycoder/uutil.space/pull/47) |
| 7 | [Text Line Affixes](https://uutil.space/tools/text-line-affixes) | Exact prefix/suffix addition or removal, numbered placeholders, zero padding, blank-line policies, and preserved line endings. | [48](https://github.com/nearbycoder/uutil.space/pull/48) |
| 8 | [Text Column Aligner](https://uutil.space/tools/text-column-aligner) | Typed JSON matrix input, per-column alignment, ASCII/plain styles, headers, padding, and escaped control characters. | [49](https://github.com/nearbycoder/uutil.space/pull/49) |
| 9 | [Text Similarity Calculator](https://uutil.space/tools/text-similarity) | Levenshtein distance over code points, graphemes or words, normalization controls, shared boundaries, and bounded computation. | [50](https://github.com/nearbycoder/uutil.space/pull/50) |
| 10 | [Unicode Text Truncator](https://uutil.space/tools/text-truncate) | Start/middle/end truncation, marker-inclusive limits, grapheme/code-point/UTF-8 budgets, and whole-cluster byte handling. | [51](https://github.com/nearbycoder/uutil.space/pull/51) |
| 11 | [Number Statistics](https://uutil.space/tools/number-statistics) | Compensated sums, mean/median/modes, population/sample variance, quantiles, custom percentiles and outlier fences. | [52](https://github.com/nearbycoder/uutil.space/pull/52) |
| 12 | [Exact Number Sequence Generator](https://uutil.space/tools/number-sequence-generator) | Exact decimal arithmetic/geometric sequences, signed/zero steps and ratios, string/line/CSV-style exports, and growth limits. | [53](https://github.com/nearbycoder/uutil.space/pull/53) |
| 13 | [Fixed-width Bitwise Calculator](https://uutil.space/tools/integer-bitwise-calculator) | 8–128-bit AND/OR/XOR/NOT, shifts/rotations, reject/wrap operands, signed/unsigned views, padded hex/binary and set-bit counts. | [54](https://github.com/nearbycoder/uutil.space/pull/54) |
| 14 | [Exact Fraction Calculator](https://uutil.space/tools/fraction-calculator) | Exact fraction/decimal arithmetic and comparison, reduction, mixed numbers, controlled decimal rounding and exactness reporting. | [55](https://github.com/nearbycoder/uutil.space/pull/55) |
| 15 | [Duration Arithmetic](https://uutil.space/tools/duration-calculator) | Signed unit/clock/seconds/millisecond parsing, sum/subtraction/average/min/max, exact totals and explicit average rounding. | [56](https://github.com/nearbycoder/uutil.space/pull/56) |
| 16 | [Business Day Calculator](https://uutil.space/tools/business-day-calculator) | Custom weekends and closures, endpoint policies, reversed counts, signed working-day offsets, optional working-date lists. | [57](https://github.com/nearbycoder/uutil.space/pull/57) |
| 17 | [Data Transfer Planner](https://uutil.space/tools/data-transfer-planner) | Decimal/binary size units, bit/byte rates, overhead, shared/per-transfer bandwidth, concurrency, partial batches and setup delay. | [58](https://github.com/nearbycoder/uutil.space/pull/58) |
| 18 | [Percentage Calculator](https://uutil.space/tools/percentage-calculator) | Shares, percent change/difference, forward/reverse adjustments, clear formulas, negative-baseline conventions and zero guards. | [59](https://github.com/nearbycoder/uutil.space/pull/59) |
| 19 | [Weighted Scorecard](https://uutil.space/tools/weighted-score-calculator) | Direction-aware normalization, weighted contributions, missing/clamping policies, stable competition ranks and input validation. | [60](https://github.com/nearbycoder/uutil.space/pull/60) |
| 20 | [CSS Grid Planner](https://uutil.space/tools/css-grid-planner) | Fixed/auto-fit/auto-fill CSS, padding/gaps, track/row dimensions, item coordinates, empty/narrow cases and browser geometry checks. | Pending final release PR |

## Consistent application experience

All additions reuse the themed, aligned input/result panels and floating search/navigation bar. They include examples, reset, validation alerts, focusable output, copy and downloads, library favorites, local presets/recipes and opt-in offline preparation. Inputs are processed in the browser; none of these operations fetches a service or sends the input to an API.

Saved presets, exported files and shared recipes can contain sensitive data. Browser-local storage is not encrypted or account-synchronized.

## Limits and interpretation

- Shared limits remain 200,000 input characters and 2,000,000 output characters. Expanding transformations also have earlier operation-specific guards.
- Chunking accepts 10,000 input items, groups of up to 1,000 and 100,000 emitted items. Serialized-size estimates prevent large repeated objects from ballooning before final serialization.
- Record indexing accepts 5,000 objects. Typed keys distinguish numeric, string and boolean values. Plain mode only accepts string keys.
- CSV tools accept 5,000 source rows and 200 columns. Unpivot caps output at 10,000 rows and 1 MB of cell text. Cell transforms also cap cell text at 1 MB, individual cells at 100,000 characters, and steps at 20. Numeric filters reject unsafe integers; exact text equality remains available for large identifiers. Spreadsheet formula protection is enabled by default.
- Markdown formatting accepts one standalone table, not a full document. Markdown and fixed-width table alignment counts code points, not terminal display width. Fixed-column output is horizontally scrollable and keyboard-focusable.
- Line affixes preserve mixed line endings and a final newline. Their 50,000-line and early output-size limits prevent repetitive expansion.
- Similarity is syntactic edit distance, not semantic understanding. Text is bounded at 20,000 characters and 2,000 comparison units per side. UTF-8 truncation may leave unused capacity to preserve a whole grapheme.
- Statistics and percentages use floating-point estimates. Sequence generation, bitwise operations, fraction arithmetic and duration totals use BigInt-backed exact calculations; their JSON precision-sensitive values are strings.
- Sequence generation supports 1,000 values with 2,000 digits/decimal places per result. Fraction previews allow 100 decimal places and report whether rounding was needed.
- Business dates have no built-in holiday calendar. Users supply closures. Years are 0001–9999; count spans are limited to 36,600 days and offsets to ±10,000 working days.
- Transfer planning assumes equal-sized files, fixed rates, no retries/compression and non-overlapping batches. The reported aggregate payload rate is a peak; a partial per-transfer batch uses less.
- Scorecards support 50 criteria and 200 candidates, with unique names up to 100 characters. Excluding missing criteria changes the weight denominator per candidate and may reduce comparability.
- Grid planning assumes row auto-placement with no spans, margins, borders or intrinsic-content constraints. It previews the first 50 of up to 500 item positions. Generated width remains responsive; entered width controls the estimate.

## Verification

The final cumulative suite contains **291 tests in 65 files**. Each feature's browser checks cover 390px and 1440px layouts, example processing, result focus, clipboard feedback, exact download bytes, required-field errors and reset behavior.

The workflow harness uses a unique browser session per subprocess and explicitly asserts the requested viewport after navigation. This prevents fresh-session viewport resets or daemon teardown races from producing misleading mobile results. The complete sweep was rerun with these assertions enabled.

Targeted tests include rendered Markdown equivalence, Unicode/grapheme and UTF-8 boundaries, exact decimal/large-integer arithmetic, malformed data, zero divisors, date boundaries, missing scores, and pre-serialization growth limits. Grid CSS has been compared with actual browser geometry in **27 cases** across fixed, auto-fit and auto-fill modes, 200/390/1200px containers, and empty/sparse/multi-row layouts.

The release-wide browser gate covers:

- All 132 tool pages at 390px and 1440px for overflow, clipped controls and browser errors.
- All 60 local-tool workflows, including previous releases.
- All 60 input/result panel pairs at 390px, 1024px and 1440px, plus sticky output behavior.
- Workspace actions, mobile/desktop navigation, library favorites and offline preparation/refresh/removal.
- Initial-load width stability at 320px, 390px, 1024px and 1440px, with default and saved layouts.

Final production deployment and smoke-test evidence is recorded on the final PR after the matching Railway release succeeds.

## Primary references

Markdown formatting follows the documented pipe-table and alignment conventions in [GitHub's table guide](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/organizing-information-with-tables). Responsive grid behavior follows the auto-fit/auto-fill rules described in [MDN's repeat() reference](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/repeat), with browser-rendered geometry used as an independent verification.
