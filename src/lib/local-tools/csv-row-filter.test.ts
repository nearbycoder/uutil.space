import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";
import { tool } from "./csv-row-filter";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	parseCsv(execute(tool, { ...defaults(tool), ...v }), "Comma").rows;
describe("CSV row filter", () => {
	it("rejects rounded large integers in numeric comparisons", () => {
		expect(() =>
			run({
				input: "name,score\nX,9007199254740993",
				rules: '[{"column":"score","operator":">","value":"9007199254740992"}]',
			}),
		).toThrow(/safe integer/);
		expect(
			run({
				input: "name,score\nX,9007199254740993",
				rules:
					'[{"column":"score","operator":"equals","value":"9007199254740993"}]',
			}),
		).toHaveLength(1);
	});
	it("combines conditions and preserves duplicates and originals", () => {
		expect(run()).toHaveLength(2);
		expect(run({ combine: "Any" })).toHaveLength(3);
		expect(run({ keep: "Non-matching" })).toHaveLength(2);
	});
	it("supports text and empty operations", () => {
		expect(run({ rules: '[{"column":"score","operator":"empty"}]' })).toEqual([
			["Riley", "Design", ""],
		]);
		expect(
			run({
				rules: '[{"column":"team","operator":"starts with","value":"des"}]',
				case: "Ignore case",
			}),
		).toHaveLength(3);
		expect(
			run({
				input: "name,score\n X ,1",
				rules: '[{"column":"name","operator":"equals","value":"X"}]',
			}),
		).toEqual([[" X ", "1"]]);
	});
	it("does not hide invalid numeric cells behind an Any match", () => {
		expect(() =>
			run({
				input: "name,score\nX,bad",
				combine: "Any",
				rules:
					'[{"column":"name","operator":"equals","value":"X"},{"column":"score","operator":">","value":"1"}]',
			}),
		).toThrow(/Numeric/);
	});
	it("validates rules even for empty tables", () => {
		expect(() =>
			run({
				input: "name,score",
				rules: '[{"column":"score","operator":">","value":"NaN"}]',
			}),
		).toThrow();
		expect(() => run({ rules: "[]" })).toThrow();
		expect(() =>
			run({ rules: '[{"column":"missing","operator":"empty"}]' }),
		).toThrow();
		expect(
			run({ rules: '[{"column":"score","operator":">=","value":"1e3"}]' }),
		).toEqual([]);
	});
});
