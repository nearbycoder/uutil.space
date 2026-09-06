import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const base = process.env.TEST_URL ?? "http://localhost:3103";
const source = readFileSync("src/routes/index.tsx", "utf8");
const tools = [...source.matchAll(/id: "([^"]+)",\s*name: "([^"]+)"/g)].map(match => ({ id: match[1], name: match[2] }));
const run = (...args) => execFileSync("agent-browser", ["--session", "layout-regression", ...args], { encoding: "utf8", timeout: 30000 });
try {
	for (const width of [390, 1440]) {
		run("set", "viewport", String(width), "900");
		for (const [index, tool] of tools.entries()) {
			run("open", `${base}/tools/${tool.id}`);
			run("wait", "--fn", `document.querySelector('main h2')?.textContent === ${JSON.stringify(tool.name)} && document.querySelector('.app-shell')?.dataset.ready === 'true'`);
			const raw = run("eval", `JSON.stringify((() => {
				const main = document.querySelector('main');
				const clipped = [...main.querySelectorAll('[data-tool-action]')].filter(button => {
					const box = button.getBoundingClientRect();
					for (let parent = button.parentElement; parent && parent !== main; parent = parent.parentElement) {
						if (['hidden', 'clip'].includes(getComputedStyle(parent).overflowY) && box.bottom > parent.getBoundingClientRect().bottom + 2) return true;
					}
					return false;
				}).map(button => button.textContent);
				return { overflow: main.scrollWidth > main.clientWidth + 2 || document.body.scrollWidth > innerWidth, clipped };
			})())`);
			const result = JSON.parse(JSON.parse(raw));
			assert(!result.overflow && !result.clipped.length, `${width}px ${tool.id}: ${JSON.stringify(result)}`);
			if ((index + 1) % 12 === 0) console.log(`${width}px: ${index + 1}/${tools.length} pages passed`);
		}
	}
	assert.equal(run("errors").trim(), "");
	console.log(`PASS ${tools.length} tools × 2 viewports; no overflow, clipped actions, or browser errors.`);
} finally { run("close"); }
