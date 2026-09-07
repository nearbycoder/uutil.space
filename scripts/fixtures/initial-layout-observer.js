// Test-only instrumentation installed before the document begins rendering.
window.__initialLayout = { frames: [], shifts: [], done: false };
new PerformanceObserver((list) => {
	for (const entry of list.getEntries()) {
		if (!entry.hadRecentInput) window.__initialLayout.shifts.push(entry.value);
	}
}).observe({ type: "layout-shift", buffered: true });
let paintedAt;
function sample(time) {
	const workspace = document.querySelector(".workspace-content");
	if (workspace?.getBoundingClientRect().width) {
		paintedAt ??= time;
		window.__initialLayout.frames.push({
			widths: [document.querySelector("main"), workspace, ...document.querySelectorAll("[data-panel]")].map((node) => node.getBoundingClientRect().width),
			ready: document.querySelector(".app-shell")?.dataset.ready,
		});
	}
	if (paintedAt !== undefined && time - paintedAt > 1500) window.__initialLayout.done = true;
	else requestAnimationFrame(sample);
}
requestAnimationFrame(sample);
