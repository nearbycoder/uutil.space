# Fourth local-tool release

20 new utilities bring the library to 152 tools. Every tool runs in the browser without new dependencies, API keys, accounts or services.

## Features

1. **[JSON Array Zipper](https://uutil.space/tools/json-array-zip)** — Combine arrays by position with named records, strict lengths or null padding.
2. **[JSON Tree Inspector](https://uutil.space/tools/json-tree-inspector)** — Inspect JSON Pointer paths, node types, depths and container sizes.
3. **[JSON String Literal Codec](https://uutil.space/tools/json-string-codec)** — Encode or unwrap multiple JSON string layers with optional ASCII escapes.
4. **[JSON Array Set Operations](https://uutil.space/tools/json-array-set)** — Union, intersect and subtract arrays using structural JSON equality.
5. **[CSV Pivot Table](https://uutil.space/tools/csv-pivot-table)** — Cross-tabulate categories with counts, sums, averages and min/max values.
6. **[CSV Snapshot Diff](https://uutil.space/tools/csv-keyed-diff)** — Compare keyed snapshots and inspect added rows, schema changes and cell edits.
7. **[CSV File Combiner](https://uutil.space/tools/csv-concatenate)** — Append CSV files by header name with schema reconciliation and deduplication.
8. **[Reproducible CSV Sampler](https://uutil.space/tools/csv-seeded-sampler)** — Create seeded samples and complementary data splits without replacement.
9. **[Text Indentation Converter](https://uutil.space/tools/text-indentation)** — Normalize tab stops, remove common indentation or add an indentation level.
10. **[Text Line Numbering](https://uutil.space/tools/text-line-numbering)** — Add or remove line numbers with custom increments, separators and padding.
11. **[Repeated Phrase Analyzer](https://uutil.space/tools/text-ngram-analyzer)** — Find repeated word phrases with Unicode tokenization and occurrence counts.
12. **[Literal Text Split / Join](https://uutil.space/tools/text-literal-splitter)** — Split literal delimiters into JSON arrays or join strings with cleanup options.
13. **[URL List Inspector](https://uutil.space/tools/url-list-inspector)** — Audit URL lists, relative paths, host counts, invalid lines and duplicates.
14. **[Linear Regression Calculator](https://uutil.space/tools/linear-regression)** — Fit a line and inspect residuals, R², correlation and sample predictions.
15. **[Matrix Calculator](https://uutil.space/tools/matrix-calculator)** — Multiply, add, subtract and transpose rectangular numeric matrices.
16. **[Moving Average Calculator](https://uutil.space/tools/moving-average)** — Smooth numeric series with trailing, centered or exponential averages.
17. **[Exact Radix Arithmetic](https://uutil.space/tools/radix-arithmetic)** — Calculate with large integers and inspect binary, octal, decimal and hex results.
18. **[Batch Unit Converter](https://uutil.space/tools/unit-converter)** — Convert 25 units across length, mass, time, speed and temperature.
19. **[CSS Shadow Builder](https://uutil.space/tools/css-shadow-builder)** — Generate validated multi-layer box shadows with inset and opacity controls.
20. **[CSS Gradient Builder](https://uutil.space/tools/css-gradient-builder)** — Build linear, radial and conic gradients with color stops and repetition.

## Shared experience

The additions use the established local-tool interface rather than introducing a parallel UI: responsive input/result panels, keyboard-accessible labeled controls, examples, validation, result focus, copy/download, library search and favorites. Existing workspace presets, recipes and prepared-offline routes remain available. The frontend-design skill guided reuse of the app’s compact controls and spacing.

## Limits and semantics

- Combined form input: 200,000 characters; output: 2 MB. Expansion-heavy operations have earlier limits, including 1 MB pointer paths/numbered text, 200-character record keys, and bounded item counts.
- JSON arrays: 5,000 items (split/join: 10,000). Tree inspection: 10,000 nodes / 80 levels. Structural equality ignores object key order but preserves types and array order.
- CSV: 200 columns / 5,000 rows per input, strict unique headers and matching row widths. Export protects spreadsheet formulas by default. Pivot dimensions are bounded; keyed diff rejects ambiguous duplicate keys.
- Sampling is deterministic, without replacement, and deliberately not cryptographic.
- Numeric tools use finite bounded floating-point inputs except radix arithmetic, which uses exact BigInt values. Regression rejects degenerate or unrepresentable fits. Temperature conversion is for absolute readings, not differences.
- URL inspection does not fetch addresses and rejects credential-bearing URLs without reproducing credentials in its report.
- CSS generators validate selectors, color formats, dimensions and stop order; generated CSS is inert text until copied into a project.

## Verification

Automated coverage is in `src/lib/local-tools-release-four.test.ts`. Shared browser verification exercises each new tool at 390px and 1440px, including result focus, copying, downloaded file contents, invalid input and reset. Full-library layout, initial-load stability, navigation, favorites, workspace and offline regressions are run against the production build.

Release-specific browser checks: `TEST_URL=http://localhost:3107 node --import tsx scripts/verify-fourth-release.mjs`.

Pre-merge results (2026-09-19):

- 442 tests across 66 files passed, including 151 new release checks.
- Biome checks, TypeScript, and the production build passed.
- 152 routes passed layout checks at 390px and 1440px.
- All 80 local-tool workflows passed mobile/desktop execution, focus, copy, download-byte comparison, invalid-input and reset checks.
- All 20 new tools passed an additional final-build sweep; seven generated CSS variants passed native browser parsing.
- All 80 local-tool panels aligned at 390px, 1024px and 1440px; sticky output remained accessible.
- Navigation, inline favorites, workspace, offline, and dark/light style regressions passed.
- Initial server/client layout matched across saved/default preferences and 320/390/1024/1440px viewports, with measured CLS of 0.

## Reference checks

CSS generation follows the browser gradient and shadow models documented by [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Images/Using_gradients). International length factors were cross-checked with [NIST](https://www.nist.gov/pml/owm/si-units-length), and avoirdupois mass factors with [NIST mass calibrations](https://www.nist.gov/system/files/documents/calibrations/sp250-31.pdf).
