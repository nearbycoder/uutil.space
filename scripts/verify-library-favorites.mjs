import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const base = process.env.TEST_URL ?? "http://localhost:3107";
const run = (...args) => execFileSync("agent-browser", ["--session", "library-favorites", ...args], { encoding: "utf8", timeout: 30000 });
const click = name => run("find", "role", "button", "click", "--name", name, "--exact");
const value = code => JSON.parse(JSON.parse(run("eval", `JSON.stringify(${code})`)));
const wait = code => run("wait", "--fn", code);
const ready = () => wait('document.querySelector(".app-shell")?.dataset.ready === "true"');
const open = () => { click("Open tools menu"); wait('getComputedStyle(document.querySelector(".mobile-tool-sheet")).opacity === "1"'); };
const close = () => { click("Close tools menu"); wait('!document.querySelector(".mobile-tools-dialog").open'); };

try {
	for (const width of [1440,320]) {
		run("set", "viewport", String(width), "900"); run("open", `${base}/tools/json-format-validate`); ready();
		run("eval", "localStorage.clear()"); run("reload"); ready();
		if (width === 320) click("Switch to light mode");
		open();
		click("Favorite JWT Debugger"); click("Favorite JSON Format/Validate");
		assert.equal(value('location.pathname'), "/tools/json-format-validate");
		assert(value('document.querySelector(".mobile-tools-dialog").open'));
		assert.equal(value('document.querySelectorAll(".tool-library-favorite[aria-pressed=true]").length'), 2);
		assert(value('Array.from(document.querySelectorAll(".tool-library-favorite")).every(b=>b.clientWidth >= 44 && b.clientHeight >= 44 && !b.parentElement.closest("button"))'));
		assert(value('document.querySelector(".mobile-tool-sheet").scrollWidth <= document.querySelector(".mobile-tool-sheet").clientWidth'));
		run("screenshot", `/tmp/uutil-library-favorites-${width}.png`);
		close(); assert(value(`document.querySelector('button[aria-label="Remove favorite"]')?.getAttribute("aria-pressed") === "true"`));
		run("reload"); ready(); open();
		assert.equal(value('document.querySelectorAll(".tool-library-favorite[aria-pressed=true]").length'), 2);
		click("Favorites"); assert.equal(value('document.querySelectorAll(".sidebar-tool").length'), 2);
		run("focus", 'button[aria-label="Unfavorite JWT Debugger"]'); run("press", "Enter");
		wait('document.querySelectorAll(".sidebar-tool").length === 1');
		wait('document.activeElement.getAttribute("aria-label") === "Unfavorite JSON Format/Validate"');
		assert.equal(value('document.activeElement.getAttribute("aria-label")'), "Unfavorite JSON Format/Validate");
		click("Unfavorite JSON Format/Validate"); wait('document.activeElement.getAttribute("aria-label") === "Search tools"');
		assert.equal(value('document.querySelectorAll(".sidebar-tool").length'), 0);
		click("Clear filters"); run("find", "label", "Search tools", "fill", "JSON Schema");
		click("Favorite JSON Schema Validator"); assert.equal(value(`document.querySelector('input[aria-label="Search tools"]').value`), "JSON Schema");
		assert.equal(value('location.pathname'), "/tools/json-format-validate");
		close(); click("Favorite this tool"); open();
		click("Find a tool");
		assert(value(`document.querySelector('button[aria-label="Unfavorite JSON Format/Validate"]')?.getAttribute("aria-pressed") === "true"`));
		close();
		assert.equal(run("errors").trim(), "");
		console.log(`PASS ${width}px: inline favorites, no navigation, persistence, header synchronization, keyboard removal, empty state, search and 44px targets`);
	}
} finally { run("close"); }
