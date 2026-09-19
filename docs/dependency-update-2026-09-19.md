# Dependency update — September 19, 2026

Updated 48 dependency declarations, including the existing Nitro nightly alias,
and refreshed compatible transitive dependencies in both npm and Bun lockfiles.
Packages already at their latest release remain unchanged.

Highlights:

- React and React DOM 19.3.0, with matching types.
- Vite 8.3.0, Vitest 5.0.1, jsdom 30.1.0, and dotenv 18.0.1.
- Current TanStack Router/Start/Query/Form and tRPC releases.
- Current Tailwind, Radix, Lucide, Shiki, and Pierre Diffs releases.
- Updated YAML, CSV, Markdown, cron, UUID, Zod, and other utility dependencies.
- Nitro pinned to `3.0.1-20260917-173458-e2e14e72` instead of the floating
  `latest` alias, preventing the two lockfiles from retaining different nightlies.
- Biome schema updated to match 2.5.14.
- Explicit Node engine range matching the updated toolchain requirements.
- Explicit `.ts` extension in the Vite offline-plugin import, addressing the new
  native-config compatibility warning.

Migration references reviewed:

- [Vitest 5 migration](https://vitest.dev/guide/migration/)
- [jsdom 30 release](https://github.com/jsdom/jsdom/releases/tag/v30.0.0)
- [dotenv changelog](https://github.com/motdotla/dotenv/blob/master/CHANGELOG.md)

The app does not use the removed dotenv preload/vault APIs or the changed Vitest
mock/project configuration patterns. No application behavior changes are needed.

Verification includes a clean `npm ci`, Bun frozen-lockfile install, lint,
TypeScript, all 291 unit tests, production build, and browser regressions for
routes, local-tool workflows, initial layout, offline operation, workspace,
navigation, favorites, and styles. `verify-dependency-upgrade.mjs` adds targeted
browser coverage of YAML/JSON/CSV conversions, Markdown preview, cron parsing,
and live diff rendering at mobile and desktop widths.

`npm outdated --json` reports no outdated dependencies and `npm audit` reports
zero known vulnerabilities at update time. npm still marks the already-latest
CryptoJS package deprecated; replacing its APIs is a separate migration.
