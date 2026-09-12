import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";
import { tool } from "./csv-cell-transform";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	parseCsv(execute(tool, { ...defaults(tool), ...v }), "Comma");
describe("CSV cell transforms", () => {
	it("applies ordered steps only to chosen columns", () => {
		expect(run().rows).toEqual([
			["ALEX", "DESIGN"],
			["SAM", "ENGINEERING"],
			["UNKNOWN", "DESIGN"],
		]);
		expect(run({ columns: '["name"]' }).rows[0]).toEqual(["ALEX", "design"]);
	});
	it("supports literal replacement and Unicode normalization", () => {
		expect(
			run({
				input: "name,team\né.a,xx",
				columns: '["name"]',
				steps:
					'[{"operation":"normalize NFC"},{"operation":"replace","find":".","replacement":"$&"}]',
			}).rows[0][0],
		).toBe("é$&a");
	});
	it("protects spreadsheet output after transformation", () => {
		expect(
			run({ steps: '[{"operation":"fill blank","value":"=1"}]' }).rows[2][0],
		).toBe("'=1");
	});
	it("validates steps on header-only tables and bounds expansion", () => {
		expect(() =>
			run({
				input: "name,team",
				steps: '[{"operation":"replace","find":"","replacement":"x"}]',
			}),
		).toThrow();
		expect(() => run({ columns: '["missing"]' })).toThrow();
		expect(() => run({ steps: '[{"operation":"eval"}]' })).toThrow();
		expect(() =>
			run({
				input: `name,team\n${"a".repeat(2000)},x`,
				columns: '["name"]',
				steps: JSON.stringify([
					{ operation: "replace", find: "a", replacement: "b".repeat(100) },
				]),
			}),
		).toThrow(/exceeds/);
	});
});
