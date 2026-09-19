import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const base = process.env.TEST_URL ?? "http://localhost:3107";
const session = `dependency-upgrade-${process.pid}`;
const run = (...args) => execFileSync("agent-browser", ["--session", session, ...args], { encoding: "utf8", timeout: 30000 });
const value = code => JSON.parse(JSON.parse(run("eval", `JSON.stringify(${code})`)));
const wait = code => run("wait", "--fn", code);
const click = name => run("find", "role", "button", "click", "--name", name, "--exact");
const open = (id, width) => {
  run("open", `${base}/tools/${id}`);
  run("set", "viewport", String(width), "900");
  wait('document.querySelector(".app-shell")?.dataset.ready === "true"');
  assert.equal(value("innerWidth"), width);
};

try {
  for (const width of [390, 1440]) {
    for (const [id, input, expected] of [
      ["yaml-to-json", "name: Ada\nactive: true", '{\n  "name": "Ada",\n  "active": true\n}'],
      ["json-to-yaml", '{"name":"Ada","active":true}', "name: Ada\nactive: true\n"],
      ["json-to-csv", '[{"name":"Ada, Lovelace","score":98}]', 'name,score\r\n"Ada, Lovelace",98'],
      ["csv-to-json", 'name,score\n"Ada, Lovelace",98', '[\n  {\n    "name": "Ada, Lovelace",\n    "score": "98"\n  }\n]'],
    ]) {
      open(id, width);
      run("fill", "main textarea", input);
      click("Convert");
      wait('!!document.querySelector(".output-panel pre")');
      assert.equal(value('document.querySelector(".output-panel pre").textContent'), expected);
      console.log(`PASS ${id} ${width}px exact conversion`);
    }

    open("markdown-preview", width);
    run("fill", "main textarea", "# Dependency check\n\n**Bold** and `code`\n\n- One\n- Two");
    wait('document.querySelector("iframe").contentDocument?.querySelector("h1")?.textContent === "Dependency check"');
    assert.equal(value('document.querySelector("iframe").contentDocument.querySelectorAll("li").length'), 2);
    assert.equal(value('document.querySelector("iframe").contentDocument.querySelector("strong").textContent'), "Bold");

    open("cron-job-parser", width);
    click("Parse");
    wait('document.querySelector(".output-panel pre")?.textContent.includes("nextRuns")');
    const cron = value('JSON.parse(document.querySelector(".output-panel pre").textContent)');
    assert.equal(cron.nextRuns.length, 8);
    assert(cron.nextRuns.every((date, index) => Number.isFinite(Date.parse(date)) && (!index || Date.parse(date) > Date.parse(cron.nextRuns[index - 1]))));

    open("text-diff", width);
    wait('document.querySelector("diffs-container")?.shadowRoot?.textContent.includes("line2 changed")');
    run("find", "label", "Updated text", "fill", "line1\nnew dependency version\nline3");
    wait('document.querySelector("diffs-container").shadowRoot.textContent.includes("new dependency version")');
    run("select", 'select[aria-label="Diff layout"]', "unified");
    run("select", 'select[aria-label="Change granularity"]', "char");
    assert(value('document.querySelector("diffs-container").shadowRoot.querySelectorAll("[data-line-type=change-addition]").length') > 0);
    assert(!value('document.querySelector("main").scrollWidth > document.querySelector("main").clientWidth + 2'));
    assert.equal(run("errors").trim(), "");
    console.log(`PASS Markdown iframe, cron schedules, live diff rendering and controls at ${width}px`);
  }
} finally { run("close"); }
