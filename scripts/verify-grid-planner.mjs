import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { tool } from "../src/lib/local-tools/css-grid-planner.ts";
import { defaults, execute } from "../src/lib/local-tools/types.ts";

const run = (...args) => execFileSync("agent-browser", ["--session", "grid-geometry", ...args], { encoding: "utf8", timeout: 30000 });
const value = code => JSON.parse(JSON.parse(run("eval", `JSON.stringify(${code})`)));
try {
  run("open", `${process.env.TEST_URL ?? "http://localhost:3107"}/tools/css-grid-planner`);
  run("wait", "--fn", 'document.querySelector(".app-shell")?.dataset.ready === "true" && !!document.querySelector(".local-tool")');
  let count = 0;
  for (const mode of ["Fixed columns", "Auto-fit", "Auto-fill"]) {
    for (const width of [200, 390, 1200]) {
      for (const items of [0, 2, 8]) {
        const report = JSON.parse(execute(tool, { ...defaults(tool), input: String(width), items: String(items), mode }));
        const errors = value(`(() => {
          const report = ${JSON.stringify(report)};
          const grid = document.createElement("div");
          grid.style.cssText = report.css + "position:fixed;visibility:hidden;left:0;top:0;";
          grid.style.width = report.containerWidth + "px";
          for (let i = 0; i < report.items; i++) {
            const cell = document.createElement("div");
            cell.style.cssText = report.childCss;
            grid.append(cell);
          }
          document.body.append(grid);
          const rect = grid.getBoundingClientRect();
          const errors = [Math.abs(rect.height - report.totalHeight)];
          report.positionsPreview.forEach((expected, i) => {
            const actual = grid.children[i].getBoundingClientRect();
            errors.push(Math.abs(actual.left - rect.left - expected.x), Math.abs(actual.top - rect.top - expected.y), Math.abs(actual.width - expected.width), Math.abs(actual.height - expected.height));
          });
          grid.remove();
          return errors;
        })()`);
        assert(Math.max(...errors) < 0.1, `${mode} ${width}px ${items} items differs from browser: ${errors}`);
        count++;
      }
    }
  }
  assert.equal(run("errors").trim(), "");
  console.log(`PASS CSS grid geometry matches browser in ${count} fixed/auto-fit/auto-fill cases`);
} finally { run("close"); }
