import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
const base = process.env.TEST_URL ?? "http://localhost:3105";
const run = (...args) => execFileSync("agent-browser", ["--session", "mobile-navigation-regression", ...args], { encoding: "utf8", timeout: 30000 });
const click = name => run("find", "role", "button", "click", "--name", name, "--exact");
const value = code => JSON.parse(JSON.parse(run("eval", `JSON.stringify(${code})`)));
const wait = code => run("wait", "--fn", code);
const openDrawer = () => { click("Open tools menu"); wait('document.querySelector(".mobile-tools-dialog").open && getComputedStyle(document.querySelector(".mobile-tool-sheet")).opacity === "1"'); };
const closed = () => wait('!document.querySelector(".mobile-tools-dialog").open');
try {
	run("set", "viewport", "390", "844"); run("open", `${base}/tools/json-format-validate`); wait('document.querySelector(".app-shell")?.dataset.ready === "true"');
	const before = value('({ width: document.querySelector("main").clientWidth, top: document.querySelector("main").getBoundingClientRect().top })');
	openDrawer(); assert.equal(value('document.activeElement.tagName'), "H2");
	run("mouse", "move", "4", "50"); run("mouse", "wheel", "500"); assert.equal(value('document.querySelector("main").scrollTop'), 0);
	run("press", "Escape"); closed(); assert.equal(value('document.activeElement.getAttribute("aria-label")'), "Open tools menu");
	assert.deepEqual(value('({ width: document.querySelector("main").clientWidth, top: document.querySelector("main").getBoundingClientRect().top })'), before);
	click("Find a tool"); wait('document.activeElement.getAttribute("aria-label") === "Search tools"'); run("find", "label", "Search tools", "fill", "Text Redactor");
	click("Text Redactor: Mask common secrets and personal data before sharing text."); closed(); wait('location.pathname.endsWith("text-redactor")'); assert.equal(value('document.querySelector("main").scrollTop'), 0);
	click("Redact text"); wait('document.querySelector(".output-panel pre")?.textContent.includes("REDACTED_EMAIL")');
	console.log("PASS stable navigation, modal focus, background scroll isolation, search and tool execution");
	openDrawer(); click("Favorites"); wait('document.querySelector(".mobile-tool-sheet").innerText.includes("No matching tools")'); click("Clear filters"); assert(value('document.querySelectorAll(".mobile-tool-sheet nav[aria-label=Utilities] button").length') > 60);
	const handle = value('(() => {const r = document.querySelector(".mobile-drawer-handle").getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2};})()');
	run("mouse", "move", String(handle.x), String(handle.y)); run("mouse", "down"); run("mouse", "move", String(handle.x), String(handle.y+90)); run("mouse", "up"); closed();
	console.log("PASS favorites empty-state recovery and swipe-down dismissal");
	// Emulate VisualViewport shrinking while editing; headless browsers do not show an OS keyboard.
	click("Find a tool"); wait('document.activeElement.getAttribute("aria-label") === "Search tools"');
	run("eval", 'Object.defineProperty(window.visualViewport, "height", {configurable:true, get:()=>380}); window.visualViewport.dispatchEvent(new Event("resize"));');
	wait('document.querySelector(".mobile-tool-navigation").dataset.keyboard === "true"');
	assert(value('document.querySelector(".mobile-tools-dialog").getBoundingClientRect().bottom') <= 381);
	assert(value('document.querySelector(".mobile-tool-sheet nav").clientHeight') > 80);
	assert(value('document.querySelector(".mobile-dock-expanded").getBoundingClientRect().bottom') <= 380);
	run("eval", 'delete window.visualViewport.height; window.visualViewport.dispatchEvent(new Event("resize"));');
	run("press", "Escape"); closed();
	console.log("PASS simulated keyboard viewport sizing");
	for (const [width, height] of [[320,568],[390,844],[430,932],[844,390],[768,1024]]) {
		run("set", "viewport", String(width), String(height)); openDrawer();
		assert(value('document.querySelector(".mobile-tool-sheet").scrollWidth <= document.querySelector(".mobile-tool-sheet").clientWidth + 2'));
		assert(value('document.querySelector(".mobile-tool-sheet").getBoundingClientRect().bottom < document.querySelector(".mobile-dock-expanded").getBoundingClientRect().top'));
		assert(value('document.querySelector(".mobile-tool-sheet nav").clientHeight') > 0);
		run("mouse", "move", "4", "50"); run("mouse", "down"); run("mouse", "up"); closed();
	}
	run("set", "viewport", "390", "844"); click("Switch to light mode"); openDrawer(); run("screenshot", "/tmp/uutil-mobile-drawer-light.png"); click("Close tools menu"); closed();
	run("set", "media", "reduced-motion"); openDrawer(); run("press", "Escape"); closed();
	console.log("PASS narrow phones, landscape, tablet, light theme and reduced motion");
	run("press", "Control+k"); wait('document.querySelector(".mobile-tools-dialog").open && document.activeElement.getAttribute("aria-label") === "Search tools"');
	run("set", "viewport", "1440", "900"); wait('!document.querySelector("aside").hidden && document.querySelector("aside").getBoundingClientRect().width > 0');
	closed();
	assert.equal(value('getComputedStyle(document.querySelector(".mobile-tool-navigation")).display'), "none");
	click("Open quick tool search"); wait('document.activeElement.getAttribute("aria-label") === "Search all tools"'); run("press", "Escape");
	assert.equal(run("errors").trim(), "");
	console.log("PASS desktop sidebar/search preserved and no browser errors");
} finally { run("close"); }
