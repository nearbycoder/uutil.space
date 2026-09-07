import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
const [id, expected] = process.argv.slice(2);
if (!id || !expected) throw new Error("Pass a tool ID and expected output substring.");
const run = (...args) => execFileSync("agent-browser", ["--session", "local-tool-release", ...args], { encoding: "utf8", timeout: 30000 });
const value = code => JSON.parse(JSON.parse(run("eval", `JSON.stringify(${code})`)));
try {
  for (const width of [390, 1440]) {
    run("set", "viewport", String(width), "900");
    run("open", `${process.env.TEST_URL ?? "http://localhost:3107"}/tools/${id}`);
    run("wait", "--fn", 'document.querySelector(".app-shell")?.dataset.ready === "true" && !!document.querySelector(".local-tool")');
    run("find", "role", "button", "click", "--name", "Run tool", "--exact");
    run("wait", "--fn", `document.querySelector('.local-tool pre')?.textContent.includes(${JSON.stringify(expected)})`);
    assert(!value('document.querySelector("main").scrollWidth > document.querySelector("main").clientWidth + 2'));
    assert(!value('document.querySelector(".local-tool [role=alert]") !== null'));
    run("find", "role", "button", "click", "--name", "Reset example", "--exact");
    assert(value('document.querySelector(".local-tool pre").textContent.includes("Your result")'));
    console.log(`PASS ${id}: ${width}px default workflow, reset and no overflow`);
  }
  assert.equal(run("errors").trim(), "");
} finally { run("close"); }
