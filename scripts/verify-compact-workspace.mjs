import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const base = process.env.TEST_URL ?? "http://localhost:3107";
const run = (...args) => execFileSync("agent-browser", ["--session", `compact-workspace-${process.pid}`, ...args], { encoding: "utf8", timeout: 30000 });
const value = code => JSON.parse(JSON.parse(run("eval", `JSON.stringify(${code})`)));
const wait = code => run("wait", "--fn", code);
const click = name => run("find", "role", "button", "click", "--name", name, "--exact");

try {
  for (const [width, height] of [[1920,1080],[1440,900],[1024,768],[390,844],[320,568]]) {
    run("set", "viewport", String(width), String(height));
    run("open", base);
    wait('document.querySelector(".app-shell")?.dataset.ready === "true"');
    const metrics = value(`(() => {
      const main = document.querySelector('main');
      const workspace = document.querySelector('.workspace-content').getBoundingClientRect();
      const title = document.querySelector('main h1').getBoundingClientRect();
      const panels = document.querySelector('.responsive-panels').getBoundingClientRect();
      return {width:workspace.width, top:workspace.top, titleBottom:title.bottom, panelTop:panels.top, panelHeight:panels.height, mainHeight:main.clientHeight, overflow:main.scrollWidth > main.clientWidth + 1, chrome:!!document.querySelector('.app-topbar, .workspace-footer')};
    })()`);
    assert(!metrics.chrome && !metrics.overflow);
    assert.equal(metrics.mainHeight, height);
    assert(metrics.width >= width - 50, "Workspace should use the available screen width");
    assert(metrics.top <= 20 && metrics.titleBottom <= 56, "Tool title should start near the top");
    if (width >= 1440) {
      assert(metrics.panelTop <= 80, "Desktop tools should begin immediately below the compact header");
      assert(metrics.panelHeight >= height - 180, "Resizable editors should use the available height");
    }
    click("Convert");
    wait('document.querySelector(".output-panel").textContent.includes("2023-11-14")');
    run("screenshot", `/tmp/uutil-compact-${width}.png`);
    console.log(`PASS ${width}px: full-width workspace, compact header, usable conversion`);
  }
  click("Switch to light mode");
  click("Open tools menu");
  wait('document.querySelector(".mobile-tools-dialog").open');
  click("Switch to dark mode");
  assert.equal(value('document.querySelector(".app-shell").dataset.theme'), "dark");
  assert(value('document.querySelector(".mobile-tools-dialog").open'), "Theme changes should keep the library open");
  run("press", "Escape");
  wait('!document.querySelector(".mobile-tools-dialog").open');
  run("reload");
  wait('document.querySelector(".app-shell")?.dataset.ready === "true"');
  assert.equal(value('document.querySelector(".app-shell").dataset.theme'), "dark");
  assert.equal(run("errors").trim(), "");
  console.log("PASS theme controls in both docks, persistence, and no browser errors");
} finally { run("close"); }
