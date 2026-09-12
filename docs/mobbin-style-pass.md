# Mobbin-informed style cleanup

This pass keeps the compact workspace, equal-width panels, persisted theme,
and floating search/navigation on desktop and mobile.

## References inspected through Mobbin MCP

- [Codecademy workspace](https://mobbin.com/screens/28ef9c69-941e-4352-9b28-dc0df4482ee5): clear separation between editor and result, restrained chrome.
- [Relevance AI tool settings](https://mobbin.com/screens/9d0785a9-65d7-4ef5-b09f-595720919811): consistent labels and an unmistakable primary action.
- [Vapi command search](https://mobbin.com/screens/593d7acd-2e16-4365-bcd6-02ce52f48f3b): a separated search area and compact, scannable results.

These inform the shared visual hierarchy rather than reproducing another app.

## Changes

- Fix the CSS layer conflict that made local tools' primary Run buttons appear secondary.
- Align panel headers and add quiet section dividers across shared tool cards.
- Standardize local tool field labels, select chevrons, and 44px input/action targets.
- Keep 16px mobile input text to avoid browser zoom; use 14px desktop controls.
- Clarify empty versus populated results and add copy/download/status icons.
- Give errors a visible, themed container and separate supporting help from actions.
- Group library collection filters as a segmented control and highlight the entire active row.
- Preserve reduced-motion behavior, theme colors, full-width layout, and keyboard navigation.

## Regression commands

```sh
npm run check
npx tsc --noEmit
npm test
npm run build
TEST_URL=http://localhost:3107 node scripts/verify-style-system.mjs
TEST_URL=http://localhost:3107 node scripts/verify-layout.mjs
TEST_URL=http://localhost:3107 node scripts/verify-panel-alignment.mjs
TEST_URL=http://localhost:3107 node scripts/verify-initial-layout.mjs
TEST_URL=http://localhost:3107 node scripts/verify-mobile-navigation.mjs
TEST_URL=http://localhost:3107 node scripts/verify-library-favorites.mjs
TEST_URL=http://localhost:3107 node scripts/verify-workspace.mjs
```

The style regression checks both themes at 320, 390, 1024, and 1440px,
including primary-action contrast, touch targets, native select styling,
empty/result states, copying, and library search. It can also target production.
