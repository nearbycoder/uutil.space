import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const base = process.env.TEST_URL ?? "http://localhost:3107";
const session = `style-system-${process.pid}`;
const run = (...args) => execFileSync("agent-browser", ["--session", session, ...args], { encoding: "utf8", timeout: 30000 });
const value = code => JSON.parse(JSON.parse(run("eval", `JSON.stringify(${code})`)));
const wait = code => run("wait", "--fn", code);
const click = name => run("find", "role", "button", "click", "--name", name, "--exact");
const luminance = color => {
  const values = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(channel => {
    const s = channel / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
};

try {
  for (const theme of ["dark", "light"]) {
    for (const width of [320, 390, 1024, 1440]) {
      run("open", `${base}/tools/json-array-chunker`);
      run("set", "viewport", String(width), "900");
      wait('document.querySelector(".app-shell")?.dataset.ready === "true"');
      if (value('document.querySelector(".app-shell").dataset.theme') !== theme) click(`Switch to ${theme} mode`);
      assert.equal(value("innerWidth"), width);
      const styles = value(`(() => {
        const primary = document.querySelector(".local-tool .action-primary");
        const secondary = document.querySelector(".local-tool-actions .ws-button:not(.action-primary)");
        const p = getComputedStyle(primary), s = getComputedStyle(secondary);
        return { primary: p.backgroundColor, secondary: s.backgroundColor, color: p.color, height: primary.getBoundingClientRect().height,
          selectAppearance: getComputedStyle(document.querySelector(".local-tool select")).appearance,
          fontSize: parseFloat(getComputedStyle(document.querySelector(".local-tool textarea")).fontSize),
          empty: document.querySelector(".output-panel pre").dataset.empty,
          emptyBorder: getComputedStyle(document.querySelector(".output-panel pre")).borderTopStyle,
          overflow: document.querySelector("main").scrollWidth > document.querySelector("main").clientWidth + 1 };
      })()`);
      assert.notEqual(styles.primary, styles.secondary, "Primary action must not inherit the secondary background");
      const pair = [luminance(styles.primary), luminance(styles.color)].sort((a, b) => b - a);
      assert((pair[0] + 0.05) / (pair[1] + 0.05) >= 4.5, "Primary action contrast must meet WCAG AA");
      assert(styles.height >= 44);
      assert.equal(styles.selectAppearance, "none");
      assert.equal(styles.fontSize, width < 640 ? 16 : 14);
      assert.equal(styles.empty, "true");
      assert.equal(styles.emptyBorder, "dashed");
      assert(!styles.overflow);
      click("Run tool");
      wait('document.querySelector(".output-panel pre").dataset.empty === "false"');
      // Running a tool focuses and scrolls the result on the next animation frame.
      wait('document.activeElement === document.querySelector(".output-panel pre")');
      assert.equal(value('getComputedStyle(document.querySelector(".output-panel pre")).borderTopStyle'), "solid");
      assert(value('document.querySelector(".output-panel pre").textContent.includes("groups")'));
      click("Copy result");
      wait('document.body.innerText.includes("Result copied")');
      run("screenshot", `/tmp/uutil-style-${theme}-${width}.png`);
      click("Find a tool");
      wait('document.activeElement.getAttribute("aria-label") === "Search tools"');
      wait('getComputedStyle(document.querySelector(".mobile-tool-sheet")).opacity === "1"');
      if (width === 390 || width === 1440) run("screenshot", `/tmp/uutil-style-library-${theme}-${width}.png`);
      run("press", "Escape");
      assert.equal(run("errors").trim(), "");
      console.log(`PASS ${theme} ${width}px: contrast, controls, output states, copy, search, no overflow/errors`);
    }
  }
} catch (error) {
  console.error(value('({ active: document.activeElement.outerHTML, focused: document.hasFocus(), text: document.body.innerText.slice(-1600) })'));
  run("screenshot", "/tmp/uutil-style-failure.png");
  throw error;
} finally { run("close"); }
