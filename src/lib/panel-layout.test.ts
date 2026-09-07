import { describe, expect, test } from "vitest";
import {
	DEFAULT_UNIX_PANEL_LAYOUT,
	normalizeUnixPanelLayout,
	parseUnixPanelLayout,
} from "./panel-layout";

describe("server-rendered panel preferences", () => {
	test("restores encoded and decoded cookies identically", () => {
		const layout = { "unix-input": 63, "unix-output": 37 };
		const json = JSON.stringify(layout);
		expect(parseUnixPanelLayout(json)).toEqual(layout);
		expect(parseUnixPanelLayout(encodeURIComponent(json))).toEqual(layout);
	});
	test.each([
		undefined,
		"",
		"%broken",
		"{",
		"null",
		"[]",
		'{"unix-input":-1,"unix-output":101}',
		'{"unix-input":"54","unix-output":46}',
		'{"unix-input":0,"unix-output":0}',
	])("uses a full-width default for invalid cookie %s", (cookie) => {
		expect(parseUnixPanelLayout(cookie)).toEqual(DEFAULT_UNIX_PANEL_LAYOUT);
	});
	test("normalizes and constrains legacy layouts before the first paint", () => {
		expect(
			normalizeUnixPanelLayout({ "unix-input": 6, "unix-output": 4 }),
		).toEqual({ "unix-input": 60, "unix-output": 40 });
		expect(
			normalizeUnixPanelLayout({ "unix-input": 99, "unix-output": 1 }),
		).toEqual({ "unix-input": 72, "unix-output": 28 });
		expect(
			normalizeUnixPanelLayout({ "unix-input": 1, "unix-output": 99 }),
		).toEqual({ "unix-input": 30, "unix-output": 70 });
		expect(
			normalizeUnixPanelLayout({ "unix-input": Infinity, "unix-output": 10 }),
		).toEqual(DEFAULT_UNIX_PANEL_LAYOUT);
	});
});
