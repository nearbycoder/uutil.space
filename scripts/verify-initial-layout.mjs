import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const base = process.env.TEST_URL ?? "http://localhost:3107";
const sessionPrefix = `initial-layout-${Date.now()}`;
let session = sessionPrefix;
const run = (...args) => execFileSync("agent-browser", ["--session", session, ...args], { encoding: "utf8", timeout: 30000 });
const value = code => JSON.parse(JSON.parse(run("eval", `JSON.stringify(${code})`)));
const wait = code => run("wait", "--fn", code);
const dimensions = 'Array.from(document.querySelectorAll("main, .workspace-content, [data-panel]")).map(p => p.getBoundingClientRect().width)';

try {
	let started = false;
	for (const [width, height] of [[1440,900],[1024,768],[390,844],[320,568]]) {
		for (const saved of [false, true]) {
			if (started) run("close");
			session = `${sessionPrefix}-${width}-${saved}`;
			run("--init-script", resolve("scripts/fixtures/initial-layout-observer.js"), "set", "viewport", String(width), String(height));
			started = true;
			run("cookies", "clear");
			if (saved) run("cookies", "set", "uutil.layout.unix-io", encodeURIComponent(JSON.stringify({"unix-input":63,"unix-output":37})), "--url", base);
			run("set", "viewport", String(width), String(height));
			// Hold application JavaScript back to verify usable, correctly sized SSR content.
			run("network", "route", "**/assets/*.js", "--abort");
			run("open", `${base}/`); wait('document.querySelectorAll("[data-panel]").length === 2 && document.fonts.status === "loaded"');
			const before = value(dimensions);
			assert.equal(value('document.querySelector(".app-shell").dataset.ready'), "false");
			assert(before[2] > width * (width >= 1024 ? .3 : .8), "Panels must not be squished before hydration");
			if (width >= 1024) assert(Math.abs(before[2] / (before[2]+before[3]) - (saved ? .63 : .54)) < .001);
			if (width === 1440 && !saved) run("screenshot", "/tmp/uutil-initial-after.png");
			run("network", "unroute");
			run("open", `${base}/`); wait('document.querySelector(".app-shell")?.dataset.ready === "true" && window.__initialLayout?.done');
			const after = value(dimensions);
			before.forEach((size, index) => assert(Math.abs(size-after[index]) < 1, `${width}px ${saved ? "saved" : "default"} panel ${index}: ${size} -> ${after[index]}`));
			const metrics = value('window.__initialLayout');
			for (let index=0; index<after.length; index++) {
				const samples=metrics.frames.map(frame=>frame.widths[index]);
				assert(Math.max(...samples)-Math.min(...samples) < 1, `Width changed during startup at ${width}px`);
			}
			const cls = metrics.shifts.reduce((sum, score) => sum + score, 0);
			assert(cls < .01, `Startup layout shift: ${cls}`);
			const cookie = value('document.cookie');
			assert.equal(cookie.includes("uutil.layout.unix-io"), saved, "Hydration must not write panel preferences");
			console.log(`PASS ${width}px ${saved ? "saved" : "default"}: SSR matches hydration, stable startup widths, CLS=${cls.toFixed(5)}`);
		}
	}
	// User resizing still persists, while mobile layout never overwrites that preference.
	run("set", "viewport", "1440", "900");
	const cookieBeforeResize = value('document.cookie');
	const widthBeforeResize = value('document.querySelector("[data-panel]").getBoundingClientRect().width');
	run("focus", '.responsive-panels [role="separator"]'); run("press", "ArrowLeft");
	wait(`document.cookie !== ${JSON.stringify(cookieBeforeResize)}`);
	const resized = value('document.querySelector("[data-panel]").getBoundingClientRect().width');
	assert(resized < widthBeforeResize - 1, "Keyboard resizing must actually change the panel width");
	run("reload"); wait('document.querySelector(".app-shell")?.dataset.ready === "true"');
	assert(Math.abs(value('document.querySelector("[data-panel]").getBoundingClientRect().width')-resized) < 1);
	run("find", "role", "button", "click", "--name", "Convert", "--exact");
	wait('document.querySelector(".output-panel pre")?.textContent.includes("unixSeconds")');
	console.log("PASS keyboard resize persistence and converter execution");
} finally { run("close"); }
