# Everyday productivity release

Adds 20 browser-local tools to the **Productivity** category, bringing the library to 172 utilities. Inputs use labeled fields and plain lists rather than JSON. Each tool has an example, help and validation, copy/download controls, favorites, saved workspace settings, and offline route preparation.

| Tool | Result |
| --- | --- |
| Shopping List Consolidator | Combined quantities and grocery checkboxes |
| Packing List Planner | Categorized quantities scaled by travelers and days |
| Task Priority Matrix | Urgent/important task groups |
| Daily Task Planner | Tasks that fit a time budget, breaks and deferred tasks |
| Weekly Time Budget | Activity shares and unallocated or overbooked hours |
| Schedule Conflict Checker | All overlapping appointment pairs |
| Meeting Agenda Builder | Timed topics and meeting-budget overruns |
| Chore Rotation Planner | Round-robin household assignments by week |
| Habit Streak Analyzer | Completion rate, longest streak and current streak |
| Event Countdown Planner | Sorted dates with calendar days remaining or elapsed |
| Reading Plan Calculator | Daily page allocation and estimated reading hours |
| Shared Expense Settler | Equal shares and cent-exact reimbursement transfers |
| Savings Goal Planner | Required contributions and deadline shortfalls |
| Subscription Cost Audit | Annual totals and monthly equivalents |
| Unit Price Comparison | Products ranked by price per common unit |
| Stacked Discount Calculator | Sequential discounts, receipt tax and final price |
| Recipe Serving Scaler | Proportional ingredient quantities |
| Travel Budget Planner | Shared and per-person costs with contingency |
| Meal Plan Grocery Builder | Consolidated shopping list from meal ingredients |
| Checklist Cleaner | Deduplicated tasks with completion preserved |

## Input rules

List tools accept up to 500 nonblank rows. Structured rows use a literal `|` separator; field help describes their exact columns. Names must not contain `|`. Dates use valid `YYYY-MM-DD` calendar dates; times use 24-hour `HH:MM`. Currency amounts accept up to two decimal places and use integer cents. Keep all monetary inputs in one currency. Quantities use decimal numbers, and matching units are combined without conversion. Existing combined-input and result-size limits apply.

Budget tools calculate from amounts and rates the user supplies, without fetched prices, tax rules, exchange rates, interest or investment assumptions. Overnight appointments must be split by day. Chore rotations balance assignment count, not effort. Habit dates outside the selected tracking range are rejected. Recipe scaling retains fractional quantities and does not scale cooking times.

## Shared styling

Uses the project's existing Instrument Sans / IBM Plex Mono typography, graphite and white palettes, and warm accent. Tool summaries clarify purpose. Shared panel dividers, numbered local-tool sections, aligned heading rows, consistent field gaps, quiet empty results and subtle panel shadows improve hierarchy across the app. Buttons change colors immediately to avoid intermediate low contrast when switching themes. Local-tool forms support Enter submission from single-line inputs.

The Mobbin MCP was not callable in this session. This pass builds on the references already documented in [Mobbin workspace polish](mobbin-workspace-polish.md) and [Mobbin style cleanup](mobbin-style-pass.md); no new Mobbin inspection is claimed.

## Validation

- `npm test`: 477 passing tests, including 22 productivity tests covering all examples, arithmetic, dates, duplicates, invalid inputs and limits.
- `npm run check`, `npm run lint`, `npx tsc --noEmit`, production build.
- Browser regression scripts cover all 100 modular tools at 390/1440px, plus layout across all 172 tool routes.
- Style checks cover both themes at 320/390/1024/1440px, action contrast, controls, copying and result states.
- Panel alignment, initial hydration, mobile navigation, favorites, saved workspace flows and offline preparation.
- `scripts/verify-productivity.mjs` checks category discovery, custom shopping quantities, keyboard submission, typed settings, recipe sharing and screenshots.

The full unit suite exposed an existing JSON Schema local-reference failure. Supplying an absolute synthetic base restores fragment resolution without making network requests; the existing reference regression now passes.
