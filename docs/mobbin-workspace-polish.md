# Mobbin-informed workspace polish

## References

Inspected through the connected Mobbin MCP on 2026-09-19:

- [Vercel search and grouped navigation](https://mobbin.com/screens/018ade73-2149-4941-8b2e-1086c81857f3): focused search, icon/title hierarchy, restrained navigation chrome.
- [Bonsai settings form](https://mobbin.com/screens/2d4fef8f-eaca-4fe7-8528-54509e33e57a): consistent labels, quiet panels, clear primary actions.
- [GitHub mobile search sheet](https://mobbin.com/screens/9bf4776e-4fd1-4e80-b721-3376a35a6386): bottom-sheet browsing and reachable floating search controls.

These inform the existing utility workspace, rather than replacing its full-width layout or adding marketing chrome.

## Changes

- Neutral graphite and white palettes with the existing warm accent; matching browser/PWA colors.
- Shared control sizing, border radii, focus treatments, label spacing, output actions, and quieter panel headers.
- Container-responsive two-column option fields where space permits; full-width editors and single-column mobile forms.
- Native, keyboard-operable disclosure for usage notes and limits.
- Single-row mobile workspace toolbar with labeled icon buttons and 44px targets.
- Search library with framed icons, category subtitles, count badge, inline favorites, and desktop keyboard hints.
- Sticky workspace dialog header and horizontally scrollable section navigation.
- Existing floating dock, drawer gestures, full-width panels, saved preferences, and tool implementations retained.

## Verification

- 455 unit tests across 67 files, including 13 theme-token and contrast tests.
- Biome, TypeScript, production build, and diff whitespace checks.
- All 152 tool pages checked at mobile and desktop widths for overflow/clipped actions.
- All 80 modular tools exercised at mobile and desktop widths: transform, focus, copy, download, invalid input, reset.
- Equal panel widths, aligned headings, and sticky outputs checked across 80 modular tools at 390/1024/1440px.
- Light/dark style checks at 320/390/1024/1440px.
- Inline favorites, search, keyboard navigation, drawer gestures, and workspace flows.
- Initial hydration checks at 320/390/1024/1440px with default and saved preferences: CLS 0 in every measured case.
- Dedicated `scripts/verify-mobbin-polish.mjs` regression coverage for responsive fields, notes disclosure, mobile toolbar, workspace tabs, category metadata, and theme chrome.

The sticky-output fixture now uses a content-heavy form at a shorter viewport: compact forms no longer overflow a tall desktop viewport. Library rows remain normally rendered after an attempted `content-visibility` optimization interfered with filtered mobile search accessibility.

No dependencies or external services added.
