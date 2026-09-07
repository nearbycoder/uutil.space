# 20 local-only tools

Each feature was developed on its own branch and delivered in a separate pull request. No package dependencies, accounts, API keys, databases, or hosted services were added.

| PR | Feature | Included behavior |
| --- | --- | --- |
| [1](https://github.com/nearbycoder/uutil.space/pull/1) | JSON Structural Diff | Typed additions, removals and changes; escaped paths; array-index comparisons; object-order independence. |
| [2](https://github.com/nearbycoder/uutil.space/pull/2) | JSON Merge Patch | Recursive merges, null deletion, full array/scalar replacement, prototype-safe object keys. |
| [3](https://github.com/nearbycoder/uutil.space/pull/3) | JSON Pointer Editor | Read, set, append and remove; escaped names; strict missing-path/index errors. |
| [4](https://github.com/nearbycoder/uutil.space/pull/4) | JSON Key Sorter | Recursive ascending/descending order, numeric-looking key support, compact/2/4-space formatting. |
| [5](https://github.com/nearbycoder/uutil.space/pull/5) | JSON Schema Inference | Draft-7 schemas, heterogeneous arrays, optional/required properties, configurable extra properties. |
| [6](https://github.com/nearbycoder/uutil.space/pull/6) | CSV Data Profiler | Blank and unique counts, duplicate rows, column types, numeric min/max/mean. |
| [7](https://github.com/nearbycoder/uutil.space/pull/7) | CSV Column Editor | Keep/remove/reorder columns, rename maps, collision detection, formula-safe CSV exports. |
| [8](https://github.com/nearbycoder/uutil.space/pull/8) | CSV Deduplicator | Selected-key matching, exact/normalized comparisons, first/last/duplicate/unique retention. |
| [9](https://github.com/nearbycoder/uutil.space/pull/9) | CSV to Markdown Table | Alignment, row limits with truncation notes, escaped markup, multiline cells. |
| [10](https://github.com/nearbycoder/uutil.space/pull/10) | Text Set Operations | Union, intersection, subtraction, symmetric difference; spelling-preserving normalized matching. |
| [11](https://github.com/nearbycoder/uutil.space/pull/11) | Word Frequency Analyzer | Language-aware segmentation, exclusions, length filters, ranked counts and percentages. |
| [12](https://github.com/nearbycoder/uutil.space/pull/12) | Unicode Normalizer | NFC/NFD/NFKC/NFKD, code-point previews, UTF-16 and UTF-8 size comparisons. |
| [13](https://github.com/nearbycoder/uutil.space/pull/13) | Invisible Character Cleaner | Explicit hidden-character/space/bidi policies, preserved emoji joiners, newline conversion, change report. |
| [14](https://github.com/nearbycoder/uutil.space/pull/14) | Batch Timestamp Converter | Explicit seconds/milliseconds/ISO formats, source line numbers, independent error rows, calendar validation. |
| [15](https://github.com/nearbycoder/uutil.space/pull/15) | Timezone Meeting Planner | Multiple IANA zones, DST-aware start/end times, date shifts, whole-meeting work-hour/weekend checks. |
| [16](https://github.com/nearbycoder/uutil.space/pull/16) | UTM Link Builder | Encoded parameters, replacement/preservation policies, optional tags, safe URL validation. |
| [17](https://github.com/nearbycoder/uutil.space/pull/17) | Safe Template Renderer | Dotted paths and array indexes, missing-variable policies, HTML/JSON escaping, no code execution. |
| [18](https://github.com/nearbycoder/uutil.space/pull/18) | JSON to SQL INSERT | PostgreSQL/SQLite/MySQL quoting, batched statements, missing-value NULLs, optional nested JSON strings. |
| [19](https://github.com/nearbycoder/uutil.space/pull/19) | CSS Spacing Scale | Linear/modular scales, px/rem conversion, safe token prefixes, CSS/JSON output. |
| [20](https://github.com/nearbycoder/uutil.space/pull/20) | Set-Cookie Inspector | Masked values, per-header parsing, duplicate attributes, expiry hints, security-prefix/attribute notes. |

## Shared experience and limits

Every tool has a built-in example, explicit help, input validation, reset, selectable results, clipboard copy, file download, and workspace field registration for presets/recipes. Successful runs bring the result into view and focus it for keyboard users. Mobile uses the existing floating dock and drawer; desktop results stay alongside long input forms.

All processing runs locally. Offline mode precaches the new routes. Combined input is limited to 200,000 characters and output to 2 MB. JSON uses JavaScript numeric semantics, rejects unsafe integers and excessive nesting, and does not retain duplicate object keys. CSV supports up to 5,000 records and 200 columns, requires unique headers, and rejects inconsistent row widths. Individual tools document additional limits and cases they do not model.

The SQL tool does not execute statements. SQLite generation has an in-memory round-trip regression; PostgreSQL and MySQL generation has dialect-specific escaping tests, not live-database integration tests. Cookie inspection does not determine whether a browser will accept a cookie in a specific request context. Schema inference derives a starting point, not business validation rules.

## Verification

Before each merge: formatting/lint, TypeScript, the cumulative unit suite, a production build, and desktop/mobile default/invalid-input/reset/layout workflows. The final suite additionally verifies clipboard success and downloaded file contents for every new tool, all 92 tool layouts at two widths, existing workspace/mobile navigation flows, and offline operation for all 20 additions. See the README for reproducible commands.

## Standards and implementation references

- [JSON Merge Patch — RFC 7396](https://www.rfc-editor.org/rfc/rfc7396)
- [JSON Pointer — RFC 6901](https://www.rfc-editor.org/rfc/rfc6901)
- [JSON Schema object properties](https://json-schema.org/understanding-json-schema/reference/object)
- [Papa Parse configuration and CSV export](https://www.papaparse.com/docs)
- [Unicode normalization](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize)
- [Set-Cookie attributes and prefixes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)
- [PostgreSQL string and identifier syntax](https://www.postgresql.org/docs/current/sql-syntax-lexical.html)
- [MySQL hexadecimal literals](https://dev.mysql.com/doc/refman/8.4/en/hexadecimal-literals.html)
