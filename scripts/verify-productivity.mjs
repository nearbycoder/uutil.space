import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
const base = process.env.TEST_URL ?? "http://localhost:3109";
const session = `productivity-${process.pid}`;
const run = (...args) => execFileSync("agent-browser", ["--session", session, ...args], { encoding: "utf8", timeout: 30000 });
const value = code => JSON.parse(JSON.parse(run("eval", `JSON.stringify(${code})`)));
const wait = code => run("wait", "--fn", code);
const click = name => run("find", "role", "button", "click", "--name", name, "--exact");
try {
 run("open", `${base}/tools/shopping-list`);
 run("set", "viewport", "1440", "900");
 wait('document.querySelector(".app-shell")?.dataset.ready === "true"');
 click("Find a tool");
 wait('!!document.querySelector("dialog[open]")');
 run("snapshot", "-i");
 run("select", 'select[aria-label="Tool category"]', "Productivity");
 assert.equal(value('document.querySelectorAll(".tool-library-item").length'), 20);
 click("Close tools drawer");
 wait('!document.querySelector(".mobile-tools-dialog[open]")');
 run("find", "label", "Shopping items", "fill", "Apples | 2 | each\napples | 3 | each\nApples | 1 | kg");
 click("Run tool");
 wait('document.querySelector(".local-tool pre")?.textContent.includes("Apples: 5 each")');
 assert(value('document.querySelector(".local-tool pre").textContent.includes("Apples: 1 kg")'));
 click("Examples & help");
 wait('!!document.querySelector(".workspace-dialog[open]")');
 assert(value('document.querySelector(".workspace-dialog").textContent.includes("case-insensitive")'));
 click("Close workspace");
 run("open", `${base}/tools/savings-goal`);
 wait('document.querySelector(".app-shell")?.dataset.ready === "true"');
 run("find", "label", "Contribution per period", "fill", "120");
 run("press", "Enter");
 wait('document.querySelector(".local-tool pre")?.textContent.includes("Goal covered by the deadline")');
 assert(value('document.querySelector(".local-tool pre").textContent.includes("Projected balance: 1500.00")'));
 // Editing a setting invalidates the old result; preset support is exercised by
 // the shared workspace regression suite, while this confirms field registration.
 run("find", "label", "Periods until deadline", "fill", "5");
 assert.equal(value('document.querySelector(".local-tool pre").dataset.empty'), "true");
 click("Run tool");
 wait('document.querySelector(".local-tool pre")?.textContent.includes("Shortfall: 600.00")');
 click("My workspace");
 wait('!!document.querySelector(".workspace-dialog[open]")');
 run("snapshot", "-i");
 click("Share recipe");
 click("Create recipe link");
 wait(`!!document.querySelector('textarea[aria-label="Recipe link"]')`);
 const recipe = value(`document.querySelector('textarea[aria-label="Recipe link"]').value`);
 assert(recipe.includes("#recipe="));
 run("open", recipe);
 run("reload");
 wait('document.querySelector("input[name=periods]")?.value === "5"');
 assert.equal(value('document.querySelector("input[name=deposit]").value'), "120");
 assert.equal(value('document.querySelector(".local-tool pre").dataset.empty'), "true");
 for (const width of [320, 390, 1024, 1440]) {
  run("set", "viewport", String(width), "900");
  assert(!value('document.querySelector("main").scrollWidth > document.querySelector("main").clientWidth + 1'));
  assert(value('document.querySelector(".action-primary").getBoundingClientRect().height >= 44'));
 }
 run("open", `${base}/tools/travel-budget`);
 wait('document.querySelector(".app-shell")?.dataset.ready === "true"');
 click("Run tool");
 wait('document.querySelector(".local-tool pre")?.textContent.includes("693.00")');
 run("screenshot", "/tmp/uutil-productivity-final-desktop.png");
 run("set", "viewport", "390", "900");
 if (value('document.querySelector(".app-shell").dataset.theme') !== "light") click("Switch to light mode");
 run("eval", 'document.querySelector("main").scrollTop = 0');
 run("screenshot", "/tmp/uutil-productivity-final-mobile.png");
 assert.equal(run("errors").trim(), "");
 console.log("PASS productivity category, custom grocery quantities, help, keyboard submission, setting changes, sharing, responsive controls, no browser errors");
} finally { run("close"); }
