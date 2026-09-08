import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const base = process.env.TEST_URL ?? "http://localhost:3107";
const run = (...args) => execFileSync("agent-browser", ["--session", "panel-alignment", ...args], { encoding: "utf8", timeout: 30000 });
const value = code => JSON.parse(JSON.parse(run("eval", `JSON.stringify(${code})`)));
const ids = readdirSync("src/lib/local-tools")
  .filter(name => name.endsWith(".ts") && !name.endsWith(".test.ts") && !["types.ts", "csv.ts", "dates.ts"].includes(name))
  .map(name => name.slice(0, -3));

try {
  for (const width of [390, 1024, 1440]) {
    run("set", "viewport", String(width), "900");
    for (const id of ids) {
      run("open", `${base}/tools/${id}`);
      run("wait", "--fn", 'document.querySelector(".app-shell")?.dataset.ready === "true" && !!document.querySelector(".local-tool")');
      const panels = value(`Array.from(document.querySelectorAll(".local-tool > section"), panel => {
        const rect = panel.getBoundingClientRect();
        const heading = panel.querySelector("h3").getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, headingCenter: heading.top + heading.height / 2, position: getComputedStyle(panel).position };
      })`);
      assert.equal(panels.length, 2);
      assert(Math.abs(panels[0].width - panels[1].width) <= 1, `${id}: unequal panel widths at ${width}px`);
      if (width >= 1024) {
        assert(Math.abs(panels[0].top - panels[1].top) <= 1, `${id}: misaligned panel tops at ${width}px`);
        assert(Math.abs(panels[0].headingCenter - panels[1].headingCenter) <= 1, `${id}: misaligned panel headings at ${width}px`);
        assert.equal(panels[1].position, "sticky");
      } else {
        assert(Math.abs(panels[0].left - panels[1].left) <= 1 && Math.abs(panels[0].right - panels[1].right) <= 1, `${id}: misaligned stacked edges`);
        assert(panels[1].top - panels[0].bottom >= 19, `${id}: missing mobile panel gap`);
        assert.equal(panels[1].position, "relative");
      }
      assert(!value('document.querySelector("main").scrollWidth > document.querySelector("main").clientWidth + 1'));
    }
    console.log(`PASS ${ids.length} tool panels aligned at ${width}px`);
  }
  run("open", `${base}/tools/retry-backoff-planner`);
  run("wait", "--fn", 'document.querySelector(".app-shell")?.dataset.ready === "true"');
  run("eval", 'document.querySelector(".tool-workspace-scroll").scrollTop = 200');
  run("wait", "--fn", 'document.querySelector(".tool-workspace-scroll").scrollTop >= 200');
  const stickyTop = value('document.querySelector(".local-tool > .output-panel").getBoundingClientRect().top');
  assert(stickyTop >= 0 && stickyTop <= 48, `Sticky output must remain near the top of the workspace; top=${stickyTop}`);
  run("eval", 'document.querySelector(".tool-workspace-scroll").scrollTop = 250');
  run("wait", "--fn", 'document.querySelector(".tool-workspace-scroll").scrollTop >= 250');
  const nextTop = value('document.querySelector(".local-tool > .output-panel").getBoundingClientRect().top');
  assert(Math.abs(stickyTop - nextTop) <= 1, "Output must stay pinned as the workspace scrolls");
  assert.equal(run("errors").trim(), "");
  console.log("PASS sticky output remains accessible after scrolling; no browser errors");
} finally { run("close"); }
