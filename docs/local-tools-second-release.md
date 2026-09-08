# Second 20-tool release

Twenty additional, browser-local utilities, bringing the application to **112 tools**. This batch adds no services, accounts, API keys, database provisioning, or runtime dependencies.

Each feature has its own branch and PR. The delivery gate is Biome, TypeScript, cumulative unit tests, a production build, and mobile/desktop browser verification before merge. Each matching Railway merge deployment is then checked for SUCCESS and smoke-tested on https://uutil.space before the next feature merges. There are no hosted GitHub PR checks configured; validation is run locally and recorded in the PR descriptions.

## Feature synopsis

| # | Feature | Included behavior | PR |
|---|---|---|---|
| 1 | [JSON Flatten / Unflatten](https://uutil.space/tools/json-flatten-unflatten) | Typed JSON Pointer rows, round-trip reconstruction, empty containers, array/object distinction, escaped keys, prototype-safe handling. | [22](https://github.com/nearbycoder/uutil.space/pull/22) |
| 2 | [JSON Array Query](https://uutil.space/tools/json-array-query) | Typed filters, existence checks, literal-key projection, stable sorting, limits and matched/returned counts. | [23](https://github.com/nearbycoder/uutil.space/pull/23) |
| 3 | [CSV Multi-column Sort](https://uutil.space/tools/csv-multi-sort) | Ordered sort keys, text/natural/numeric comparisons, independent directions, blank placement, case and trim controls. | [24](https://github.com/nearbycoder/uutil.space/pull/24) |
| 4 | [CSV Group & Aggregate](https://uutil.space/tools/csv-group-aggregate) | Composite groups, count/sum/average/min/max, blank-number policies, output order and formula protection. | [25](https://github.com/nearbycoder/uutil.space/pull/25) |
| 5 | [CSV Table Join](https://uutil.space/tools/csv-table-join) | Inner/left/full joins, composite keys, duplicate-key Cartesian matches, blank-key policies and source-prefixed headers. | [26](https://github.com/nearbycoder/uutil.space/pull/26) |
| 6 | [CSV Transpose](https://uutil.space/tools/csv-transpose) | Generated or source-column headings, optional heading-source inclusion, heading validation and formula-safe output. | [27](https://github.com/nearbycoder/uutil.space/pull/27) |
| 7 | [SQL IN Clause Builder](https://uutil.space/tools/sql-in-clause) | PostgreSQL/SQLite/MySQL, parameters or literals, IN/NOT IN, typed deduplication, empty-list predicates and explicit NULL handling. | [28](https://github.com/nearbycoder/uutil.space/pull/28) |
| 8 | [HTTP Request Inspector](https://uutil.space/tools/http-request-inspector) | HTTP/1.x request forms, duplicate headers, ordered queries, default credential masking, optional body output and framing warnings. | [29](https://github.com/nearbycoder/uutil.space/pull/29) |
| 9 | [HTTP Basic Auth Codec](https://uutil.space/tools/http-basic-auth) | UTF-8/Latin-1, credential JSON encoding, strict Base64 decoding, control-character validation and masked/revealed passwords. | [30](https://github.com/nearbycoder/uutil.space/pull/30) |
| 10 | [Cache-Control Inspector](https://uutil.space/tools/cache-control-inspector) | Quoted directives, extensions, duplicate/conflict/context warnings and private/shared freshness-budget estimates. | [31](https://github.com/nearbycoder/uutil.space/pull/31) |
| 11 | [Glob Pattern Tester](https://uutil.space/tools/glob-pattern-tester) | Whole-path *, ?, ** and **/ matching, escaping, case controls, matched/unmatched exports and bounded matching. | [32](https://github.com/nearbycoder/uutil.space/pull/32) |
| 12 | [Text Reflow & Wrap](https://uutil.space/tools/text-reflow-wrap) | Paragraph, line-preserving and single-paragraph modes, code-point widths, indentation and long-word handling. | [33](https://github.com/nearbycoder/uutil.space/pull/33) |
| 13 | [Text Range Extractor](https://uutil.space/tools/text-range-extractor) | Inclusive/open-ended ranges, inverse selection, merged overlaps, original line numbers and clamp/error bounds policies. | [34](https://github.com/nearbycoder/uutil.space/pull/34) |
| 14 | [Base64URL Codec](https://uutil.space/tools/base64url-codec) | UTF-8/hex bytes, optional padding, strict URL-safe alphabet and unused-bit checks, BOM-preserving decoding and byte counts. | [35](https://github.com/nearbycoder/uutil.space/pull/35) |
| 15 | [Byte Hexdump](https://uutil.space/tools/byte-hexdump) | Configurable rows, byte offsets, letter case, ASCII gutter and exclusive end offset, with column-preserving keyboard scrolling. | [36](https://github.com/nearbycoder/uutil.space/pull/36) |
| 16 | [CSS Fluid Type Calculator](https://uutil.space/tools/css-fluid-type) | rem/px clamp CSS, assumed root size, viewport samples and exact endpoint calculations. | [37](https://github.com/nearbycoder/uutil.space/pull/37) |
| 17 | [CSS Cubic Bézier Sampler](https://uutil.space/tools/css-bezier-sampler) | Standard/custom easing curves, time-based samples, duration/value interpolation and unclipped overshoot reporting. | [38](https://github.com/nearbycoder/uutil.space/pull/38) |
| 18 | [Aspect Ratio & Resize Calculator](https://uutil.space/tools/aspect-ratio-resize) | Fit/fill/stretch, no-upscale, centered crop/padding, visible source coordinates and rounded raster suggestions. | [39](https://github.com/nearbycoder/uutil.space/pull/39) |
| 19 | [Retry Backoff Planner](https://uutil.space/tools/retry-backoff-planner) | Capped constant/linear/exponential delays, full/equal jitter ranges, expected elapsed time and budget feasibility. | [40](https://github.com/nearbycoder/uutil.space/pull/40) |
| 20 | [Pagination Planner](https://uutil.space/tools/pagination-planner) | Zero/one-based pages, exact offsets, partial/empty states, clamp/error bounds, navigation gaps and API query strings. | Final feature PR |

## Shared experience and limits

All additions use the existing themed input/result workspace, floating navigation, direct library favorites, examples/reset, validation alerts, focusable output, clipboard and download actions. They participate in local presets/recipes and opt-in offline preparation. No input processing requires a network call.

- Combined input is limited to 200,000 characters; output to 2,000,000 characters.
- JSON numbers follow JavaScript number semantics; unsafe integers must be strings. Flattening is limited to 10,000 nodes and 80 levels. Array queries accept up to 5,000 records.
- CSV tools accept up to 5,000 rows and 200 columns. Join output is capped at 10,000 rows; transpose accepts at most 199 source records. Spreadsheet formula protection is on by default and can be explicitly disabled.
- SQL input is capped at 500 scalar values. Generated SQL is never executed by the app; tests execute generated SQLite predicates in memory. Database column types and parameter binding remain the caller's responsibility.
- HTTP parsing is a text inspector, not a full wire decoder or security audit. It does not decode transfer/content encodings. Header masking is intentionally limited; URLs and other fields may still contain secrets.
- Basic Auth and Base64URL are reversible encodings, not encryption. Saved presets, opt-in history, shared recipes, copied output and downloads can contain sensitive data.
- Glob syntax is a documented subset, not full shell or gitignore compatibility. Limits are 1,000 paths, 100,000 path characters and 256 pattern characters.
- Text width counts code points, not terminal columns or grapheme clusters. Range extraction supports 50,000 lines and 1,000 ranges.
- Byte tools cap data at 100,000 bytes. Hexdump downloads are textual, not binary.
- CSS estimates depend on the stated root/viewport assumptions; typography still needs real-content and zoom testing. Bézier extrema are sampled, not exact maxima/minima.
- Resizing calculates geometry only. Independent pixel rounding can slightly alter ratios. No-upscale can prevent Fill from covering the target.
- Retry totals assume every attempt takes the configured duration and no early success. Jitter outputs are modeled ranges, not sampled randomness or real-network guarantees.
- Pagination uses exact BigInt intermediates within safe-integer input limits. It plans offset pagination; it does not solve concurrent-data consistency or cursor pagination.

## Verification

The cumulative unit suite contains **204 tests in 45 files**. Per-feature browser checks cover 390px and 1440px layouts, default transformations, focused results, copied/downloaded output bytes, required-field errors and reset behavior.

Additional targeted coverage:

- SQL predicates are executed against an in-memory SQLite fixture.
- Adversarial glob patterns exercise the bounded matcher.
- Generated fluid CSS is applied in a browser and its computed font size is compared with the model.
- Bézier samples are compared with the browser's Web Animations engine.
- Hexdump output is checked for preserved columns and scrollable overflow.

The final release gate also runs all 112 tool pages at both viewport widths, all 40 local-tool workflows, workspace regressions, mobile/desktop navigation, initial-load width stability, library favorites and offline preparation/refresh/removal. Production verification for the final merge is recorded in the release handoff after its Railway deployment completes.

## Reference specifications

Implementation boundaries are documented in each tool. Relevant primary references include [JSON Pointer](https://www.rfc-editor.org/info/rfc6901/), [HTTP/1.1 messaging](https://www.rfc-editor.org/rfc/rfc9112.html), [HTTP Basic authentication](https://www.rfc-editor.org/info/rfc7617/), [HTTP caching](https://www.rfc-editor.org/info/rfc9111/), [Base64URL](https://www.rfc-editor.org/info/rfc4648/), [CSS easing](https://www.w3.org/TR/css-easing-1/), and [CSS comparison functions](https://www.w3.org/TR/css-values-4/#comp-func).

