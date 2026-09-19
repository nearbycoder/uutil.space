import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { defaults, execute } from "../src/lib/local-tools/types.ts";
const ids = [
  "json-array-zip",
  "json-tree-inspector",
  "json-string-codec",
  "json-array-set",
  "csv-pivot-table",
  "csv-keyed-diff",
  "csv-concatenate",
  "csv-seeded-sampler",
  "text-indentation",
  "text-line-numbering",
  "text-ngram-analyzer",
  "text-literal-splitter",
  "url-list-inspector",
  "linear-regression",
  "matrix-calculator",
  "moving-average",
  "radix-arithmetic",
  "unit-converter",
  "css-shadow-builder",
  "css-gradient-builder"
];
for (const id of ids) {
  const { tool } = await import(`../src/lib/local-tools/${id}.ts`);
  execFileSync(process.execPath, ["scripts/verify-local-tool.mjs", id, tool.smoke], { stdio: "inherit", env: process.env });
}
const session = `release-four-css-${process.pid}`;
const run = (...args) => execFileSync("agent-browser", ["--session", session, ...args], { encoding: "utf8", timeout: 30000 });
const value = code => JSON.parse(JSON.parse(run("eval", `JSON.stringify(${code})`)));
try {
  run("open", `${process.env.TEST_URL ?? "http://localhost:3107"}/tools/css-gradient-builder`);
  run("wait", "--fn", 'document.querySelector(".app-shell")?.dataset.ready === "true"');
  const { tool: gradient } = await import("../src/lib/local-tools/css-gradient-builder.ts");
  const { tool: shadow } = await import("../src/lib/local-tools/css-shadow-builder.ts");
  const cases = [];
  for (const kind of ["Linear", "Radial circle", "Conic"]) for (const repeat of ["No", "Yes"])
    cases.push({ css: execute(gradient, { ...defaults(gradient), kind, repeat }), property: "background-image" });
  cases.push({ css: execute(shadow, defaults(shadow)), property: "box-shadow" });
  for (const { css, property } of cases) {
    const supported = value(`(() => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(${JSON.stringify(css)});
      const declaration = sheet.cssRules[0].style.getPropertyValue(${JSON.stringify(property)});
      return declaration.length > 0 && CSS.supports(${JSON.stringify(property)}, declaration);
    })()`);
    assert(supported, `Browser must accept generated CSS: ${css}`);
  }
  assert.equal(run("errors").trim(), "");
  console.log("PASS all 20 release-four tools on mobile/desktop and 7 browser CSS syntax checks");
} finally { run("close"); }

