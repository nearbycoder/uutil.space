import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
const base = process.env.TEST_URL ?? "http://localhost:3103";
const run = (...args) => execFileSync("agent-browser", ["--session", "offline-regression", ...args], { encoding: "utf8", timeout: 30000 });
const click = name => run("find", "role", "button", "click", "--name", name, "--exact");
const wait = code => run("wait", "--fn", code);
const open = path => { run("open", `${base}${path}`); wait('document.querySelector(".app-shell")?.dataset.ready === "true"'); };
try {
	const response = await fetch(`${base}/sw.js`); assert(response.ok, "Production server must serve the worker"); assert(response.headers.get("content-type")?.includes("javascript"));
	open("/tools/json-format-validate"); click("My workspace"); click("Offline & install"); click("Enable offline mode"); wait('document.querySelector("dialog")?.innerText.includes("All tools are prepared")'); click("Close workspace");
	run("set", "offline", "on");
	open("/tools/json-format-validate"); click("Format"); wait('document.querySelector(".output-panel pre")?.textContent.length > 0');
	click("Base64 String Encode/Decode: Encode plain text to base64 and decode base64 back to text."); wait('location.pathname.endsWith("base64-string")'); click("Encode"); wait('document.querySelector(".output-panel pre")?.textContent.length > 0');
	open("/tools/json-schema-validator"); click("Validate schema"); wait('document.body.innerText.includes("validation errors")');
	open("/tools/cron-builder"); wait('document.querySelector(".output-panel pre")?.textContent.includes("Next 5 runs")');
	assert.equal(run("errors").trim(), "");
	console.log("PASS offline refresh, route navigation, text processing, validation worker and cron hydration.");
	run("set", "offline", "off"); click("My workspace"); click("Offline & install"); click("Remove offline files"); wait('document.querySelector("dialog")?.innerText.includes("Offline files removed")');
	console.log("PASS removal of offline files.");
} finally { run("set", "offline", "off"); run("close"); }
